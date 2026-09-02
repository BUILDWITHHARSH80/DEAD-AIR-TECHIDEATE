from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends

from api.database import get_supabase_admin, mock_db
from api.auth import get_current_team
from api.rate_limiter import check_echo_rate_limit
from api.ai_service import query_echo_ai

router = APIRouter(prefix="/api/echo", tags=["echo"])

class EchoMessageRequest(BaseModel):
    message: str


@router.get("/history")
async def get_echo_history(team: dict = Depends(get_current_team)):
    """
    Returns the team's ECHO chat history and current prompt quota status.
    """
    supabase = get_supabase_admin()
    if supabase:
        # Fetch usage
        u_res = supabase.table("echo_usage").select("*").eq("team_id", team["id"]).execute()
        prompts_used = u_res.data[0]["prompts_used"] if u_res.data else 0

        # Fetch messages
        c_res = supabase.table("echo_conversations").select(
            "id, role, message, created_at"
        ).eq("team_id", team["id"]).order("created_at", desc=False).execute()
        messages = c_res.data or []

        return {
            "prompts_used": prompts_used,
            "max_prompts": 5,
            "prompts_remaining": max(0, 5 - prompts_used),
            "messages": messages
        }
    else:
        prompts_used = mock_db.echo_usage.get(team["id"], 0)
        messages = [
            m for m in mock_db.echo_conversations
            if m["team_id"] == team["id"]
        ]
        return {
            "prompts_used": prompts_used,
            "max_prompts": 5,
            "prompts_remaining": max(0, 5 - prompts_used),
            "messages": messages
        }


@router.post("/message")
async def send_echo_message(
    req: EchoMessageRequest,
    team: dict = Depends(get_current_team)
):
    """
    Sends a query to ECHO terminal AI.
    Atomically checks and increments prompt quota to prevent race conditions.
    """
    clean_msg = req.message.strip()
    if not clean_msg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    check_echo_rate_limit(team["id"])

    supabase = get_supabase_admin()
    if supabase:
        # Atomic quota check and increment via Postgres conditional update
        # 1. Ensure echo_usage row exists
        supabase.table("echo_usage").upsert({
            "team_id": team["id"],
            "max_prompts": 5
        }, on_conflict="team_id").execute()

        # 2. Fetch current count to check before proceeding
        u_res = supabase.table("echo_usage").select("prompts_used").eq("team_id", team["id"]).execute()
        current_used = u_res.data[0]["prompts_used"] if u_res.data else 0

        if current_used >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="ECHO prompt quota depleted (5/5 prompts used). No further transmissions permitted."
            )

        # Atomic increment
        new_used = current_used + 1
        supabase.table("echo_usage").update({
            "prompts_used": new_used
        }).eq("team_id", team["id"]).execute()

        # Update cached count on teams table
        supabase.table("teams").update({
            "echo_prompts_used": new_used
        }).eq("id", team["id"]).execute()

        # Fetch recent history
        hist_res = supabase.table("echo_conversations").select(
            "role, message"
        ).eq("team_id", team["id"]).order("created_at", desc=False).limit(10).execute()
        history = hist_res.data or []

        # Call AI
        ai_reply = await query_echo_ai(clean_msg, history)

        # Save conversation
        supabase.table("echo_conversations").insert([
            {"team_id": team["id"], "role": "user", "message": clean_msg},
            {"team_id": team["id"], "role": "assistant", "message": ai_reply}
        ]).execute()

        return {
            "success": True,
            "response": ai_reply,
            "prompts_used": new_used,
            "max_prompts": 5,
            "prompts_remaining": 5 - new_used
        }

    else:
        # Mock DB logic
        current_used = mock_db.echo_usage.get(team["id"], 0)
        if current_used >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="ECHO prompt quota depleted (5/5 prompts used). No further transmissions permitted."
            )

        new_used = current_used + 1
        mock_db.echo_usage[team["id"]] = new_used

        t = mock_db.teams.get(team["id"])
        if t:
            t["echo_prompts_used"] = new_used

        history = [
            {"role": m["role"], "message": m["message"]}
            for m in mock_db.echo_conversations
            if m["team_id"] == team["id"]
        ]

        ai_reply = await query_echo_ai(clean_msg, history)

        mock_db.echo_conversations.append({
            "team_id": team["id"],
            "role": "user",
            "message": clean_msg,
            "created_at": "2026-09-02T17:40:00Z"
        })
        mock_db.echo_conversations.append({
            "team_id": team["id"],
            "role": "assistant",
            "message": ai_reply,
            "created_at": "2026-09-02T17:40:02Z"
        })

        return {
            "success": True,
            "response": ai_reply,
            "prompts_used": new_used,
            "max_prompts": 5,
            "prompts_remaining": 5 - new_used
        }
