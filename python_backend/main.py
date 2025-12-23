import os
import httpx
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse, StreamingResponse, FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc
from dotenv import load_dotenv
from openai import OpenAI
from typing import List
from pathlib import Path

from .database import engine, get_db, Base
from .models import User, Activity, PersonalRecord, Goal, Conversation, Message
from .schemas import (
    UserResponse, ActivityCreate, ActivityResponse, GoalCreate, GoalResponse,
    PersonalRecordResponse, ConversationCreate, ConversationResponse,
    MessageResponse, SendMessageRequest, CSVImportRequest, CSVImportResponse
)
from .auth import (
    get_current_user_id, get_optional_user_id, create_session_cookie,
    upsert_user, get_login_url, exchange_code_for_tokens, get_user_info,
    GOOGLE_CLIENT_ID
)
from .csv_parser import parse_garmin_csv

load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Train Notes API")

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent
DIST_DIR = PROJECT_ROOT / "dist" / "public"

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI client for AI coach
openai_client = OpenAI(
    api_key=os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY", ""),
    base_url=os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL"),
)


# === Auth Routes ===
@app.get("/api/login")
async def login(request: Request):
    """Redirect to Google OAuth login."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500, 
            detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    auth_url = await get_login_url(request)
    return RedirectResponse(url=auth_url)


@app.get("/api/auth/callback")
async def auth_callback(
    request: Request, 
    code: str = None, 
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback."""
    if error:
        return RedirectResponse(url=f"/?error={error}")
    
    if not code or not state:
        return RedirectResponse(url="/?error=missing_params")
    
    try:
        # Exchange code for tokens
        tokens = await exchange_code_for_tokens(code, state, request)
        access_token = tokens.get("access_token")
        
        # Get user info from Google
        user_info = await get_user_info(access_token)
        
        # Upsert user in database
        user = await upsert_user(db, user_info)
        
        # Create session cookie
        session_cookie = create_session_cookie(user.id)
        
        # Determine if we're on HTTPS (production)
        is_secure = request.headers.get("x-forwarded-proto", "http") == "https"
        
        response = RedirectResponse(url="/dashboard")
        response.set_cookie(
            key="session",
            value=session_cookie,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=7 * 24 * 60 * 60,  # 1 week
        )
        
        return response
    except HTTPException as e:
        return RedirectResponse(url=f"/?error={e.detail}")
    except Exception as e:
        return RedirectResponse(url=f"/?error=auth_failed")


@app.get("/api/logout")
async def logout(request: Request):
    """Log out and clear session."""
    response = RedirectResponse(url="/")
    response.delete_cookie("session")
    return response


@app.get("/api/auth/user", response_model=UserResponse)
async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get current authenticated user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# === Activity Routes ===
@app.get("/api/activities", response_model=List[ActivityResponse])
async def list_activities(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all activities for current user."""
    activities = db.query(Activity).filter(
        Activity.user_id == user_id
    ).order_by(desc(Activity.date)).all()
    return activities


@app.get("/api/activities/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get a specific activity."""
    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.user_id == user_id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return activity


@app.post("/api/activities", response_model=ActivityResponse, status_code=201)
async def create_activity(
    activity_data: ActivityCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new activity."""
    activity = Activity(
        user_id=user_id,
        **activity_data.model_dump()
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@app.delete("/api/activities/{activity_id}", status_code=204)
async def delete_activity(
    activity_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete an activity."""
    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.user_id == user_id
    ).first()
    
    if activity:
        db.delete(activity)
        db.commit()
    
    return None


# === CSV Import Route ===
@app.post("/api/import/csv", response_model=CSVImportResponse, status_code=201)
async def import_csv(
    request: CSVImportRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Import activities from Garmin CSV."""
    activities_data = parse_garmin_csv(request.csvContent, user_id)
    
    if not activities_data:
        raise HTTPException(status_code=400, detail="No valid activities found in CSV")
    
    created_activities = []
    for activity_data in activities_data:
        activity = Activity(
            user_id=user_id,
            **activity_data.model_dump()
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        created_activities.append(activity)
    
    return CSVImportResponse(
        message=f"Successfully imported {len(created_activities)} activities",
        activities=created_activities
    )


# === Personal Records Routes ===
@app.get("/api/personal-records", response_model=List[PersonalRecordResponse])
async def list_personal_records(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all personal records for current user."""
    records = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id
    ).all()
    return records


# === Goals Routes ===
@app.get("/api/goals", response_model=List[GoalResponse])
async def list_goals(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all goals for current user."""
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    return goals


@app.post("/api/goals", response_model=GoalResponse, status_code=201)
async def create_goal(
    goal_data: GoalCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new goal."""
    goal = Goal(
        user_id=user_id,
        **goal_data.model_dump()
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


# === Chat/Coach Routes ===
@app.get("/api/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all conversations."""
    conversations = db.query(Conversation).order_by(desc(Conversation.created_at)).all()
    return conversations


@app.post("/api/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    data: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new conversation."""
    conversation = Conversation(title=data.title)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get a conversation with messages."""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/api/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a conversation."""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        db.query(Message).filter(Message.conversation_id == conversation_id).delete()
        db.delete(conversation)
        db.commit()
    return None


@app.post("/api/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    message_data: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Send a message and get AI response (streaming)."""
    # Save user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=message_data.content
    )
    db.add(user_message)
    db.commit()
    
    # Get conversation history
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()
    
    chat_messages = [
        {"role": m.role, "content": m.content}
        for m in messages
    ]
    
    # System prompt for swim coach
    system_prompt = """You are an expert swimming coach AI assistant. You help swimmers:
- Analyze their training data and progress
- Provide personalized workout recommendations
- Offer technique tips and feedback
- Help set and track goals
- Provide motivation and recovery advice
Be encouraging, knowledgeable, and specific in your advice."""
    
    async def generate():
        try:
            stream = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    *chat_messages
                ],
                stream=True,
                max_tokens=2048,
            )
            
            full_response = ""
            for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                if content:
                    full_response += content
                    yield f"data: {JSONResponse({'content': content}).body.decode()}\n\n"
            
            # Save assistant message
            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response
            )
            db.add(assistant_message)
            db.commit()
            
            yield f"data: {JSONResponse({'done': True}).body.decode()}\n\n"
        except Exception as e:
            yield f"data: {JSONResponse({'error': str(e)}).body.decode()}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# Serve static files in production
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA for all non-API routes."""
        # Don't serve for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Serve index.html for SPA routes
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file, media_type="text/html")
        
        raise HTTPException(status_code=404, detail="Not found")
