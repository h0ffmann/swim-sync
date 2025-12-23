# SwimSync - Swimming Training Application

## Overview

SwimSync is a comprehensive swimming training application inspired by Strava, designed specifically for competitive swimmers and open water enthusiasts. The application provides activity tracking, advanced analytics, personal record management, goal setting, and AI-powered coaching insights.

The project uses a hybrid architecture with a React/TypeScript frontend served by an Express.js development server, while the core API logic runs on a FastAPI Python backend. Data persistence is handled through PostgreSQL with Drizzle ORM for schema management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite

### Backend Architecture
- **Primary API**: FastAPI (Python) running on port 8000
- **Development Proxy**: Express.js (TypeScript) on port 5000 that proxies to Python backend
- **Authentication**: Google OAuth with PKCE flow, session-based auth stored in PostgreSQL
- **AI Integration**: OpenAI API for the AI coaching feature

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM for TypeScript schema definitions
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Schema Location**: `shared/schema.ts` with models in `shared/models/`

### Key Design Patterns
1. **Shared Schema**: Database schemas defined in `shared/` directory are used by both frontend (for type safety) and backend
2. **API Routes Contract**: `shared/routes.ts` defines typed API contracts with Zod validation
3. **Hybrid Backend**: Express handles static files and proxies API calls to FastAPI, allowing Python for ML/data processing
4. **Replit Integrations**: Modular integration patterns in `server/replit_integrations/` for auth, chat, CSV import, batch processing, and image generation

### Application Structure
```
client/src/          # React frontend
  ├── components/    # UI components (shadcn/ui based)
  ├── hooks/         # React Query hooks for data fetching
  ├── pages/         # Page components
  └── lib/           # Utilities and query client

server/              # Express.js server (dev proxy)
  ├── replit_integrations/  # Modular feature integrations
  └── routes.ts      # Proxy configuration to Python backend

python_backend/      # FastAPI backend
  ├── main.py        # FastAPI app and routes
  ├── models.py      # SQLAlchemy models
  ├── schemas.py     # Pydantic schemas
  └── auth.py        # Google OAuth implementation

shared/              # Shared types and schemas
  ├── schema.ts      # Drizzle table definitions
  ├── routes.ts      # API contract definitions
  └── models/        # Auth and chat models
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations via `npm run db:push`

### Authentication
- **Google OAuth**: Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Session Secret**: `SESSION_SECRET` for cookie signing

### AI Services
- **OpenAI API**: Via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- Used for AI swim coach chat feature and image generation

### Third-Party Libraries
- **Frontend**: Radix UI primitives, Recharts, date-fns, Lucide icons
- **Backend (Python)**: FastAPI, SQLAlchemy, Pydantic, httpx, uvicorn
- **Backend (Node)**: Express, http-proxy-middleware, passport

### Development Tools
- **Vite**: Development server with HMR
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner