from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends, Query

from api.database import get_supabase_admin, mock_db
from api.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

class ScoreAdjustRequest(BaseModel):
    team_id: str
    delta: int
    reason: str

class ResetAttemptRequest(BaseModel):
    team_id: str
    challenge_id: str
    reason: str

class SelectFinalistsRequest(BaseModel):
    team_ids: List[str]

class TimerStartRequest(BaseModel):
    duration_minutes: int = 90

class FinalSubmissionScoreRequest(BaseModel):
    team_id: str
    score: int
    feedback: Optional[str] = None


@router.get("/teams")
async def get_admin_teams_live(
    room: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin)
):
    """
    Live admin teams table.
    Enforces server-side room scoping if requester is a room_coordinator.
    """
    # Enforce room coordinator isolation
    effective_room = room
    if admin.get("role") == "room_coordinator":
        effective_room = admin.get("assigned_room")

    supabase = get_supabase_admin()
    if supabase:
        # Fetch teams
        t_query = supabase.table("teams").select("*")
        if effective_room:
            t_query = t_query.eq("room", effective_room)
        t_res = t_query.order("current_score", desc=True).execute()
        teams = t_res.data or []

        # Fetch progress across all teams
        p_res = supabase.table("team_challenge_progress").select(
            "team_id, challenge_id, is_solved, solved_at, attempt_count"
        ).execute()
        progress_rows = p_res.data or []

        # Fetch unlocked files
        uf_res = supabase.table("team_unlocked_files").select("team_id, evidence_file_id").execute()
        unlocked_rows = uf_res.data or []

        # Fetch final submissions
        sub_res = supabase.table("final_submissions").select(
            "team_id, locked, submitted_at, admin_score"
        ).execute()
        sub_rows = sub_res.data or []

        # Build maps
        prog_map: Dict[str, List[Any]] = {}
        for p in progress_rows:
            prog_map.setdefault(p["team_id"], []).append(p)

        unlocked_map: Dict[str, int] = {}
        for u in unlocked_rows:
            unlocked_map[u["team_id"]] = unlocked_map.get(u["team_id"], 0) + 1

        sub_map = {s["team_id"]: s for s in sub_rows}

        results = []
        for t in teams:
            t_id = t["id"]
            team_progs = prog_map.get(t_id, [])
            solved_count = sum(1 for p in team_progs if p.get("is_solved"))
            total_attempts = sum(p.get("attempt_count", 0) for p in team_progs)
            final_sub = sub_map.get(t_id)

            results.append({
                "id": t_id,
                "team_id": t["team_id"],
                "team_name": t["team_name"],
                "room": t["room"],
                "members": t.get("members", []),
                "status": t["status"],
                "current_score": t["current_score"],
                "echo_prompts_used": t.get("echo_prompts_used", 0),
                "is_logged_in": t.get("is_logged_in", False),
                "challenges_solved": solved_count,
                "total_attempts": total_attempts,
                "files_unlocked": unlocked_map.get(t_id, 0),
                "final_submission_locked": final_sub.get("locked", False) if final_sub else False,
                "final_submitted_at": final_sub.get("submitted_at") if final_sub else None,
                "admin_score": final_sub.get("admin_score") if final_sub else None
            })

        return results

    else:
        # Mock DB logic
        teams = list(mock_db.teams.values())
        if effective_room:
            teams = [t for t in teams if t["room"] == effective_room]

        results = []
        for t in teams:
            t_id = t["id"]
            team_progs = [p for p in mock_db.team_progress.values() if p.get("team_id") == t_id]
            solved_count = sum(1 for p in team_progs if p.get("is_solved"))
            total_attempts = sum(p.get("attempt_count", 0) for p in team_progs)
            unlocked_count = sum(1 for u in mock_db.team_unlocked_files if u["team_id"] == t_id)
            final_sub = mock_db.final_submissions.get(t_id)

            results.append({
                "id": t_id,
                "team_id": t["team_id"],
                "team_name": t["team_name"],
                "room": t["room"],
                "members": t.get("members", []),
                "status": t["status"],
                "current_score": t["current_score"],
                "echo_prompts_used": t.get("echo_prompts_used", 0),
                "is_logged_in": t.get("is_logged_in", False),
                "challenges_solved": solved_count,
                "total_attempts": total_attempts,
                "files_unlocked": unlocked_count,
                "final_submission_locked": final_sub.get("locked", False) if final_sub else False,
                "final_submitted_at": final_sub.get("submitted_at") if final_sub else None,
                "admin_score": final_sub.get("admin_score") if final_sub else None
            })
        return sorted(results, key=lambda x: x["current_score"], reverse=True)


