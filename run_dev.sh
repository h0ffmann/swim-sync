#!/bin/bash
# Start both Python backend and Node.js frontend in parallel

# Start Python backend in background
python run_backend.py &
PYTHON_PID=$!

# Wait for Python to start
sleep 2

# Start Node.js frontend
npm run dev

# Cleanup on exit
trap "kill $PYTHON_PID 2>/dev/null" EXIT
