import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends

from api.database import get_supabase_admin, mock_db
from api.auth import (
    verify_password,
    create_access_token,
    get_current_team,
    get_current_admin,
    decode_token,
    security
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

class TeamLoginRequest(BaseModel):
    team_id: str
    password: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/team-login")
async def team_login(req: TeamLoginRequest):
    """
    Authenticates team, establishes single-active-session token,
    and invalidates any previous session for this team.
    """
    normalized_team_id = req.team_id.strip().upper()
    supabase = get_supabase_admin()

    if supabase:
        res = supabase.table("teams").select("*").eq("team_id", normalized_team_id).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Team ID or password")
        team = res.data[0]
        if not verify_password(req.password, team.get("password_hash", "")):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Team ID or password")

        new_session_token = str(uuid.uuid4())
        # Update team state in DB
        supabase.table("teams").update({
            "is_logged_in": True,
            "current_session_token": new_session_token
        }).eq("id", team["id"]).execute()

        token = create_access_token({
            "team_id": team["id"],
            "team_name": team["team_name"],
            "room": team["room"],
            "role": "team",
            "session_token": new_session_token
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "team": {
                "id": team["id"],
                "team_id": team["team_id"],
                "team_name": team["team_name"],
                "room": team["room"],
                "members": team["members"],
                "status": team["status"],
                "current_score": team["current_score"]
            }
        }
    else:
        # Mock DB fallback
        found_team = None
        for t in mock_db.teams.values():
            if t["team_id"].upper() == normalized_team_id:
                found_team = t
                break
        if not found_team or not verify_password(req.password, found_team["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Team ID or password")

        new_session_token = str(uuid.uuid4())
        found_team["is_logged_in"] = True
        found_team["current_session_token"] = new_session_token

        token = create_access_token({
            "team_id": found_team["id"],
            "team_name": found_team["team_name"],
            "room": found_team["room"],
            "role": "team",
            "session_token": new_session_token
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "team": {
                "id": found_team["id"],
                "team_id": found_team["team_id"],
                "team_name": found_team["team_name"],
                "room": found_team["room"],
                "members": found_team["members"],
                "status": found_team["status"],
                "current_score": found_team["current_score"]
            }
        }


@router.post("/team-logout")
async def team_logout(team: dict = Depends(get_current_team)):
    """Logs team out and frees single-session lock."""
    supabase = get_supabase_admin()
    if supabase:
        supabase.table("teams").update({
            "is_logged_in": False,
            "current_session_token": None
        }).eq("id", team["id"]).execute()
    else:
        t = mock_db.teams.get(team["id"])
        if t:
            t["is_logged_in"] = False
            t["current_session_token"] = None
    return {"message": "Logged out successfully"}


@router.post("/admin-login")
async def admin_login(req: AdminLoginRequest):
    """Authenticates admin or room coordinator."""
    username = req.username.strip().lower()
    supabase = get_supabase_admin()

    if supabase:
        res = supabase.table("admins").select("*").eq("username", username).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
        admin = res.data[0]
        if not verify_password(req.password, admin.get("password_hash", "")):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

        token = create_access_token({
            "admin_id": admin["id"],
            "username": admin["username"],
            "role": admin["role"],
            "assigned_room": admin.get("assigned_room")
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "admin": {
                "id": admin["id"],
                "username": admin["username"],
                "role": admin["role"],
                "assigned_room": admin.get("assigned_room")
            }
        }
    else:
        admin = mock_db.admins.get(username)
        if not admin or not verify_password(req.password, admin["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

        token = create_access_token({
            "admin_id": admin["id"],
            "username": admin["username"],
            "role": admin["role"],
            "assigned_room": admin.get("assigned_room")
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "admin": {
                "id": admin["id"],
                "username": admin["username"],
                "role": admin["role"],
                "assigned_room": admin.get("assigned_room")
            }
        }


@router.get("/me")
async def get_me(credentials=Depends(security)):
    """Validates session and returns current profile."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    role = payload.get("role")
    if role == "team":
        team = await get_current_team(credentials)
        return {"role": "team", "data": team}
    elif role in ["super_admin", "room_coordinator"]:
        admin = await get_current_admin(credentials)
        return {"role": role, "data": admin}
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown role")
