from datetime import datetime, timezone
from typing import Optional, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends

from api.database import get_supabase_admin, mock_db
from api.auth import get_current_team

router = APIRouter(prefix="/api/round1", tags=["submissions"])

class FinalSubmissionRequest(BaseModel):
    what_happened: str
    who_was_involved: str
    reconstructed_timeline: Any  # JSON list or string
    key_evidence: str
    final_explanation: str


@router.get("/submission")
async def get_team_final_submission(team: dict = Depends(get_current_team)):
    """
    Returns the team's final case dossier submission.
    """
    supabase = get_supabase_admin()
    if supabase:
        res = supabase.table("final_submissions").select("*").eq(
            "team_id", team["id"]
        ).eq("round", 1).execute()
        if not res.data:
            return {"is_submitted": False, "submission": None}
        sub = res.data[0]
        return {
            "is_submitted": True,
            "submission": sub
        }
    else:
        sub = mock_db.final_submissions.get(team["id"])
        if not sub:
            return {"is_submitted": False, "submission": None}
        return {
            "is_submitted": True,
            "submission": sub
        }


@router.post("/submit")
async def submit_final_case(
    req: FinalSubmissionRequest,
    team: dict = Depends(get_current_team)
):
    """
    Submits the final case theory dossier.
    Sets locked = TRUE. Once locked, further writes are rejected with 409 Conflict.
    """
    # Validate non-empty fields
    if not req.what_happened.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'What Happened' theory is required.")
    if not req.who_was_involved.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'Who Was Involved' suspects field is required.")
    if not req.key_evidence.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'Key Evidence' summary is required.")
    if not req.final_explanation.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'Final Explanation' is required.")

    supabase = get_supabase_admin()
    if supabase:
        # Check event timer state
        state_res = supabase.table("event_state").select("*").eq("id", 1).execute()
        if state_res.data:
            state = state_res.data[0]
            if state.get("is_paused"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is currently paused by admin.")

        # Check existing submission
        existing = supabase.table("final_submissions").select("*").eq(
            "team_id", team["id"]
        ).eq("round", 1).execute()

        if existing.data and existing.data[0].get("locked", False):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Final case theory is already locked and cannot be modified."
            )

        timeline_data = req.reconstructed_timeline
        if isinstance(timeline_data, str):
            timeline_data = [{"text": timeline_data}]

        submission_data = {
            "team_id": team["id"],
            "round": 1,
            "what_happened": req.what_happened.strip(),
            "who_was_involved": req.who_was_involved.strip(),
            "reconstructed_timeline": timeline_data,
            "key_evidence": req.key_evidence.strip(),
            "final_explanation": req.final_explanation.strip(),
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "locked": True
        }

        supabase.table("final_submissions").upsert(submission_data).execute()

        return {
            "success": True,
            "message": "Final case theory locked and submitted successfully. Stand by for Round 2 finalist announcements.",
            "submission": submission_data
        }

    else:
        # Mock DB logic
        existing = mock_db.final_submissions.get(team["id"])
        if existing and existing.get("locked", False):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Final case theory is already locked and cannot be modified."
            )

        submission_data = {
            "team_id": team["id"],
            "round": 1,
            "what_happened": req.what_happened.strip(),
            "who_was_involved": req.who_was_involved.strip(),
            "reconstructed_timeline": req.reconstructed_timeline,
            "key_evidence": req.key_evidence.strip(),
            "final_explanation": req.final_explanation.strip(),
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "locked": True,
            "admin_score": None,
            "admin_feedback": None
        }
        mock_db.final_submissions[team["id"]] = submission_data

        return {
            "success": True,
            "message": "Final case theory locked and submitted successfully. Stand by for Round 2 finalist announcements.",
            "submission": submission_data
        }
