# Local Development Guide

This guide explains how to run SwimSync locally outside of Replit.

## Prerequisites

- **Node.js** 20.x or higher
- **Python** 3.11 or higher
- **PostgreSQL** 14.x or higher
- **pnpm** or **npm** package manager

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/swimsync.git
cd swimsync
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies using uv (recommended):
uv sync

# Or using pip with pyproject.toml:
pip install -e .

# Or install manually:
pip install fastapi uvicorn sqlalchemy psycopg2-binary httpx python-dotenv python-multipart itsdangerous openai
```

### 3. Set Up PostgreSQL

Create a new PostgreSQL database:

```bash
createdb swimsync
```

Or using psql:

```sql
CREATE DATABASE swimsync;
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/swimsync

# Authentication (Google OAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=your-random-session-secret

# Optional: AI Features
OPENAI_API_KEY=your-openai-api-key
```

#### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google+ API
4. Go to Credentials > Create Credentials > OAuth Client ID
5. Select "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/callback` (local development)
7. Add authorized JavaScript origins:
   - `http://localhost:5000`
8. Copy the Client ID and Client Secret

### 5. Initialize Database

The database tables are created automatically when the FastAPI backend starts.

## Running the Application

### Option 1: Development Mode (Recommended)

This runs both the frontend (with hot reload) and the backend:

```bash
# Terminal 1: Start the Python backend
python run_backend.py

# Terminal 2: Start the Node.js server with frontend
npm run dev
```

The application will be available at `http://localhost:5000`

### Option 2: Using the Combined Script

```bash
./run_dev.sh
```

### Option 3: Running Components Separately

```bash
# Start Python backend only
cd python_backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start frontend only (in another terminal)
npm run dev
```

## Project Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema changes to database |

## Development Workflow

### Frontend Development

Frontend code is in `client/src/`. Changes are hot-reloaded automatically.

Key directories:
- `components/` - Reusable UI components
- `pages/` - Route pages
- `hooks/` - Custom React hooks for data fetching
- `lib/` - Utility functions

### Backend Development

Backend code is in `python_backend/`. The FastAPI server auto-reloads on file changes.

Key files:
- `main.py` - API routes
- `models.py` - SQLAlchemy models
- `schemas.py` - Pydantic request/response schemas
- `auth.py` - Google OAuth implementation

### Database Changes

1. Modify models in `python_backend/models.py`
2. The changes will be reflected on restart (SQLAlchemy auto-creates tables)

For the TypeScript schema (used by frontend):
1. Modify `shared/schema.ts`
2. Run `npm run db:push` to update the database

## Testing

### Manual Testing

1. Start the application
2. Navigate to `http://localhost:5000`
3. Log in with Google
4. Test features: activities, CSV import, analytics, AI coach

### API Testing

Use curl or a tool like Postman:

```bash
# Check API health
curl http://localhost:5000/api/health

# Get current user (requires auth cookie)
curl http://localhost:5000/api/auth/user -c cookies.txt -b cookies.txt
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Database Connection Issues

1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
3. Test connection: `psql $DATABASE_URL`

### OAuth Redirect Errors

- Ensure redirect URI exactly matches what's in Google Cloud Console
- Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set correctly
- Verify the SESSION_SECRET is set

### Python Dependencies

If you encounter import errors:

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary httpx python-dotenv itsdangerous
```

## Architecture Notes

- **Express Proxy**: In development, Express (port 5000) proxies `/api/*` to FastAPI (port 8000)
- **Static Files**: In production, Express serves the built frontend from `dist/public/`
- **Authentication**: Uses Google OAuth with PKCE flow; sessions stored in PostgreSQL
- **Database**: SQLAlchemy ORM with PostgreSQL; auto-creates tables on startup
