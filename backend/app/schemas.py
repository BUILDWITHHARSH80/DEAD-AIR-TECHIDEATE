
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

class TimelineIn(BaseModel):
    events: List[str]

class SubmissionIn(BaseModel):
    happened: str
    involved: str
    timeline: str
    evidence: str
    explanation: str
