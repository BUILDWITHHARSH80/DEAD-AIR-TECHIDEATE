
from pydantic import BaseModel, Field
from typing import List, Optional


class LoginIn(BaseModel):
    team_id: str
    password: str


class AdminLoginIn(BaseModel):
    username: str
    password: str


class AnswerIn(BaseModel):
    answer: str


class EchoIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class SubmissionIn(BaseModel):
    broadcast_schedule: str = Field(min_length=1, max_length=6000)
    truth_theory: str = Field(min_length=1, max_length=6000)


class AccuracyIn(BaseModel):
    score: int = Field(..., ge=0, le=100)