@router.post("/timer/start")
async def start_timer(req: TimerStartRequest, admin: dict = Depends(get_current_admin)):
    """Starts or resets event countdown timer."""
    now = datetime.now(timezone.utc)
    end = now + timedelta(minutes=req.duration_minutes)

    supabase = get_supabase_admin()
    if supabase:
        supabase.table("event_state").upsert({
            "id": 1,
            "round": 1,
            "event_start_time": now.isoformat(),
            "event_end_time": end.isoformat(),
            "is_paused": False,
            "paused_at": None,
            "paused_duration_accumulated": 0,
            "duration_minutes": req.duration_minutes
        }).execute()
    else:
        mock_db.event_state.update({
            "round": 1,
            "event_start_time": now.isoformat(),
            "event_end_time": end.isoformat(),
            "is_paused": False,
            "paused_at": None,
            "paused_duration_accumulated": 0,
            "duration_minutes": req.duration_minutes
        })

    return {"message": f"Timer started for {req.duration_minutes} minutes", "start_time": now.isoformat(), "end_time": end.isoformat()}


@router.post("/timer/pause")
async def pause_timer(admin: dict = Depends(get_current_admin)):
    """Pauses event countdown."""
    now = datetime.now(timezone.utc)
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("event_state").update({
            "is_paused": True,
            "paused_at": now.isoformat()
        }).eq("id", 1).execute()
    else:
        mock_db.event_state["is_paused"] = True
        mock_db.event_state["paused_at"] = now.isoformat()

    return {"message": "Timer paused"}


@router.post("/timer/resume")
async def resume_timer(admin: dict = Depends(get_current_admin)):
    """Resumes event countdown, accumulating paused delta."""
    now = datetime.now(timezone.utc)
    supabase = get_supabase_admin()
    if supabase:
        res = supabase.table("event_state").select("*").eq("id", 1).execute()
        if res.data:
            state = res.data[0]
            paused_at_str = state.get("paused_at")
            acc = state.get("paused_duration_accumulated", 0)
            if paused_at_str:
                paused_dt = datetime.fromisoformat(paused_at_str.replace("Z", "+00:00"))
                delta_sec = int((now - paused_dt).total_seconds())
                acc += max(0, delta_sec)

            supabase.table("event_state").update({
                "is_paused": False,
                "paused_at": None,
                "paused_duration_accumulated": acc
            }).eq("id", 1).execute()
    else:
        state = mock_db.event_state
        paused_at_str = state.get("paused_at")
        acc = state.get("paused_duration_accumulated", 0)
        if paused_at_str:
            paused_dt = datetime.fromisoformat(paused_at_str.replace("Z", "+00:00"))
            delta_sec = int((now - paused_dt).total_seconds())
            acc += max(0, delta_sec)

        mock_db.event_state["is_paused"] = False
        mock_db.event_state["paused_at"] = None
        mock_db.event_state["paused_duration_accumulated"] = acc

    return {"message": "Timer resumed"}


@router.post("/challenges/{challenge_id}/lock")
async def lock_challenge(challenge_id: str, admin: dict = Depends(get_current_admin)):
    """Locks a challenge from participant submissions."""
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("challenges").update({"is_locked_by_admin": True}).eq("id", challenge_id).execute()
    else:
        for ch in mock_db.challenges:
            if ch["id"] == challenge_id or ch["slug"] == challenge_id:
                ch["is_locked_by_admin"] = True
    return {"message": "Challenge locked"}


@router.post("/challenges/{challenge_id}/unlock")
async def unlock_challenge(challenge_id: str, admin: dict = Depends(get_current_admin)):
    """Unlocks a challenge for participant submissions."""
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("challenges").update({"is_locked_by_admin": False}).eq("id", challenge_id).execute()
    else:
        for ch in mock_db.challenges:
            if ch["id"] == challenge_id or ch["slug"] == challenge_id:
                ch["is_locked_by_admin"] = False
    return {"message": "Challenge unlocked"}


@router.post("/score/adjust")
async def adjust_score(req: ScoreAdjustRequest, admin: dict = Depends(get_current_admin)):
    """Manually awards or deducts points from a team with logged audit justification."""
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("score_log").insert({
            "team_id": req.team_id,
            "delta": req.delta,
            "reason": f"[Admin {admin['username']}] {req.reason}",
            "source": "admin",
            "admin_id": admin["id"]
        }).execute()

        # Update cached score on team
        t_res = supabase.table("teams").select("current_score").eq("id", req.team_id).execute()
        current = t_res.data[0]["current_score"] if t_res.data else 0
        new_score = current + req.delta
        supabase.table("teams").update({"current_score": new_score}).eq("id", req.team_id).execute()
        return {"success": True, "new_score": new_score}
    else:
        t = mock_db.teams.get(req.team_id)
        if not t:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        t["current_score"] += req.delta
        mock_db.score_logs.append({
            "team_id": req.team_id,
            "delta": req.delta,
            "reason": f"[Admin {admin['username']}] {req.reason}",
            "source": "admin",
            "admin_id": admin["id"]
        })
        return {"success": True, "new_score": t["current_score"]}


