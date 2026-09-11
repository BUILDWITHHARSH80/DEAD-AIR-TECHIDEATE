# DEAD AIR — Full-Stack Event System

This is a complete local full-stack starting point based on the supplied DEAD AIR technical brief.

## Stack
- Backend: Python + FastAPI + SQLAlchemy + SQLite
- Frontend: React + Vite
- Authentication: JWT
- Password hashing: bcrypt/passlib
- Evidence storage: local filesystem
- ECHO: server-controlled endpoint with a safe local fallback (swap in an AI API key later)

## Python 3.14 compatibility
This version is configured for Python 3.14. The original package pins were too old for Python 3.14 and could force `pydantic-core` to compile from Rust source. The updated requirements use Pydantic 2.13.5 and FastAPI 0.141.1, which have Python 3.14 support.

## Run on Windows

### Terminal 1 — backend
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks activation:
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\.venv\Scripts\Activate.ps1
```

### Terminal 2 — frontend
```powershell
cd frontend
npm install
npm run dev
```

Open:
http://localhost:5173

Backend API:
http://localhost:8000/docs

## Demo credentials
Team:
- Team ID: MDN-01
- Password: deadair123

Admin:
- Username: admin
- Password: admin123

Other seeded teams use the same team password.

## What is already server-backed
- Team login
- One-active-session check for teams
- Admin login
- SQLite persistence
- Team dashboard data
- Challenge answers and attempts
- Automatic challenge scoring
- Evidence unlock records
- ECHO prompt counting and server-side 5-prompt enforcement
- Final submission lock + duplicate prevention
- Admin team/room view
- Admin event timer controls
- Leaderboard
- Finale score endpoint
- Evidence upload endpoint

## Before the real event
The remaining production-hardening work should include:
1. PostgreSQL/Supabase instead of SQLite for multi-machine deployment.
2. Redis/WebSocket real-time updates if live admin dashboards need push updates.
3. Strong random secret via environment variable.
4. Real user/team provisioning instead of seed credentials.
5. Authoritative encrypted case data on the server.
6. Real ECHO provider API call with server-side system prompt and rate limits.
7. Authoritative timeline answer + scoring rules.
8. Evidence file access authorization rather than public static mounting.
9. HTTPS, reverse proxy, backups, audit logging and error monitoring.
10. Load testing for 40 concurrent teams before the event.

## Important brief alignment
The supplied brief requires React/Tailwind frontend, a simple backend, storage for teams/users/answers/scores/unlocked files/ECHO/timings/submissions, server-side timer, auto-save, automatic scoring, duplicate prevention, prompt enforcement, evidence unlocking, admin override, mobile admin and backup/manual scoring.


### Python 3.14 note
The backend no longer depends on Passlib/bcrypt. Passwords are hashed with Python's built-in PBKDF2-HMAC-SHA256, avoiding the bcrypt backend initialization problem on Python 3.14.