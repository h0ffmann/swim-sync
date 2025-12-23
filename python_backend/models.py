from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Session(Base):
    __tablename__ = "sessions"

    sid = Column(String, primary_key=True)
    sess = Column(JSON, nullable=False)
    expire = Column(DateTime, nullable=False)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'pool' or 'open_water'
    date = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False)  # seconds
    distance = Column(Integer, nullable=False)  # meters
    stroke = Column(String, nullable=False)  # freestyle, breaststroke, etc.
    pool_length = Column(Integer, nullable=True)  # meters, null for open water
    pace = Column(Float, nullable=True)  # seconds per 100m
    heart_rate_avg = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())


class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    distance = Column(Integer, nullable=False)
    stroke = Column(String, nullable=False)
    time = Column(Integer, nullable=False)  # seconds
    date = Column(DateTime, nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'distance_weekly', 'time_target', etc.
    target = Column(Integer, nullable=False)
    deadline = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
