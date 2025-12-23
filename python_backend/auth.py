import os
import httpx
from fastapi import Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from itsdangerous import URLSafeSerializer
from .database import get_db
from .models import User
from datetime import datetime

# OIDC Configuration for Replit
ISSUER_URL = os.environ.get("ISSUER_URL", "https://replit.com/oidc")
REPL_ID = os.environ.get("REPL_ID", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-key")

serializer = URLSafeSerializer(SESSION_SECRET)


async def get_oidc_config():
    """Fetch OpenID Connect discovery document."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{ISSUER_URL}/.well-known/openid-configuration")
        return response.json()


def get_current_user_id(request: Request) -> str:
    """Extract user ID from session cookie."""
    session_cookie = request.cookies.get("session")
    if not session_cookie:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user_data = serializer.loads(session_cookie)
        return user_data.get("user_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")


def get_optional_user_id(request: Request) -> str | None:
    """Extract user ID from session cookie, or None if not authenticated."""
    session_cookie = request.cookies.get("session")
    if not session_cookie:
        return None
    
    try:
        user_data = serializer.loads(session_cookie)
        return user_data.get("user_id")
    except Exception:
        return None


async def upsert_user(db: Session, user_info: dict) -> User:
    """Create or update user from OIDC claims."""
    user_id = user_info.get("sub")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user:
        user.email = user_info.get("email")
        user.first_name = user_info.get("first_name")
        user.last_name = user_info.get("last_name")
        user.profile_image_url = user_info.get("profile_image_url")
        user.updated_at = datetime.utcnow()
    else:
        user = User(
            id=user_id,
            email=user_info.get("email"),
            first_name=user_info.get("first_name"),
            last_name=user_info.get("last_name"),
            profile_image_url=user_info.get("profile_image_url"),
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    return user


def create_session_cookie(user_id: str) -> str:
    """Create a signed session cookie."""
    return serializer.dumps({"user_id": user_id})
