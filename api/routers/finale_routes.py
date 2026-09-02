from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends

from api.database import get_supabase_admin, mock_db
from api.auth import get_current_admin

router = APIRouter(prefix="/api/finale", tags=["finale"])

class DisplayQuestionRequest(BaseModel):
    question_index: int
    title: str
    prompt: str
    points: int = 100
    time_limit: int = 60

class FinaleTimerStartRequest(BaseModel):
    seconds: int = 60

class UpdateFinaleScoreRequest(BaseModel):
    team_id: str
    delta: int
    reason: str


@router.get("/state")
async def get_finale_state():
    """
    Returns the live Round 2 finale state (polled by Projector View).
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase = get_supabase_admin()
    if supabase:
        res = supabase.table("finale_state").select("*").eq("id", 1).execute()
        state = res.data[0] if res.data else {}

        # Fetch finalist team details
        finalist_ids = state.get("finalist_team_ids", [])
        teams_data = []
        if finalist_ids:
            t_res = supabase.table("teams").select(
                "id, team_id, team_name, room, current_score"
            ).in_("id", finalist_ids).execute()
            teams_data = t_res.data or []

        return {
            "is_active": state.get("is_active", False),
            "finalist_teams": teams_data,
            "current_question_index": state.get("current_question_index", 0),
            "current_question": state.get("current_question"),
            "timer_seconds": state.get("timer_seconds", 60),
            "timer_end_time": state.get("timer_end_time"),
            "is_timer_running": state.get("is_timer_running", False),
            "scores": state.get("scores", {}),
            "server_time": now_iso
        }
    else:
        state = mock_db.finale_state
        finalist_ids = state.get("finalist_team_ids", [])
        teams_data = [
            {
                "id": t["id"],
                "team_id": t["team_id"],
                "team_name": t["team_name"],
                "room": t["room"],
                "current_score": t["current_score"]
            }
            for t in mock_db.teams.values()
            if t["id"] in finalist_ids
        ]
        return {
            "is_active": state.get("is_active", False),
            "finalist_teams": teams_data,
            "current_question_index": state.get("current_question_index", 0),
            "current_question": state.get("current_question"),
            "timer_seconds": state.get("timer_seconds", 60),
            "timer_end_time": state.get("timer_end_time"),
            "is_timer_running": state.get("is_timer_running", False),
            "scores": state.get("scores", {}),
            "server_time": now_iso
        }


@router.post("/display-question")
async def display_question(req: DisplayQuestionRequest, admin: dict = Depends(get_current_admin)):
    """Pushes a live question to the Projector View."""
    question_payload = {
        "index": req.question_index,
        "title": req.title,
        "prompt": req.prompt,
        "points": req.points,
        "time_limit": req.time_limit
    }

    supabase = get_supabase_admin()
    if supabase:
        supabase.table("finale_state").update({
            "is_active": True,
            "current_question_index": req.question_index,
            "current_question": question_payload,
            "timer_seconds": req.time_limit,
            "is_timer_running": False,
            "timer_end_time": None
        }).eq("id", 1).execute()
    else:
        mock_db.finale_state.update({
            "is_active": True,
            "current_question_index": req.question_index,
            "current_question": question_payload,
            "timer_seconds": req.time_limit,
            "is_timer_running": False,
            "timer_end_time": None
        })

    return {"success": True, "question": question_payload}


@router.post("/timer/start")
async def start_finale_timer(req: FinaleTimerStartRequest, admin: dict = Depends(get_current_admin)):
    """Launches rapid buzzer countdown on Projector View."""
    now = datetime.now(timezone.utc)
    end = now + timedelta(seconds=req.seconds)

    supabase = get_supabase_admin()
    if supabase:
        supabase.table("finale_state").update({
            "timer_seconds": req.seconds,
            "timer_end_time": end.isoformat(),
            "is_timer_running": True
        }).eq("id", 1).execute()
    else:
        mock_db.finale_state.update({
            "timer_seconds": req.seconds,
            "timer_end_time": end.isoformat(),
            "is_timer_running": True
        })

    return {"success": True, "timer_end_time": end.isoformat(), "seconds": req.seconds}


@router.post("/timer/stop")
async def stop_finale_timer(admin: dict = Depends(get_current_admin)):
    """Stops the finale buzzer timer."""
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("finale_state").update({
            "is_timer_running": False,
            "timer_end_time": None
        }).eq("id", 1).execute()
    else:
        mock_db.finale_state["is_timer_running"] = False
        mock_db.finale_state["timer_end_time"] = None

    return {"success": True, "message": "Finale timer stopped"}


@router.post("/score/update")
async def update_finale_score(req: UpdateFinaleScoreRequest, admin: dict = Depends(get_current_admin)):
    """Updates team score in finale with audit log."""
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("score_log").insert({
            "team_id": req.team_id,
            "delta": req.delta,
            "reason": f"[Finale Round 2] {req.reason}",
            "source": "admin",
            "admin_id": admin["id"]
        }).execute()

        t_res = supabase.table("teams").select("current_score").eq("id", req.team_id).execute()
        current = t_res.data[0]["current_score"] if t_res.data else 0
        new_score = current + req.delta
        supabase.table("teams").update({"current_score": new_score}).eq("id", req.team_id).execute()

        return {"success": True, "team_id": req.team_id, "new_score": new_score}
    else:
        t = mock_db.teams.get(req.team_id)
        if not t:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        t["current_score"] += req.delta
        return {"success": True, "team_id": req.team_id, "new_score": t["current_score"]}
