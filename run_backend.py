#!/usr/bin/env python3
"""Run the FastAPI backend server."""
import os
import uvicorn

if __name__ == "__main__":
    # Check if running in production
    # In production, we'll disable reload to avoid crashes
    # NODE_ENV or REPLIT_DEPLOYMENT will be set by Replit
    is_production = os.environ.get("NODE_ENV") == "production" or os.environ.get("REPLIT_DEPLOYMENT") is not None
    
    print(f"Starting Python backend (production={is_production})...")
    print(f"Working directory: {os.getcwd()}")
    print(f"NODE_ENV: {os.environ.get('NODE_ENV', 'not set')}")
    print(f"REPLIT_DEPLOYMENT: {os.environ.get('REPLIT_DEPLOYMENT', 'not set')}")
    
    uvicorn.run(
        "python_backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Always disable reload to avoid crashes
        log_level="info",
    )
