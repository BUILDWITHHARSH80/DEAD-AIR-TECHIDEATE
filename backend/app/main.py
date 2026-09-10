
from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pathlib import Path
from datetime import datetime, timezone
import json, os, shutil

from .database import Base, engine, get_db
from .models import Event, Team, Challenge, Attempt, Unlock, EchoMessage, Submission, FinaleScore, Admin
from .security import hash_password, verify_password, make_token, decode_token
from .schemas import LoginIn, AdminLoginIn, AnswerIn, EchoIn, TimelineIn, SubmissionIn

Base.metadata.create_all(bind=engine)
app = FastAPI(title="DEAD AIR Control API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173","http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

BASE = Path(__file__).resolve().parents[1]
EVIDENCE = BASE / "storage" / "evidence"
EVIDENCE.mkdir(parents=True, exist_ok=True)

def seed(db: Session):
    if not db.query(Event).first():
        db.add(Event(name="DEAD AIR — Radio Meridian", duration_seconds=3600))
    if not db.query(Admin).first():
        db.add(Admin(username="admin", password_hash=hash_password("admin123")))
    if db.query(Challenge).count() == 0:
        rows = [
          ("frequency","01","FREQUENCY","Technical puzzle","A carrier is transmitting at 104.7 MHz. The emergency log says the signal was shifted down by 3.2 MHz. Enter the resulting frequency in MHz.","101.5",100,"Frequency Analysis.pdf"),
          ("static","02","STATIC","Cryptography puzzle","Decode the case token: ROT13 of 'ERQNE'. Enter the decoded word.","REDAR",125,"Static Decode.txt"),
          ("script","03","SCRIPT","Logic / timeline puzzle","Which event happened first: the transmitter fault, the emergency tone, or the final voice transmission? Enter the first event.","transmitter fault",125,"Production Log.pdf"),
          ("frame","04","FRAME","Observation puzzle","The control-room still shows three active indicators. How many are amber? Enter the number.","2",100,"Frame Evidence.jpg"),
        ]
        for x in rows:
            db.add(Challenge(slug=x[0], code=x[1], name=x[2], challenge_type=x[3], prompt=x[4], answer=x[5], points=x[6], evidence_filename=x[7]))
    if db.query(Team).count() == 0:
        teams = [
          ("MDN-01","Night Shift","ROOM A",["Aarav","Meera","Kabir"]),
          ("MDN-02","Signal Lost","ROOM A",["Riya","Dev","Nikhil"]),
          ("MDN-03","Dead Frequency","ROOM A",["Anaya","Ishaan","Tara"]),
          ("MDN-11","Waveform","ROOM B",["Vihaan","Sara","Arjun"]),
          ("MDN-12","Redline","ROOM B",["Aditi","Kunal","Neel"]),
          ("MDN-21","The Operators","ROOM C",["Rohan","Ira","Mihir"]),
          ("MDN-31","Zero Signal","ROOM D",["Zoya","Om","Reyansh"]),
        ]
        for tid,name,room,members in teams:
            db.add(Team(team_id=tid,password_hash=hash_password("deadair123"),name=name,room=room,members=json.dumps(members)))
    db.commit()
seed(Session := __import__("sqlalchemy").orm.Session(engine))

def auth(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "): raise HTTPException(401, "Authentication required")
    try: return decode_token(authorization[7:])
    except Exception: raise HTTPException(401, "Invalid or expired token")

def require_team(payload=Depends(auth)):
    if payload.get("role") != "team": raise HTTPException(403, "Team access required")
    return int(payload["sub"])

def require_admin(payload=Depends(auth)):
    if payload.get("role") != "admin": raise HTTPException(403, "Admin access required")
    return payload

def timer_state(event: Event):
    if not event or not event.started_at:
        return {"status": event.status if event else "not_started", "remaining_seconds": event.duration_seconds if event else 3600}
    elapsed = int((datetime.now(timezone.utc).replace(tzinfo=None) - event.started_at).total_seconds())
    remaining = max(0, event.duration_seconds - elapsed)
    status = event.status
    if remaining == 0: status = "ended"
    return {"status": status, "remaining_seconds": remaining}

@app.get("/api/health")
def health(): return {"ok": True, "service": "dead-air"}

@app.post("/api/auth/team")
def team_login(data: LoginIn, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.team_id == data.team_id).first()
    if not team or not verify_password(data.password, team.password_hash): raise HTTPException(401,"Invalid team ID or password")
    if team.session_token: raise HTTPException(409,"This team account is already logged in on another session")
    token = make_token(team.id, "team")
    team.session_token = token
    db.commit()
    return {"token":token,"role":"team","team":{"id":team.team_id,"name":team.name,"room":team.room,"members":json.loads(team.members)}}

@app.post("/api/auth/team/logout")
def team_logout(team_id=Depends(require_team), db: Session=Depends(get_db)):
    team=db.get(Team,team_id)
    if team: team.session_token=None; db.commit()
    return {"ok":True}

@app.post("/api/auth/admin")
def admin_login(data: AdminLoginIn, db: Session=Depends(get_db)):
    admin=db.query(Admin).filter(Admin.username==data.username).first()
    if not admin or not verify_password(data.password,admin.password_hash): raise HTTPException(401,"Invalid admin credentials")
    return {"token":make_token(admin.id,"admin"),"role":"admin"}

@app.get("/api/team/dashboard")
def dashboard(team_id=Depends(require_team), db:Session=Depends(get_db)):
    team=db.get(Team,team_id); event=db.query(Event).first()
    challenges=db.query(Challenge).all()
    unlocks={u.challenge_id for u in db.query(Unlock).filter(Unlock.team_id==team_id).all()}
    attempts=db.query(Attempt).filter(Attempt.team_id==team_id).count()
    echo=db.query(EchoMessage).filter(EchoMessage.team_id==team_id, EchoMessage.role=="user").count()
    return {"team":{"team_id":team.team_id,"name":team.name,"room":team.room,"members":json.loads(team.members),"score":team.score,"submitted":team.submitted},
            "timer":timer_state(event),"challenges":[{"id":c.id,"slug":c.slug,"code":c.code,"name":c.name,"type":c.challenge_type,"prompt":c.prompt,"points":c.points,"enabled":c.enabled,"solved":c.id in unlocks} for c in challenges],
            "attempts":attempts,"echo_used":echo}

@app.get("/api/challenges")
def challenges(team_id=Depends(require_team), db:Session=Depends(get_db)):
    unlocks={u.challenge_id for u in db.query(Unlock).filter(Unlock.team_id==team_id).all()}
    return [{"id":c.id,"slug":c.slug,"code":c.code,"name":c.name,"type":c.challenge_type,"prompt":c.prompt,"points":c.points,"enabled":c.enabled,"solved":c.id in unlocks} for c in db.query(Challenge).all()]

@app.post("/api/challenges/{slug}/submit")
def challenge_submit(slug:str,data:AnswerIn,team_id=Depends(require_team),db:Session=Depends(get_db)):
    team=db.get(Team,team_id); c=db.query(Challenge).filter(Challenge.slug==slug).first()
    if not c or not c.enabled: raise HTTPException(404,"Challenge unavailable")
    if team.submitted: raise HTTPException(409,"Round 1 is locked")
    already=db.query(Unlock).filter(Unlock.team_id==team_id,Unlock.challenge_id==c.id).first()
    if already: return {"correct":True,"already_unlocked":True,"points":0}
    correct=data.answer.strip().lower()==c.answer.strip().lower()
    db.add(Attempt(team_id=team_id,challenge_id=c.id,answer=data.answer,correct=correct))
    if correct:
        db.add(Unlock(team_id=team_id,challenge_id=c.id)); team.score += c.points
    db.commit()
    return {"correct":correct,"points":c.points if correct else 0,"evidence_unlocked":correct,"file":c.evidence_filename if correct else None}

@app.get("/api/evidence")
def evidence(team_id=Depends(require_team),db:Session=Depends(get_db)):
    unlocked={u.challenge_id for u in db.query(Unlock).filter(Unlock.team_id==team_id).all()}
    return [{"name":c.evidence_filename,"challenge":c.name,"unlocked":c.id in unlocked} for c in db.query(Challenge).all()]+[{"name":"Final Broadcast Script.pdf","challenge":"Finale evidence","unlocked":False}]

@app.post("/api/echo")
def echo(data:EchoIn,team_id=Depends(require_team),db:Session=Depends(get_db)):
    used=db.query(EchoMessage).filter(EchoMessage.team_id==team_id,EchoMessage.role=="user").count()
    if used>=5: raise HTTPException(429,"ECHO prompt limit reached")
    db.add(EchoMessage(team_id=team_id,role="user",content=data.message))
    # Safe local fallback. Replace with an AI provider call server-side.
    reply="I can help interpret the Dead Air evidence, but I will not reveal the final answer. Cross-check the Production Log timestamps with the Frequency Analysis and the unlocked evidence."
    db.add(EchoMessage(team_id=team_id,role="assistant",content=reply)); db.commit()
    history=db.query(EchoMessage).filter(EchoMessage.team_id==team_id).order_by(EchoMessage.id).all()
    return {"reply":reply,"used":used+1,"remaining":4-used,"history":[{"role":m.role,"content":m.content} for m in history]}

@app.get("/api/timeline")
def timeline(team_id=Depends(require_team)):
    return {"activated":True,"timestamps":["23:38","23:41","23:42","23:47"],"events":["","","",""]}

@app.post("/api/timeline")
def submit_timeline(data:TimelineIn,team_id=Depends(require_team),db:Session=Depends(get_db)):
    if len(data.events)!=4: raise HTTPException(400,"Four timeline entries required")
    # Production: compare against securely stored answer and award points.
    return {"correct":False,"message":"Timeline received. Configure the authoritative event sequence in the backend before the live event."}

@app.post("/api/submission")
def submit_submission(data:SubmissionIn,team_id=Depends(require_team),db:Session=Depends(get_db)):
    team=db.get(Team,team_id)
    if team.submitted: raise HTTPException(409,"Round 1 already submitted")
    if db.query(Submission).filter(Submission.team_id==team_id).first(): raise HTTPException(409,"Duplicate submission")
    db.add(Submission(team_id=team_id,happened=data.happened,involved=data.involved,timeline=data.timeline,evidence=data.evidence,explanation=data.explanation))
    team.submitted=True; db.commit()
    return {"ok":True,"locked":True}

@app.get("/api/admin/overview")
def admin_overview(_=Depends(require_admin),db:Session=Depends(get_db)):
    teams=db.query(Team).all(); event=db.query(Event).first()
    return {"timer":timer_state(event),"teams":len(teams),"active":sum(t.status=="active" and not t.submitted for t in teams),"submissions":sum(t.submitted for t in teams),"files_unlocked":db.query(Unlock).count(),"avg_score":round(sum(t.score for t in teams)/len(teams)) if teams else 0}

@app.get("/api/admin/teams")
def admin_teams(room:str="ALL",_=Depends(require_admin),db:Session=Depends(get_db)):
    q=db.query(Team)
    if room!="ALL": q=q.filter(Team.room==room)
    out=[]
    for t in q.order_by(desc(Team.score)).all():
        unlocked=db.query(Unlock).filter(Unlock.team_id==t.id).count()
        challenges=db.query(Attempt).filter(Attempt.team_id==t.id,Attempt.correct==True).count()
        echo=db.query(EchoMessage).filter(EchoMessage.team_id==t.id,EchoMessage.role=="user").count()
        out.append({"team_id":t.team_id,"name":t.name,"room":t.room,"members":json.loads(t.members),"status":"Submitted" if t.submitted else "In Progress","score":t.score,"challenges":challenges,"files":unlocked,"echo_used":echo})
    return out

@app.post("/api/admin/event/{action}")
def event_action(action:str,_=Depends(require_admin),db:Session=Depends(get_db)):
    event=db.query(Event).first()
    if action=="start":
        if not event.started_at: event.started_at=datetime.utcnow()
        event.status="running"
    elif action=="pause": event.status="paused"
    elif action=="resume": event.status="running"
    elif action=="end": event.status="ended"
    else: raise HTTPException(400,"Unknown action")
    db.commit(); return timer_state(event)

@app.post("/api/admin/challenges/{slug}/{action}")
def challenge_action(slug:str,action:str,_=Depends(require_admin),db:Session=Depends(get_db)):
    c=db.query(Challenge).filter(Challenge.slug==slug).first()
    if not c: raise HTTPException(404,"Challenge not found")
    if action=="unlock" or action=="enable": c.enabled=True
    elif action=="lock" or action=="disable": c.enabled=False
    else: raise HTTPException(400,"Unknown action")
    db.commit(); return {"ok":True,"enabled":c.enabled}

@app.post("/api/admin/teams/{team_id}/score")
def adjust_score(team_id:str,delta:int,_=Depends(require_admin),db:Session=Depends(get_db)):
    t=db.query(Team).filter(Team.team_id==team_id).first()
    if not t: raise HTTPException(404,"Team not found")
    t.score=max(0,t.score+delta); db.commit(); return {"team_id":t.team_id,"score":t.score}

@app.get("/api/admin/leaderboard")
def leaderboard(_=Depends(require_admin),db:Session=Depends(get_db)):
    return [{"rank":i+1,"team_id":t.team_id,"name":t.name,"room":t.room,"score":t.score} for i,t in enumerate(db.query(Team).order_by(desc(Team.score),Team.id).all())]

@app.post("/api/admin/finale/{team_id}")
def finale_score(team_id:str,score:int,_=Depends(require_admin),db:Session=Depends(get_db)):
    t=db.query(Team).filter(Team.team_id==team_id).first()
    if not t: raise HTTPException(404,"Team not found")
    row=db.query(FinaleScore).filter(FinaleScore.team_id==t.id).first()
    if not row: row=FinaleScore(team_id=t.id,score=score); db.add(row)
    else: row.score=score; row.updated_at=datetime.utcnow()
    t.score += score; db.commit(); return {"ok":True,"score":score}

@app.post("/api/admin/evidence/upload")
def upload_evidence(file:UploadFile=File(...),_=Depends(require_admin)):
    dest=EVIDENCE / Path(file.filename).name
    with dest.open("wb") as f: shutil.copyfileobj(file.file,f)
    return {"ok":True,"filename":dest.name}

app.mount("/evidence", StaticFiles(directory=str(EVIDENCE)), name="evidence")
