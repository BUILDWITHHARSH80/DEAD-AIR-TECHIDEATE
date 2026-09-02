from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends

from api.database import get_supabase_admin, mock_db
from api.auth import get_current_team, normalize_answer, hash_answer
from api.rate_limiter import check_attempt_rate_limit

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

class ChallengeAttemptRequest(BaseModel):
    submitted_answer: str


@router.get("")
async def list_challenges(team: dict = Depends(get_current_team)):
    """
    Returns the list of 5 challenges along with the requesting team's progress.
    Never exposes correct_answer_hash or answers.
    """
    supabase = get_supabase_admin()
    if supabase:
        # Fetch challenges ordered by unlock_order
        c_res = supabase.table("challenges").select(
            "id, slug, title, description, challenge_type, points_value, unlock_order, is_locked_by_admin, hint"
        ).order("unlock_order").execute()
        challenges = c_res.data or []

        # Fetch team's progress
        p_res = supabase.table("team_challenge_progress").select(
            "challenge_id, is_solved, solved_at, attempt_count, points_awarded"
        ).eq("team_id", team["id"]).execute()
        progress_map = {p["challenge_id"]: p for p in (p_res.data or [])}

        results = []
        for ch in challenges:
            prog = progress_map.get(ch["id"], {
                "is_solved": False,
                "solved_at": None,
                "attempt_count": 0,
                "points_awarded": 0
            })
            results.append({
                **ch,
                "is_solved": prog.get("is_solved", False),
                "solved_at": prog.get("solved_at"),
                "attempt_count": prog.get("attempt_count", 0),
                "points_awarded": prog.get("points_awarded", 0),
            })
        return results
    else:
        # Mock DB fallback
        results = []
        for ch in sorted(mock_db.challenges, key=lambda x: x["unlock_order"]):
            key = f"{team['id']}:{ch['id']}"
            prog = mock_db.team_progress.get(key, {
                "is_solved": False,
                "solved_at": None,
                "attempt_count": 0,
                "points_awarded": 0
            })
            sanitized = {k: v for k, v in ch.items() if k != "correct_answer_hash"}
            results.append({
                **sanitized,
                "is_solved": prog["is_solved"],
                "solved_at": prog["solved_at"],
                "attempt_count": prog["attempt_count"],
                "points_awarded": prog["points_awarded"]
            })
        return results


