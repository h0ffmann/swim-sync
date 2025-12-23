from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# === User Schemas ===
class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None

    class Config:
        from_attributes = True


# === Activity Schemas ===
class ActivityCreate(BaseModel):
    type: str  # 'pool' or 'open_water'
    date: datetime
    duration: int  # seconds
    distance: int  # meters
    stroke: str
    pool_length: Optional[int] = None
    pace: Optional[float] = None
    heart_rate_avg: Optional[int] = None
    notes: Optional[str] = None


class ActivityResponse(BaseModel):
    id: int
    user_id: str
    type: str
    date: datetime
    duration: int
    distance: int
    stroke: str
    pool_length: Optional[int] = None
    pace: Optional[float] = None
    heart_rate_avg: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# === Goal Schemas ===
class GoalCreate(BaseModel):
    type: str
    target: int
    deadline: Optional[datetime] = None


class GoalResponse(BaseModel):
    id: int
    user_id: str
    type: str
    target: int
    deadline: Optional[datetime] = None
    is_completed: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# === Personal Record Schemas ===
class PersonalRecordResponse(BaseModel):
    id: int
    user_id: str
    distance: int
    stroke: str
    time: int
    date: datetime
    activity_id: Optional[int] = None

    class Config:
        from_attributes = True


# === Chat Schemas ===
class ConversationCreate(BaseModel):
    title: str = "New Chat"


class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str


# === CSV Import ===
class CSVImportRequest(BaseModel):
    csvContent: str


class CSVImportResponse(BaseModel):
    message: str
    activities: List[ActivityResponse]
