# Multi-stage Dockerfile for SwimSync
# Stage 1: Build frontend (use Debian-based for native module compatibility)
FROM node:20-slim AS frontend-builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/
COPY script/ ./script/
COPY vite.config.ts tsconfig.json tailwind.config.ts postcss.config.js components.json ./

# Build frontend and backend bundle
RUN npm run build

# Stage 2: Production runtime
FROM node:20-slim AS production

WORKDIR /app

# Install Python and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi>=0.127.0 \
    uvicorn>=0.40.0 \
    sqlalchemy>=2.0.45 \
    psycopg2-binary>=2.9.11 \
    httpx>=0.28.1 \
    python-dotenv>=1.2.1 \
    python-multipart>=0.0.21 \
    itsdangerous>=2.2.0 \
    openai>=2.14.0

# Copy Python backend
COPY python_backend/ ./python_backend/
COPY run_backend.py ./

# Copy built frontend and Node.js server from builder
COPY --from=frontend-builder /app/dist ./dist/
COPY package*.json ./

# Install only production Node.js dependencies
RUN npm ci --only=production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Expose the port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start command: Python backend + Node.js proxy
CMD ["sh", "-c", "python run_backend.py & node dist/index.cjs"]