@router.post("/{challenge_id}/attempt")
async def attempt_challenge(
    challenge_id: str,
    req: ChallengeAttemptRequest,
    team: dict = Depends(get_current_team)
):
    """
    Submits an answer attempt. Unlimited attempts are recorded in the audit trail.
    First correct solve awards points, unlocks evidence, and locks solved_at permanently.
    """
    # 1. Enforce rate limiting
    check_attempt_rate_limit(team["id"])

    clean_raw = req.submitted_answer.strip()
    if not clean_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submitted answer cannot be empty")

    normalized = normalize_answer(clean_raw)
    submitted_hash = hash_answer(normalized)

    supabase = get_supabase_admin()

    if supabase:
        # Check event timer state
        state_res = supabase.table("event_state").select("*").eq("id", 1).execute()
        if state_res.data:
            state = state_res.data[0]
            if state.get("is_paused"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is currently paused by admin.")

        # Fetch challenge
        ch_res = supabase.table("challenges").select("*").eq("id", challenge_id).execute()
        if not ch_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")
        challenge = ch_res.data[0]

        if challenge.get("is_locked_by_admin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This challenge is currently locked by the game master.")

        is_correct = (submitted_hash == challenge.get("correct_answer_hash"))

        # Invoke atomic submit function or handle with direct SQL
        try:
            rpc_res = supabase.rpc("submit_challenge_attempt", {
                "p_team_id": team["id"],
                "p_challenge_id": challenge["id"],
                "p_submitted_answer": clean_raw,
                "p_is_correct": is_correct
            }).execute()
            result_data = rpc_res.data or {}
        except Exception:
            # Fallback if RPC is not loaded
            # 1. Insert attempt
            supabase.table("attempts").insert({
                "team_id": team["id"],
                "challenge_id": challenge["id"],
                "submitted_answer": clean_raw,
                "is_correct": is_correct
            }).execute()

            # 2. Check progress
            prog_res = supabase.table("team_challenge_progress").select("*").eq("team_id", team["id"]).eq("challenge_id", challenge["id"]).execute()
            prog = prog_res.data[0] if prog_res.data else None

            is_already_solved = prog.get("is_solved", False) if prog else False
            solved_at = prog.get("solved_at") if prog else None

            if is_correct and (not is_already_solved or solved_at is None):
                # First solve
                supabase.table("team_challenge_progress").upsert({
                    "team_id": team["id"],
                    "challenge_id": challenge["id"],
                    "is_solved": True,
                    "solved_at": datetime.now(timezone.utc).isoformat(),
                    "attempt_count": (prog.get("attempt_count", 0) if prog else 0) + 1,
                    "points_awarded": challenge["points_value"]
                }).execute()

                supabase.table("score_log").insert({
                    "team_id": team["id"],
                    "delta": challenge["points_value"],
                    "reason": f"Solved challenge: {challenge['slug']}",
                    "source": "auto"
                }).execute()

                # Unlock evidence
                ev_res = supabase.table("evidence_files").select("id").eq("challenge_id", challenge["id"]).limit(1).execute()
                unlocked_id = None
                if ev_res.data:
                    unlocked_id = ev_res.data[0]["id"]
                    supabase.table("team_unlocked_files").upsert({
                        "team_id": team["id"],
                        "evidence_file_id": unlocked_id
                    }).execute()

                result_data = {
                    "is_correct": True,
                    "is_first_solve": True,
                    "points_awarded": challenge["points_value"],
                    "unlocked_file_id": unlocked_id
                }
            else:
                # Increment attempts only
                new_count = (prog.get("attempt_count", 0) if prog else 0) + 1
                supabase.table("team_challenge_progress").upsert({
                    "team_id": team["id"],
                    "challenge_id": challenge["id"],
                    "attempt_count": new_count
                }).execute()

                result_data = {
                    "is_correct": is_correct,
                    "is_first_solve": False,
                    "points_awarded": 0,
                    "unlocked_file_id": None
                }

        return {
            "success": True,
            "is_correct": result_data.get("is_correct", False),
            "is_first_solve": result_data.get("is_first_solve", False),
            "points_awarded": result_data.get("points_awarded", 0),
            "unlocked_file_id": result_data.get("unlocked_file_id"),
            "message": "Challenge solved! Evidence file unlocked." if result_data.get("is_first_solve")
                       else ("Correct! (Already solved)" if result_data.get("is_correct") else "Incorrect transmission. Try again.")
        }

    else:
        # Mock DB logic
        target_ch = None
        for ch in mock_db.challenges:
            if ch["id"] == challenge_id or ch["slug"] == challenge_id:
                target_ch = ch
                break
        if not target_ch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

        if target_ch["is_locked_by_admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This challenge is currently locked by the game master.")

        is_correct = (submitted_hash == target_ch["correct_answer_hash"])

        # Always log attempt
        mock_db.attempts.append({
            "team_id": team["id"],
            "challenge_id": target_ch["id"],
            "submitted_answer": clean_raw,
            "is_correct": is_correct,
            "attempted_at": datetime.now(timezone.utc).isoformat()
        })

        key = f"{team['id']}:{target_ch['id']}"
        prog = mock_db.team_progress.get(key, {
            "team_id": team["id"],
            "challenge_id": target_ch["id"],
            "is_solved": False,
            "solved_at": None,
            "attempt_count": 0,
            "points_awarded": 0
        })

        prog["attempt_count"] += 1

        if is_correct and (not prog["is_solved"] or prog["solved_at"] is None):
            prog["is_solved"] = True
            prog["solved_at"] = datetime.now(timezone.utc).isoformat()
            prog["points_awarded"] = target_ch["points_value"]
            mock_db.team_progress[key] = prog

            # Update score
            t = mock_db.teams.get(team["id"])
            if t:
                t["current_score"] += target_ch["points_value"]

            # Unlock evidence
            unlocked_id = None
            for ev in mock_db.evidence_files:
                if ev["challenge_id"] == target_ch["id"]:
                    unlocked_id = ev["id"]
                    mock_db.team_unlocked_files.append({
                        "team_id": team["id"],
                        "evidence_file_id": ev["id"],
                        "unlocked_at": datetime.now(timezone.utc).isoformat()
                    })
                    break

            return {
                "success": True,
                "is_correct": True,
                "is_first_solve": True,
                "points_awarded": target_ch["points_value"],
                "unlocked_file_id": unlocked_id,
                "message": "Challenge solved! Evidence file unlocked."
            }
        else:
            mock_db.team_progress[key] = prog
            return {
                "success": True,
                "is_correct": is_correct,
                "is_first_solve": False,
                "points_awarded": 0,
                "unlocked_file_id": None,
                "message": "Correct! (Already solved)" if is_correct else "Incorrect transmission. Try again."
            }
