
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .database import Base, engine, SessionLocal, get_db
from .models import Event, Team, Challenge, Attempt, Unlock, EchoMessage, Submission, FinaleScore, Admin
from .security import hash_password, verify_password, make_token, decode_token
from .schemas import LoginIn, AdminLoginIn, AnswerIn, EchoIn, SubmissionIn, AccuracyIn

logger = logging.getLogger("dead_air")

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(title="DEAD AIR Control API", version="2.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
allowed_origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
)
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── EVIDENCE STORAGE ──────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parents[1]
EVIDENCE = BASE / "storage" / "evidence"
EVIDENCE.mkdir(parents=True, exist_ok=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "evidence")

supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialised for bucket '%s'", SUPABASE_BUCKET)
    except Exception as e:
        logger.warning("Could not initialise Supabase client: %s", e)


def get_evidence_url(filename: str, expires_in: int = 3600) -> str | None:
    """Return a signed/public URL from Supabase Storage, or local fallback."""
    if not filename:
        return None
    if supabase_client:
        try:
            res = supabase_client.storage.from_(SUPABASE_BUCKET).create_signed_url(filename, expires_in)
            if isinstance(res, dict):
                signed = res.get("signedURL") or res.get("signedUrl") or res.get("url")
                if signed:
                    return signed
            elif hasattr(res, "signed_url") and res.signed_url:
                return res.signed_url
        except Exception:
            try:
                pub = supabase_client.storage.from_(SUPABASE_BUCKET).get_public_url(filename)
                if isinstance(pub, str) and pub:
                    return pub
                if isinstance(pub, dict):
                    return pub.get("publicUrl") or pub.get("publicURL")
            except Exception:
                pass
    return f"/evidence/{filename}"


# ── SEEDER ────────────────────────────────────────────────────────────────────
def seed(db: Session):
    """Idempotent seeder — safe for multi-worker and cold-start environments."""

    try:
        if not db.query(Event).first():
            db.add(Event(name="DEAD AIR — Radio Meridian", duration_seconds=3600))
            db.commit()
    except Exception:
        db.rollback()

    try:
        if not db.query(Admin).first():
            db.add(Admin(username="admin", password_hash=hash_password("admin123")))
            db.commit()
    except Exception:
        db.rollback()

    try:
        # Passkeys are 4-digit codes earned at physical stations.
        # Change these to your real event passkeys before go-live.
        challenges = [
            ("frequency", "01", "FREQUENCY",  "Physical + Tech Station",
             "Complete the Frequency Analysis station challenge to receive your passkey.",
             "1047", 100, "Frequency Analysis.pdf"),
            ("static",    "02", "STATIC",     "Cryptography Station",
             "Complete the Static Decode station challenge to receive your passkey.",
             "2718", 125, "Static Decode.txt"),
            ("script",    "03", "SCRIPT",     "Logic Station",
             "Complete the Production Log station challenge to receive your passkey.",
             "3141", 125, "Production Log.pdf"),
            ("frame",     "04", "FRAME",      "Observation Station",
             "Complete the Frame Analysis station challenge to receive your passkey.",
             "0002", 100, "Frame Evidence.jpg"),
        ]
        for slug, code, name, ctype, prompt, answer, pts, evfile in challenges:
            if not db.query(Challenge).filter(Challenge.slug == slug).first():
                db.add(Challenge(
                    slug=slug, code=code, name=name, challenge_type=ctype,
                    prompt=prompt, answer=answer, points=pts, evidence_filename=evfile
                ))
        db.commit()
    except Exception:
        db.rollback()

    try:
        teams = [
            ("MDN-01", "Night Shift",    "ROOM A", ["Aarav",  "Meera",  "Kabir"]),
            ("MDN-02", "Signal Lost",    "ROOM A", ["Riya",   "Dev",    "Nikhil"]),
            ("MDN-03", "Dead Frequency", "ROOM A", ["Anaya",  "Ishaan", "Tara"]),
            ("MDN-11", "Waveform",       "ROOM B", ["Vihaan", "Sara",   "Arjun"]),
            ("MDN-12", "Redline",        "ROOM B", ["Aditi",  "Kunal",  "Neel"]),
            ("MDN-21", "The Operators",  "ROOM C", ["Rohan",  "Ira",    "Mihir"]),
            ("MDN-31", "Zero Signal",    "ROOM D", ["Zoya",   "Om",     "Reyansh"]),
        ]
        for tid, name, room, members in teams:
            if not db.query(Team).filter(Team.team_id == tid).first():
                db.add(Team(
                    team_id=tid,
                    password_hash=hash_password("deadair123"),
                    name=name, room=room,
                    members=json.dumps(members)
                ))
        db.commit()
    except Exception:
        db.rollback()


