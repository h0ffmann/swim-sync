#!/usr/bin/env python3
"""Run the FastAPI backend server."""
import os
import uvicorn

if __name__ == "__main__":
    is_production = os.environ.get("NODE_ENV") == "production"
    
    print(f"Starting Python backend (production={is_production})...")
    print(f"Working directory: {os.getcwd()}")
    
    uvicorn.run(
        "python_backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=not is_production,
        log_level="info",
    )
