from datetime import datetime, timezone
from fastapi import APIRouter
from api.database import get_supabase_admin, mock_db

router = APIRouter(prefix="/api/event", tags=["event"])

@router.get("/state")
async def get_event_state():
    """
    Returns the single source of truth for the event countdown timer and round state.
    Frontend computes remaining time client-side and resyncs using server_time.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase = get_supabase_admin()

    if supabase:
        res = supabase.table("event_state").select("*").eq("id", 1).execute()
        if res.data:
            state = res.data[0]
            return {
                "round": state.get("round", 1),
                "event_start_time": state.get("event_start_time"),
                "event_end_time": state.get("event_end_time"),
                "is_paused": state.get("is_paused", False),
                "paused_at": state.get("paused_at"),
                "paused_duration_accumulated": state.get("paused_duration_accumulated", 0),
                "duration_minutes": state.get("duration_minutes", 90),
                "server_time": now_iso
            }

    # Fallback to mock state
    state = mock_db.event_state
    return {
        "round": state.get("round", 1),
        "event_start_time": state.get("event_start_time"),
        "event_end_time": state.get("event_end_time"),
        "is_paused": state.get("is_paused", False),
        "paused_at": state.get("paused_at"),
        "paused_duration_accumulated": state.get("paused_duration_accumulated", 0),
        "duration_minutes": state.get("duration_minutes", 90),
        "server_time": now_iso
    }
