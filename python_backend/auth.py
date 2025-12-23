import os
import secrets
import hashlib
import base64
import httpx
from fastapi import Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from itsdangerous import URLSafeSerializer
from urllib.parse import urlencode
from .database import get_db
from .models import User
from datetime import datetime

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET)

# In-memory store for PKCE state (in production, use Redis or similar)
oauth_state_store: dict = {}


async def get_google_config():
    """Fetch Google's OpenID Connect discovery document."""
    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_DISCOVERY_URL)
        return response.json()


def generate_pkce_pair():
    """Generate PKCE code verifier and challenge."""
    verifier = secrets.token_urlsafe(32)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).decode().rstrip("=")
    return verifier, challenge


def get_redirect_uri(request: Request) -> str:
    """Build the OAuth callback URL based on the request."""
    # Check for x-forwarded-host first (set by Express proxy), then fall back to host
    x_forwarded_host = request.headers.get("x-forwarded-host")
    host = x_forwarded_host or request.headers.get("host", "localhost:5000")
    # Check for forwarded proto (from proxy) or use request scheme
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    redirect_uri = f"{scheme}://{host}/api/auth/callback"
    print(f"[auth] get_redirect_uri: x-forwarded-host={x_forwarded_host}, host={request.headers.get('host')}, final={redirect_uri}")
    return redirect_uri


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
    """Create or update user from Google claims."""
    # Use Google's 'sub' as user ID, prefixed to avoid conflicts
    google_sub = user_info.get("sub")
    user_id = f"google:{google_sub}"
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user:
        user.email = user_info.get("email")
        user.first_name = user_info.get("given_name")
        user.last_name = user_info.get("family_name")
        user.profile_image_url = user_info.get("picture")
        user.updated_at = datetime.utcnow()
    else:
        user = User(
            id=user_id,
            email=user_info.get("email"),
            first_name=user_info.get("given_name"),
            last_name=user_info.get("family_name"),
            profile_image_url=user_info.get("picture"),
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    return user


def create_session_cookie(user_id: str) -> str:
    """Create a signed session cookie."""
    return serializer.dumps({"user_id": user_id})


async def get_login_url(request: Request) -> str:
    """Generate Google OAuth login URL with PKCE."""
    config = await get_google_config()
    auth_endpoint = config["authorization_endpoint"]
    
    # Generate state and PKCE
    state = secrets.token_urlsafe(32)
    verifier, challenge = generate_pkce_pair()
    
    # Store state and verifier for callback verification
    oauth_state_store[state] = {
        "verifier": verifier,
        "created_at": datetime.utcnow().timestamp()
    }
    
    # Clean old states (older than 10 minutes)
    current_time = datetime.utcnow().timestamp()
    expired_states = [s for s, d in oauth_state_store.items() 
                      if current_time - d["created_at"] > 600]
    for s in expired_states:
        del oauth_state_store[s]
    
    redirect_uri = get_redirect_uri(request)
    print(f"[auth] Login: redirect_uri={redirect_uri}, host={request.headers.get('host')}, x-forwarded-proto={request.headers.get('x-forwarded-proto')}")
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "select_account",
    }
    
    return f"{auth_endpoint}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str, state: str, request: Request) -> dict:
    """Exchange authorization code for tokens."""
    if state not in oauth_state_store:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    
    state_data = oauth_state_store.pop(state)
    verifier = state_data["verifier"]
    
    config = await get_google_config()
    token_endpoint = config["token_endpoint"]
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_endpoint,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "code_verifier": verifier,
                "grant_type": "authorization_code",
                "redirect_uri": get_redirect_uri(request),
            },
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code")
        
        return response.json()


async def get_user_info(access_token: str) -> dict:
    """Fetch user info from Google."""
    config = await get_google_config()
    userinfo_endpoint = config["userinfo_endpoint"]
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        return response.json()