@router.post("/attempts/reset")
async def reset_team_challenge_attempt(req: ResetAttemptRequest, admin: dict = Depends(get_current_admin)):
    """Resets a team's challenge solve state (for disputes/testing)."""
    supabase = get_supabase_admin()
    if supabase:
        # Reset progress record
        supabase.table("team_challenge_progress").update({
            "is_solved": False,
            "solved_at": None,
            "points_awarded": 0
        }).eq("team_id", req.team_id).eq("challenge_id", req.challenge_id).execute()

        # Log reset action
        supabase.table("score_log").insert({
            "team_id": req.team_id,
            "delta": 0,
            "reason": f"[RESET by {admin['username']}] {req.reason}",
            "source": "admin",
            "admin_id": admin["id"]
        }).execute()
        return {"success": True, "message": "Team challenge attempt state reset successfully"}
    else:
        key = f"{req.team_id}:{req.challenge_id}"
        prog = mock_db.team_progress.get(key)
        if prog:
            prog["is_solved"] = False
            prog["solved_at"] = None
            prog["points_awarded"] = 0
        return {"success": True, "message": "Team challenge attempt state reset successfully"}


@router.post("/finalists/select")
async def select_finalists(req: SelectFinalistsRequest, admin: dict = Depends(get_current_admin)):
    """
    Selects top finalist teams and transitions event to Round 2 (Finale).
    """
    supabase = get_supabase_admin()
    if supabase:
        # Set team statuses
        supabase.table("teams").update({"status": "active"}).execute()
        for t_id in req.team_ids:
            supabase.table("teams").update({"status": "finalist"}).eq("id", t_id).execute()

        # Update event state to round 2
        supabase.table("event_state").update({"round": 2}).eq("id", 1).execute()

        # Update finale state
        supabase.table("finale_state").update({
            "is_active": True,
            "finalist_team_ids": req.team_ids
        }).eq("id", 1).execute()

        return {"success": True, "round": 2, "finalists": req.team_ids}
    else:
        for t in mock_db.teams.values():
            t["status"] = "finalist" if t["id"] in req.team_ids else "active"
        mock_db.event_state["round"] = 2
        mock_db.finale_state["is_active"] = True
        mock_db.finale_state["finalist_team_ids"] = req.team_ids
        return {"success": True, "round": 2, "finalists": req.team_ids}


@router.post("/submissions/score")
async def score_final_submission(req: FinalSubmissionScoreRequest, admin: dict = Depends(get_current_admin)):
    """Scores a team's final case submission and awards score_log points."""
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("final_submissions").update({
            "admin_score": req.score,
            "admin_feedback": req.feedback
        }).eq("team_id", req.team_id).eq("round", 1).execute()

        supabase.table("score_log").insert({
            "team_id": req.team_id,
            "delta": req.score,
            "reason": f"Final Case Dossier Evaluation: {req.score} pts",
            "source": "admin",
            "admin_id": admin["id"]
        }).execute()
        return {"success": True, "score": req.score}
    else:
        sub = mock_db.final_submissions.get(req.team_id)
        if sub:
            sub["admin_score"] = req.score
            sub["admin_feedback"] = req.feedback
            t = mock_db.teams.get(req.team_id)
            if t:
                t["current_score"] += req.score
        return {"success": True, "score": req.score}


@router.get("/leaderboard")
async def get_leaderboard():
    """
    Returns public/admin ranked leaderboard by current_score DESC,
    tie-broken by earliest solve times.
    """
    supabase = get_supabase_admin()
    if supabase:
        t_res = supabase.table("teams").select(
            "id, team_id, team_name, room, status, current_score"
        ).order("current_score", desc=True).execute()
        teams = t_res.data or []

        p_res = supabase.table("team_challenge_progress").select(
            "team_id, is_solved, solved_at"
        ).execute()

        prog_map: Dict[str, List[Any]] = {}
        for p in (p_res.data or []):
            prog_map.setdefault(p["team_id"], []).append(p)

        results = []
        for rank, t in enumerate(teams, 1):
            t_id = t["id"]
            team_progs = prog_map.get(t_id, [])
            solved_count = sum(1 for p in team_progs if p.get("is_solved"))
            solve_times = [p["solved_at"] for p in team_progs if p.get("solved_at")]
            latest_solve = max(solve_times) if solve_times else None

            results.append({
                "rank": rank,
                "id": t_id,
                "team_id": t["team_id"],
                "team_name": t["team_name"],
                "room": t["room"],
                "status": t["status"],
                "current_score": t["current_score"],
                "challenges_solved": solved_count,
                "latest_solve_time": latest_solve
            })
        return results

    else:
        teams = sorted(mock_db.teams.values(), key=lambda x: x["current_score"], reverse=True)
        results = []
        for rank, t in enumerate(teams, 1):
            t_id = t["id"]
            team_progs = [p for p in mock_db.team_progress.values() if p.get("team_id") == t_id]
            solved_count = sum(1 for p in team_progs if p.get("is_solved"))
            results.append({
                "rank": rank,
                "id": t_id,
                "team_id": t["team_id"],
                "team_name": t["team_name"],
                "room": t["room"],
                "status": t["status"],
                "current_score": t["current_score"],
                "challenges_solved": solved_count,
                "latest_solve_time": None
            })
        return results
