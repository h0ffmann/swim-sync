# SwimSync - Swimming Training Application

A comprehensive swimming training application inspired by Strava, designed specifically for competitive swimmers and open water enthusiasts. Features activity tracking, advanced analytics, personal record management, goal setting, and AI-powered coaching insights.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TanStack React Query** for server state management
- **Tailwind CSS** with shadcn/ui components
- **Wouter** for lightweight routing
- **Recharts** for data visualization

### Backend
- **FastAPI** (Python) - Primary API server
- **Express.js** (Node.js) - Development proxy and static file serving
- **SQLAlchemy** ORM with PostgreSQL
- **Google OAuth 2.0** with PKCE for authentication

### Infrastructure
- **PostgreSQL** database
- **OpenAI API** for AI coaching features

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Express Proxy   │────▶│  FastAPI        │
│   (Port 5000)   │     │  (Port 5000)     │     │  (Port 8000)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   PostgreSQL    │
                                                 └─────────────────┘
```

- **Frontend**: React SPA served via Vite (development) or Express (production)
- **Express Proxy**: Routes `/api/*` requests to FastAPI backend
- **FastAPI Backend**: Handles all API logic, authentication, and database operations
- **PostgreSQL**: Stores user data, activities, goals, and session information

## Features

- **Activity Tracking**: Log swimming workouts with detailed metrics (distance, time, pace, strokes)
- **CSV Import**: Import activities from Garmin Connect exports
- **Analytics Dashboard**: Visualize training progress with charts and statistics
- **Personal Records**: Track and celebrate your best performances
- **Goal Setting**: Set and monitor swimming goals
- **AI Swim Coach**: Get personalized training insights powered by OpenAI

## Project Structure

```
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components (shadcn/ui based)
│       ├── hooks/          # React Query hooks
│       ├── pages/          # Page components
│       └── lib/            # Utilities
├── python_backend/         # FastAPI backend
│   ├── main.py             # API routes
│   ├── auth.py             # Google OAuth implementation
│   ├── models.py           # SQLAlchemy models
│   ├── schemas.py          # Pydantic schemas
│   ├── csv_parser.py       # Garmin CSV parser
│   └── database.py         # Database connection
├── server/                 # Express.js proxy server
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # Proxy configuration
│   └── static.ts           # Static file serving
├── shared/                 # Shared types and schemas
│   ├── schema.ts           # Drizzle table definitions
│   └── routes.ts           # API contract definitions
└── dist/                   # Production build output
```

## Environment Variables

### Required Secrets
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SESSION_SECRET` | Session cookie signing key |

### Optional (AI Features)
| Variable | Description |
|----------|-------------|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key for AI coach |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI API base URL |

## Quick Start (Replit)

1. Fork this project on Replit
2. Add required secrets in the Secrets tab
3. Configure Google OAuth redirect URIs in Google Cloud Console
4. Click Run

## Local Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed local setup instructions.

## Deployment

See [.github/workflows/deploy.yml](.github/workflows/deploy.yml) for CI/CD pipeline configuration.

### Google Cloud Platform (Cloud Run)

The included GitHub Actions workflow automatically deploys to GCP Cloud Run on push to `main`.

Required GitHub Secrets:
- `GCP_PROJECT_ID` - Your GCP project ID
- `GCP_SA_KEY` - Service account JSON key with Cloud Run permissions
- `GCP_REGION` - Deployment region (e.g., `us-central1`)

## API Endpoints

### Authentication
- `GET /api/login` - Initiate Google OAuth login
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/user` - Get current user info
- `GET /api/logout` - End session

### Activities
- `GET /api/activities` - List user activities
- `POST /api/activities` - Create activity
- `GET /api/activities/:id` - Get activity details
- `DELETE /api/activities/:id` - Delete activity
- `POST /api/import/csv` - Import from Garmin CSV

### Personal Records
- `GET /api/personal-records` - List personal records

### Goals
- `GET /api/goals` - List user goals
- `POST /api/goals` - Create goal

### AI Coach (Conversations)
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Send message to AI coach

### System
- `GET /api/health` - Health check endpoint

## License

MIT
