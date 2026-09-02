import re
from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends

from api.database import get_supabase_admin, mock_db
from api.auth import get_current_team

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

class TimelineSlotSubmission(BaseModel):
    timeline_event_id: str
    submitted_text: str

class TimelineBatchRequest(BaseModel):
    submissions: List[TimelineSlotSubmission]


def check_timeline_accuracy(submitted: str, order_index: int) -> bool:
    """
    Evaluates participant's reconstructed timeline description against key forensic facts.
    - Slot 1 (23:15): Alan Vance / Harbor Lights / Slip 42 / boat Maelstrom warning
    - Slot 2 (23:38): Sterling / Finch / Sub-level / Vault B entry
    - Slot 3 (23:52): Vance / manual override key / Vault B / transmitter access
    - Slot 4 (23:54): Power blackout / 7 minutes / Vance escape / Project Oblivion broadcast
    """
    text = submitted.lower()
    if order_index == 1:
        # Warning broadcast / Harbor / Slip / Vance
        matches = sum(1 for kw in ["vance", "harbor", "slip", "42", "maelstrom", "boat", "broadcast", "warning", "96.4"] if kw in text)
        return matches >= 2
    elif order_index == 2:
        # Sterling / Finch / Vault B / Sub-level
        matches = sum(1 for kw in ["sterling", "finch", "vault", "sub-level", "sub level", "manager", "engineer", "entry", "access"] if kw in text)
        return matches >= 2
    elif order_index == 3:
        # Vance / override key / Vault B
        matches = sum(1 for kw in ["vance", "override", "key", "vault", "transmitter", "cam-04", "cctv"] if kw in text)
        return matches >= 2
    elif order_index == 4:
        # Blackout / escape / Oblivion / 7 minute
        matches = sum(1 for kw in ["blackout", "escape", "oblivion", "7 minute", "7-minute", "grid", "trawler", "power"] if kw in text)
        return matches >= 2
    return len(text.strip()) > 20


@router.get("")
async def get_timeline(team: dict = Depends(get_current_team)):
    """
    Returns timeline event slots and the team's submissions.
    Secret answer keys are hidden from participants.
    """
    supabase = get_supabase_admin()
    if supabase:
        # Fetch event slots
        e_res = supabase.table("timeline_events").select(
            "id, order_index, correct_timestamp_label, hint_title, points_value"
        ).order("order_index").execute()
        events = e_res.data or []

        # Fetch team's submissions
        s_res = supabase.table("timeline_submissions").select(
            "timeline_event_id, submitted_text, is_correct, submitted_at"
        ).eq("team_id", team["id"]).execute()
        subs_map = {s["timeline_event_id"]: s for s in (s_res.data or [])}

        results = []
        for ev in events:
            sub = subs_map.get(ev["id"])
            results.append({
                "id": ev["id"],
                "order_index": ev["order_index"],
                "timestamp_label": ev["correct_timestamp_label"],
                "hint_title": ev["hint_title"],
                "points_value": ev["points_value"],
                "is_submitted": sub is not None,
                "submitted_text": sub.get("submitted_text") if sub else "",
                "is_correct": sub.get("is_correct") if sub else False,
                "submitted_at": sub.get("submitted_at") if sub else None
            })
        return results

    else:
        # Mock DB logic
        subs_map = {
            s["timeline_event_id"]: s
            for s in mock_db.timeline_submissions
            if s["team_id"] == team["id"]
        }
        results = []
        for ev in sorted(mock_db.timeline_events, key=lambda x: x["order_index"]):
            sub = subs_map.get(ev["id"])
            results.append({
                "id": ev["id"],
                "order_index": ev["order_index"],
                "timestamp_label": ev["correct_timestamp_label"],
                "hint_title": ev["hint_title"],
                "points_value": ev["points_value"],
                "is_submitted": sub is not None,
                "submitted_text": sub.get("submitted_text") if sub else "",
                "is_correct": sub.get("is_correct") if sub else False,
                "submitted_at": sub.get("submitted_at") if sub else None
            })
        return results


@router.post("/submit")
async def submit_timeline(
    req: TimelineBatchRequest,
    team: dict = Depends(get_current_team)
):
    """
    Submits timeline descriptions for evaluation.
    Awards 50 points per accurate timeline event reconstruction.
    """
    if not req.submissions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No timeline events submitted")

    supabase = get_supabase_admin()
    if supabase:
        # Fetch event answer keys
        e_res = supabase.table("timeline_events").select("*").execute()
        events_map = {e["id"]: e for e in (e_res.data or [])}

        results = []
        total_points_awarded = 0

        for item in req.submissions:
            ev = events_map.get(item.timeline_event_id)
            if not ev:
                continue

            is_correct = check_timeline_accuracy(item.submitted_text, ev["order_index"])

            # Check if previously correctly submitted
            prev_sub = supabase.table("timeline_submissions").select("*").eq(
                "team_id", team["id"]
            ).eq("timeline_event_id", item.timeline_event_id).execute()

            was_correct = prev_sub.data[0].get("is_correct", False) if prev_sub.data else False

            # Upsert submission
            supabase.table("timeline_submissions").upsert({
                "team_id": team["id"],
                "timeline_event_id": item.timeline_event_id,
                "submitted_text": item.submitted_text.strip(),
                "is_correct": is_correct
            }).execute()

            pts = 0
            if is_correct and not was_correct:
                pts = ev.get("points_value", 50)
                total_points_awarded += pts
                supabase.table("score_log").insert({
                    "team_id": team["id"],
                    "delta": pts,
                    "reason": f"Timeline event solved: {ev['correct_timestamp_label']}",
                    "source": "auto"
                }).execute()

            results.append({
                "timeline_event_id": item.timeline_event_id,
                "timestamp_label": ev["correct_timestamp_label"],
                "is_correct": is_correct,
                "points_awarded": pts
            })

        return {
            "success": True,
            "total_points_awarded": total_points_awarded,
            "results": results
        }

    else:
        # Mock DB logic
        events_map = {e["id"]: e for e in mock_db.timeline_events}
        results = []
        total_points_awarded = 0

        for item in req.submissions:
            ev = events_map.get(item.timeline_event_id)
            if not ev:
                continue

            is_correct = check_timeline_accuracy(item.submitted_text, ev["order_index"])

            # Find existing
            existing = None
            for s in mock_db.timeline_submissions:
                if s["team_id"] == team["id"] and s["timeline_event_id"] == item.timeline_event_id:
                    existing = s
                    break

            was_correct = existing.get("is_correct", False) if existing else False

            if existing:
                existing["submitted_text"] = item.submitted_text.strip()
                existing["is_correct"] = is_correct
            else:
                mock_db.timeline_submissions.append({
                    "team_id": team["id"],
                    "timeline_event_id": item.timeline_event_id,
                    "submitted_text": item.submitted_text.strip(),
                    "is_correct": is_correct,
                    "submitted_at": "2026-09-02T17:45:00Z"
                })

            pts = 0
            if is_correct and not was_correct:
                pts = ev.get("points_value", 50)
                total_points_awarded += pts
                t = mock_db.teams.get(team["id"])
                if t:
                    t["current_score"] += pts

            results.append({
                "timeline_event_id": item.timeline_event_id,
                "timestamp_label": ev["correct_timestamp_label"],
                "is_correct": is_correct,
                "points_awarded": pts
            })

        return {
            "success": True,
            "total_points_awarded": total_points_awarded,
            "results": results
        }