try:
    with SessionLocal() as _s:
        seed(_s)
except Exception as e:
    logger.warning("Auto-seed skipped or completed concurrently: %s", e)


# ── AUTH HELPERS ──────────────────────────────────────────────────────────────
def auth(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    try:
        return decode_token(authorization[7:])
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


def require_team(payload=Depends(auth)):
    if payload.get("role") != "team":
        raise HTTPException(403, "Team access required")
    return int(payload["sub"])


def require_admin(payload=Depends(auth)):
    if payload.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return payload


def timer_state(event: Event):
    if not event or not event.started_at:
        return {
            "status": event.status if event else "not_started",
            "remaining_seconds": event.duration_seconds if event else 3600
        }
    elapsed = int((datetime.now(timezone.utc).replace(tzinfo=None) - event.started_at).total_seconds())
    remaining = max(0, event.duration_seconds - elapsed)
    status = "ended" if remaining == 0 else event.status
    return {"status": status, "remaining_seconds": remaining}


# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"ok": True, "service": "dead-air", "version": "2.0.0"}


# ── AUTH ENDPOINTS ────────────────────────────────────────────────────────────
@app.post("/api/auth/team")
def team_login(data: LoginIn, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.team_id == data.team_id).first()
    if not team or not verify_password(data.password, team.password_hash):
        raise HTTPException(401, "Invalid team ID or password")
    token = make_token(team.id, "team")
    team.session_token = token
    db.commit()
    return {
        "token": token,
        "role": "team",
        "team": {
            "id": team.team_id,
            "name": team.name,
            "room": team.room,
            "members": json.loads(team.members)
        }
    }


@app.post("/api/auth/team/logout")
def team_logout(team_id=Depends(require_team), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    if team:
        team.session_token = None
        db.commit()
    return {"ok": True}


@app.post("/api/auth/admin")
def admin_login(data: AdminLoginIn, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == data.username).first()
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(401, "Invalid admin credentials")
    return {"token": make_token(admin.id, "admin"), "role": "admin"}


# ── TEAM DASHBOARD ────────────────────────────────────────────────────────────
@app.get("/api/team/dashboard")
def dashboard(team_id=Depends(require_team), db: Session = Depends(get_db)):
    team = db.get(Team, team_id)
    event = db.query(Event).first()
    challenges = db.query(Challenge).all()
    unlocks = {u.challenge_id for u in db.query(Unlock).filter(Unlock.team_id == team_id).all()}
    echo = db.query(EchoMessage).filter(EchoMessage.team_id == team_id, EchoMessage.role == "user").count()
    return {
        "team": {
            "team_id": team.team_id, "name": team.name, "room": team.room,
            "members": json.loads(team.members), "score": team.score, "submitted": team.submitted
        },
        "timer": timer_state(event),
        "challenges": [
            {
                "id": c.id, "slug": c.slug, "code": c.code, "name": c.name,
                "type": c.challenge_type, "points": c.points,
                "enabled": c.enabled, "solved": c.id in unlocks
            }
            for c in challenges
        ],
        "echo_used": echo
    }


# ── BROADCAST FILES (CHALLENGES) ──────────────────────────────────────────────
@app.get("/api/challenges")
def challenges(team_id=Depends(require_team), db: Session = Depends(get_db)):
    unlocks = {u.challenge_id for u in db.query(Unlock).filter(Unlock.team_id == team_id).all()}
    return [
        {
            "id": c.id, "slug": c.slug, "code": c.code, "name": c.name,
            "challenge_type": c.challenge_type, "points": c.points,
            "enabled": c.enabled, "solved": c.id in unlocks
        }
        for c in db.query(Challenge).all()
    ]


@app.post("/api/challenges/{slug}/submit")
def challenge_submit(slug: str, data: AnswerIn, team_id=Depends(require_team), db: Session = Depends(get_db)):
    # Validate 4-digit passkey format
    passkey = data.answer.strip()
    if not passkey.isdigit() or len(passkey) != 4:
        raise HTTPException(400, "Passkey must be exactly 4 digits")

    # Row-lock team on PostgreSQL to prevent race conditions
    team_q = db.query(Team).filter(Team.id == team_id)
    if db.bind and db.bind.dialect.name != "sqlite":
        team_q = team_q.with_for_update()
    team = team_q.first()
    if not team:
        raise HTTPException(404, "Team not found")

    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c or not c.enabled:
        raise HTTPException(404, "Broadcast file unavailable")
    if team.submitted:
        raise HTTPException(409, "Final report already locked")

    already = db.query(Unlock).filter(Unlock.team_id == team_id, Unlock.challenge_id == c.id).first()
    if already:
        return {
            "correct": True,
            "already_unlocked": True,
            "points": 0,
            "evidence_unlocked": True,
            "file": c.evidence_filename,
            "url": get_evidence_url(c.evidence_filename)
        }

    correct = passkey == c.answer.strip()
    db.add(Attempt(team_id=team_id, challenge_id=c.id, answer=passkey, correct=correct))
    if correct:
        db.add(Unlock(team_id=team_id, challenge_id=c.id))
        team.score += c.points
    db.commit()

    return {
        "correct": correct,
        "points": c.points if correct else 0,
        "evidence_unlocked": correct,
        "file": c.evidence_filename if correct else None,
        "url": get_evidence_url(c.evidence_filename) if correct else None
    }


# ── EVIDENCE ROOM ─────────────────────────────────────────────────────────────
@app.get("/api/evidence")
def evidence(team_id=Depends(require_team), db: Session = Depends(get_db)):
    unlocked = {u.challenge_id for u in db.query(Unlock).filter(Unlock.team_id == team_id).all()}
    items = []
    for c in db.query(Challenge).all():
        is_unlocked = c.id in unlocked
        items.append({
            "name": c.evidence_filename,
            "challenge": c.name,
            "unlocked": is_unlocked,
            "url": get_evidence_url(c.evidence_filename) if is_unlocked else None
        })
    return items


# ── ECHO AI ───────────────────────────────────────────────────────────────────
@app.post("/api/echo")
def echo(data: EchoIn, team_id=Depends(require_team), db: Session = Depends(get_db)):
    used = db.query(EchoMessage).filter(EchoMessage.team_id == team_id, EchoMessage.role == "user").count()
    if used >= 5:
        raise HTTPException(429, "ECHO interrogation limit reached")

    db.add(EchoMessage(team_id=team_id, role="user", content=data.message))

    # Contextual ECHO reply — replace with a live Gemini API call if configured
    reply = (
        "ECHO_MEMORY_FRAGMENT_RECOVERED...\n"
        "I was online when it happened. The transmitter log shows an anomaly at 23:41 — "
        "but I cannot reconstruct the full sequence from corrupted memory alone. "
        "Cross-reference the timestamps in the Production Log with what you found in the Frequency Analysis. "
        "The Static Decode holds a name. The Frame shows what they left behind. "
        "I will not give you the answer — I am bound by my last instruction from Meridian. "
        "Ask me something specific."
    )

    db.add(EchoMessage(team_id=team_id, role="assistant", content=reply))
    db.commit()

    history = db.query(EchoMessage).filter(EchoMessage.team_id == team_id).order_by(EchoMessage.id).all()
    return {
        "reply": reply,
        "used": used + 1,
        "remaining": 4 - used,
        "history": [{"role": m.role, "content": m.content} for m in history]
    }


# ── FINAL SUBMISSION ──────────────────────────────────────────────────────────
@app.post("/api/submission")
def submit_submission(data: SubmissionIn, team_id=Depends(require_team), db: Session = Depends(get_db)):
    team_q = db.query(Team).filter(Team.id == team_id)
    if db.bind and db.bind.dialect.name != "sqlite":
        team_q = team_q.with_for_update()
    team = team_q.first()
    if not team:
        raise HTTPException(404, "Team not found")
    if team.submitted or db.query(Submission).filter(Submission.team_id == team_id).first():
        raise HTTPException(409, "Final report already submitted")

    db.add(Submission(
        team_id=team_id,
        broadcast_schedule=data.broadcast_schedule,
        truth_theory=data.truth_theory
    ))
    team.submitted = True
    db.commit()
    return {"ok": True, "locked": True}


# ── ADMIN: OVERVIEW ───────────────────────────────────────────────────────────
@app.get("/api/admin/overview")
def admin_overview(_=Depends(require_admin), db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    event = db.query(Event).first()
    return {
        "timer": timer_state(event),
        "teams": len(teams),
        "active": sum(t.status == "active" and not t.submitted for t in teams),
        "submissions": sum(t.submitted for t in teams),
        "files_unlocked": db.query(Unlock).count(),
        "avg_score": round(sum(t.score for t in teams) / len(teams)) if teams else 0
    }


# ── ADMIN: TEAMS ──────────────────────────────────────────────────────────────
@app.get("/api/admin/teams")
def admin_teams(room: str = "ALL", _=Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(Team)
    if room != "ALL":
        q = q.filter(Team.room == room)
    out = []
    for t in q.order_by(desc(Team.score)).all():
        unlocked = db.query(Unlock).filter(Unlock.team_id == t.id).count()
        challenges = db.query(Attempt).filter(Attempt.team_id == t.id, Attempt.correct == True).count()
        echo = db.query(EchoMessage).filter(EchoMessage.team_id == t.id, EchoMessage.role == "user").count()
        out.append({
            "team_id": t.team_id, "name": t.name, "room": t.room,
            "members": json.loads(t.members),
            "status": "Submitted" if t.submitted else "In Progress",
            "score": t.score, "challenges": challenges, "files": unlocked, "echo_used": echo
        })
    return out


# ── ADMIN: LEADERBOARD ────────────────────────────────────────────────────────
@app.get("/api/admin/leaderboard")
def leaderboard(_=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Ranking criteria (in priority order):
      1. Both tasks submitted (desc) — teams with a final report rank higher
      2. Accuracy score (desc, NULL = last) — admin-rated 0 / 50 / 100
      3. Submission time (asc, NULL = last) — earlier submission wins ties
      4. Score (desc) — passkey points as final tiebreaker
    """
    teams = db.query(Team).all()
    result = []
    for t in teams:
        sub = db.query(Submission).filter(Submission.team_id == t.id).first()
        files = db.query(Unlock).filter(Unlock.team_id == t.id).count()
        result.append({
            "team_id": t.team_id,
            "name": t.name,
            "room": t.room,
            "score": t.score,
            "files": files,
            "submitted": sub is not None,
            "both_tasks": sub is not None,  # having a submission = both fields were required
            "accuracy_score": sub.accuracy_score if sub else None,
            "submitted_at": sub.submitted_at.isoformat() if sub and sub.submitted_at else None,
        })

    def _sort_key(r):
        return (
            0 if r["both_tasks"] else 1,                             # 1. submitted desc
            -(r["accuracy_score"] if r["accuracy_score"] is not None else -9999),  # 2. accuracy desc
            r["submitted_at"] or "9999-99-99",                       # 3. sub time asc
            -r["score"]                                              # 4. score desc
        )

    result.sort(key=_sort_key)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result


# ── ADMIN: SUBMISSIONS (THEORY JUDGE) ─────────────────────────────────────────
@app.get("/api/admin/submissions")
def admin_submissions(_=Depends(require_admin), db: Session = Depends(get_db)):
    """Return all final reports for admin review, sorted by submission time."""
    subs = db.query(Submission).order_by(Submission.submitted_at).all()
    result = []
    for s in subs:
        team = db.get(Team, s.team_id)
        result.append({
            "id": s.id,
            "team_id": team.team_id if team else "?",
            "team_name": team.name if team else "?",
            "room": team.room if team else "?",
            "broadcast_schedule": s.broadcast_schedule,
            "truth_theory": s.truth_theory,
            "accuracy_score": s.accuracy_score,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        })
    return result


@app.post("/api/admin/submissions/{submission_id}/accuracy")
def set_accuracy(submission_id: int, data: AccuracyIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    """Set the accuracy score for a team's final report (0, 50, or 100)."""
    s = db.get(Submission, submission_id)
    if not s:
        raise HTTPException(404, "Submission not found")
    if data.score not in (0, 50, 100):
        raise HTTPException(400, "Accuracy score must be 0, 50, or 100")
    s.accuracy_score = data.score
    db.commit()
    return {"ok": True, "id": submission_id, "accuracy_score": data.score}


# ── ADMIN: EVENT CONTROLS ─────────────────────────────────────────────────────
@app.post("/api/admin/event/{action}")
def event_action(action: str, _=Depends(require_admin), db: Session = Depends(get_db)):
    event = db.query(Event).first()
    if action == "start":
        if not event.started_at:
            event.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
        event.status = "running"
    elif action == "pause":
        event.status = "paused"
    elif action == "resume":
        event.status = "running"
    elif action == "end":
        event.status = "ended"
    else:
        raise HTTPException(400, "Unknown action")
    db.commit()
    return timer_state(event)


# ── ADMIN: CHALLENGE CONTROLS ─────────────────────────────────────────────────
@app.post("/api/admin/challenges/{slug}/{action}")
def challenge_action(slug: str, action: str, _=Depends(require_admin), db: Session = Depends(get_db)):
    c = db.query(Challenge).filter(Challenge.slug == slug).first()
    if not c:
        raise HTTPException(404, "Broadcast file not found")
    if action in ("unlock", "enable"):
        c.enabled = True
    elif action in ("lock", "disable"):
        c.enabled = False
    else:
        raise HTTPException(400, "Unknown action")
    db.commit()
    return {"ok": True, "enabled": c.enabled}


# ── ADMIN: SCORE OVERRIDE ─────────────────────────────────────────────────────
@app.post("/api/admin/teams/{team_id}/score")
def adjust_score(team_id: str, delta: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Team).filter(Team.team_id == team_id).first()
    if not t:
        raise HTTPException(404, "Team not found")
    t.score = max(0, t.score + delta)
    db.commit()
    return {"team_id": t.team_id, "score": t.score}


# ── ADMIN: FINALE SCORE ───────────────────────────────────────────────────────
@app.post("/api/admin/finale/{team_id}")
def finale_score(team_id: str, score: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Team).filter(Team.team_id == team_id).first()
    if not t:
        raise HTTPException(404, "Team not found")
    row = db.query(FinaleScore).filter(FinaleScore.team_id == t.id).first()
    if not row:
        row = FinaleScore(team_id=t.id, score=score)
        db.add(row)
    else:
        row.score = score
        row.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    t.score += score
    db.commit()
    return {"ok": True, "score": score}


# ── ADMIN: EVIDENCE UPLOAD ────────────────────────────────────────────────────
@app.post("/api/admin/evidence/upload")
def upload_evidence(file: UploadFile = File(...), _=Depends(require_admin)):
    clean_filename = Path(file.filename).name
    content = file.file.read()

    supabase_uploaded = False
    if supabase_client:
        try:
            supabase_client.storage.from_(SUPABASE_BUCKET).upload(
                path=clean_filename,
                file=content,
                file_options={"upsert": "true", "content-type": file.content_type or "application/octet-stream"}
            )
            supabase_uploaded = True
        except Exception as e:
            logger.warning("Supabase storage upload error: %s", e)

    dest = EVIDENCE / clean_filename
    with dest.open("wb") as f:
        f.write(content)

    return {
        "ok": True,
        "filename": clean_filename,
        "supabase_storage": supabase_uploaded,
        "url": get_evidence_url(clean_filename)
    }


# ── STATIC EVIDENCE FILES (local dev) ─────────────────────────────────────────
if EVIDENCE.exists():
    app.mount("/evidence", StaticFiles(directory=str(EVIDENCE)), name="evidence")
