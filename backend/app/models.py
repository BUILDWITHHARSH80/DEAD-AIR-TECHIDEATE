
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    name = Column(String, default="DEAD AIR")
    status = Column(String, default="not_started")  # not_started/running/paused/ended
    started_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=3600)

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    team_id = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    room = Column(String, nullable=False)
    members = Column(Text, default="[]")
    status = Column(String, default="active")
    score = Column(Integer, default=0)
    session_token = Column(String, nullable=True)
    submitted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Challenge(Base):
    __tablename__ = "challenges"
    id = Column(Integer, primary_key=True)
    slug = Column(String, unique=True, index=True)
    code = Column(String)
    name = Column(String)
    challenge_type = Column(String)
    prompt = Column(Text)
    answer = Column(String)
    points = Column(Integer, default=100)
    enabled = Column(Boolean, default=True)
    evidence_filename = Column(String, nullable=True)

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    answer = Column(Text)
    correct = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    team = relationship("Team")
    challenge = relationship("Challenge")

class Unlock(Base):
    __tablename__ = "unlocks"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("team_id", "challenge_id", name="uq_team_challenge_unlock"),)

class EchoMessage(Base):
    __tablename__ = "echo_messages"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    role = Column(String) # user/assistant
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    happened = Column(Text)
    involved = Column(Text)
    timeline = Column(Text)
    evidence = Column(Text)
    explanation = Column(Text)
    submitted_at = Column(DateTime, default=datetime.utcnow)

class FinaleScore(Base):
    __tablename__ = "finale_scores"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    score = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password_hash = Column(String)
