import time
from typing import Dict
from fastapi import HTTPException, status
from api.config import settings

# In-memory timestamp tracking per team
_attempt_timestamps: Dict[str, float] = {}
_echo_timestamps: Dict[str, float] = {}

def check_attempt_rate_limit(team_id: str):
    """
    Enforces rate limit on challenge attempts (default 1.0 sec per team).
    Unlimited attempts are permitted, but throttled to prevent script hammering.
    """
    now = time.time()
    last_time = _attempt_timestamps.get(team_id, 0.0)
    delta = now - last_time
    if delta < settings.ATTEMPT_RATE_LIMIT_SECONDS:
        wait_ms = int((settings.ATTEMPT_RATE_LIMIT_SECONDS - delta) * 1000)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please wait {wait_ms}ms before trying again."
        )
    _attempt_timestamps[team_id] = now


def check_echo_rate_limit(team_id: str):
    """
    Enforces rate limit on ECHO AI queries (default 2.0 sec per team).
    """
    now = time.time()
    last_time = _echo_timestamps.get(team_id, 0.0)
    delta = now - last_time
    if delta < settings.ECHO_RATE_LIMIT_SECONDS:
        wait_ms = int((settings.ECHO_RATE_LIMIT_SECONDS - delta) * 1000)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"ECHO is processing transmission. Please wait {wait_ms}ms."
        )
    _echo_timestamps[team_id] = now
