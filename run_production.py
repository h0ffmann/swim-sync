#!/usr/bin/env python3
"""Run the FastAPI backend server for production on port 5000."""
import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(
        "python_backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        workers=1,
    )
