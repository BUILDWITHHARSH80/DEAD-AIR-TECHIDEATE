import hashlib
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from api.config import settings
from api.database import get_supabase_admin, mock_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def normalize_answer(raw_answer: str) -> str:
    """
    Normalizes a submitted challenge answer:
    - Strips whitespace
    - Converts to lowercase
    - Replaces spaces and hyphens with underscores
    - Strips non-alphanumeric/underscore characters
    """
    cleaned = raw_answer.strip().lower()
    cleaned = re.sub(r'[\s\-]+', '_', cleaned)
    cleaned = re.sub(r'[^a-z0-9_]', '', cleaned)
    return cleaned


def hash_answer(normalized_answer: str) -> str:
    """Generates SHA-256 hash of normalized answer string."""
    return hashlib.sha256(normalized_answer.encode('utf-8')).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies password against bcrypt or SHA-256 fallback."""
    if not hashed_password or not plain_password:
        return False
    # Check SHA-256 direct hash match (used in seeds)
    sha256_hash = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    if sha256_hash == hashed_password:
        return True
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generates bcrypt hash of password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Encodes JWT access token with expiration and session token ID."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=settings.JWT_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    if "session_token" not in to_encode:
        to_encode["session_token"] = str(uuid.uuid4())
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates JWT signature and expiry."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_team(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    """
    Validates team JWT token and enforces single active session.
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "team":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Team access required")

    team_id = payload.get("team_id")
    session_token = payload.get("session_token")
    if not team_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

    supabase = get_supabase_admin()
    if supabase:
        res = supabase.table("teams").select("*").eq("id", team_id).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        team = res.data[0]
        # Single active session check: verify active session_token
        if team.get("current_session_token") and team.get("current_session_token") != session_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session has been terminated because this team logged in on another device."
            )
        return team
    else:
        # Fallback to mock DB
        team = mock_db.teams.get(team_id)
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        if team.get("current_session_token") and team.get("current_session_token") != session_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session has been terminated because this team logged in on another device."
            )
        return team


async def get_current_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    """
    Validates admin / room coordinator JWT token.
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin authentication required")
    payload = decode_token(credentials.credentials)
    role = payload.get("role")
    if role not in ["super_admin", "room_coordinator"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    admin_id = payload.get("admin_id")
    username = payload.get("username")

    supabase = get_supabase_admin()
    if supabase:
        res = supabase.table("admins").select("*").eq("id", admin_id).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")
        return res.data[0]
    else:
        admin = mock_db.admins.get(username)
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")
        return admin
