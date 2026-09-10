
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

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
    room = Column(String, index=True, nullable=False)
    members = Column(Text, default="[]")
    status = Column(String, index=True, default="active")
    score = Column(Integer, index=True, default=0)
    session_token = Column(String, nullable=True)
    submitted = Column(Boolean, index=True, default=False)
    created_at = Column(DateTime, default=utc_now)

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
    enabled = Column(Boolean, index=True, default=True)
    evidence_filename = Column(String, nullable=True)

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True, nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), index=True, nullable=False)
    answer = Column(Text)
    correct = Column(Boolean, index=True, default=False)
    created_at = Column(DateTime, default=utc_now)
    team = relationship("Team")
    challenge = relationship("Challenge")

    __table_args__ = (
        Index("ix_attempts_team_challenge", "team_id", "challenge_id"),
        Index("ix_attempts_team_correct", "team_id", "correct"),
    )

class Unlock(Base):
    __tablename__ = "unlocks"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True, nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), index=True, nullable=False)
    unlocked_at = Column(DateTime, default=utc_now)
    __table_args__ = (
        UniqueConstraint("team_id", "challenge_id", name="uq_team_challenge_unlock"),
        Index("ix_unlocks_team_challenge", "team_id", "challenge_id"),
    )

class EchoMessage(Base):
    __tablename__ = "echo_messages"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), index=True, nullable=False)
    role = Column(String, index=True) # user/assistant
    content = Column(Text)
    created_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        Index("ix_echo_team_role", "team_id", "role"),
    )

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, index=True, nullable=False)
    happened = Column(Text)
    involved = Column(Text)
    timeline = Column(Text)
    evidence = Column(Text)
    explanation = Column(Text)
    submitted_at = Column(DateTime, default=utc_now)

class FinaleScore(Base):
    __tablename__ = "finale_scores"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, index=True, nullable=False)
    score = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utc_now)

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)

