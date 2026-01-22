# Hackathon Voting App

A real-time voting system for hackathon judging, enabling live vote tracking, team presentations, and dynamic leaderboards.

## Overview

This application streamlines the judging process at hackathons by providing:

- **Real-time leaderboard** with live vote tracking and rankings
- **Team presentation management** with synchronized timer
- **Concurrent voting** by multiple judges
- **Personal rankings and notes** per voter
- **Admin controls** for voting phases and presentation flow

### Target Users

- **Judges/Voters** - Submit votes, track rankings, take private notes
- **Organizers/Admins** - Manage teams, control voting windows, run presentations
- **Event hosts** - Monitor live leaderboard during presentations

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite 5, TailwindCSS, Zustand, React Query v5 |
| **Backend** | Node.js 20+, Express.js 4, TypeScript 5 (strict) |
| **Database** | PostgreSQL (with Azure support) |
| **Real-time** | Socket.io 4 |
| **Auth** | JWT with refresh tokens, bcrypt password hashing |
| **Validation** | Zod (shared schemas) |

## Project Structure

```
voting/
├── packages/
│   ├── server/          # Express API + Socket.io server
│   │   └── src/
│   │       ├── core/    # Database, middleware, migrations
│   │       └── modules/ # Feature modules (auth, teams, voting, etc.)
│   ├── client/          # React frontend
│   │   └── src/
│   │       └── components/
│   └── shared/          # Shared types, constants, validation
├── docs/                # Documentation
└── package.json         # Monorepo workspace config
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL database
- npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd voting

# Install all dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
DB_SSL=true                    # Enable for Azure/production
DB_POOL_MIN=2
DB_POOL_MAX=10

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# Client
CLIENT_URL=http://localhost:5173
```

### Run Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or run separately:
npm run dev:server    # Backend on port 3000
npm run dev:client    # Frontend on port 5173
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status
```

## Features

### Authentication

- User registration with strong password requirements
- JWT-based auth with access + refresh tokens
- Role-based access control (admin/voter)
- Password change with verification

### Team Management

- CRUD operations (admin only)
- Member assignment (3-6 members enforced)
- Presentation order tracking

### Voting System

- One final vote per user (enforced at database level)
- Self-vote prevention (database trigger)
- Private notes and rankings per team
- Vote export (JSON/CSV)
- Admin-controlled voting windows

### Real-time Updates

- Live leaderboard rankings
- Vote submission broadcasts
- Presentation status updates
- Synchronized presentation timer

### Leaderboard

- Real-time rankings with tie handling (DENSE_RANK)
- Vote count aggregation
- Team statistics

## API Reference

Base URL: `/api/v1/`

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create new user |
| `/auth/login` | POST | Authenticate user |
| `/auth/logout` | POST | Invalidate session |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/me` | GET | Get current user |
| `/auth/password` | PUT | Change password |

### Teams

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/teams` | GET | List all teams |
| `/teams/:id` | GET | Get team details |
| `/teams/:id/members` | GET | Get team with members |
| `/teams` | POST | Create team (admin) |
| `/teams/:id` | PATCH | Update team (admin) |
| `/teams/:id` | DELETE | Delete team (admin) |

### Voting

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/votes` | POST | Submit vote |
| `/votes/me` | GET | Get user's votes |
| `/votes/rankings` | GET | Get user's rankings |
| `/votes/notes/export` | GET | Export notes (JSON/CSV) |
| `/votes/notes` | PUT | Update private note |
| `/votes/status` | GET | Check if voting is open |
| `/votes/admin/toggle` | POST | Toggle voting (admin) |

### Leaderboard

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/leaderboard` | GET | Get current rankings |
| `/leaderboard/stats` | GET | Get statistics |
| `/leaderboard/:teamId` | GET | Get team's entry |

### Timer

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/timer` | GET | Get timer state |
| `/timer/start` | POST | Start timer (admin) |
| `/timer/pause` | POST | Pause timer (admin) |
| `/timer/resume` | POST | Resume timer (admin) |
| `/timer/reset` | POST | Reset timer (admin) |

## Database Schema

### Core Tables

- **users** - User accounts with roles (admin/voter)
- **teams** - Hackathon teams with presentation order
- **votes** - Vote submissions with final vote tracking
- **private_notes** - Personal notes and rankings per team
- **presentations** - Presentation queue and status
- **timer_state** - Global presentation timer
- **voting_settings** - Voting configuration

### Key Constraints

- One final vote per user (unique index)
- Self-vote prevention (database trigger)
- Team assignment locked after final vote
- One private note per user-team combination

## Security

### Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5 req/15 min |
| Voting | 10 req/min |
| Password change | 5 req/hour |
| General | 100 req/15 min |

### Security Headers

- HSTS (HTTP Strict Transport Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Content Security Policy

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Socket.io Events

### Server to Client

| Event | Description |
|-------|-------------|
| `leaderboard:update` | Rankings updated |
| `vote:submitted` | New vote submitted |
| `presentation:update` | Presentation status changed |
| `timer:update` | Timer state changed |
| `timer:expired` | Timer finished |

### Client to Server

| Event | Description |
|-------|-------------|
| `leaderboard:subscribe` | Subscribe to updates |
| `leaderboard:vote` | Submit vote |
| `timer:start/pause/resume/reset` | Timer controls |

## Scripts

```bash
npm run dev           # Start all dev servers
npm run build         # Build all packages
npm run typecheck     # TypeScript type checking
npm run lint          # Lint all packages
npm run test          # Run tests (watch mode)
npm run test:unit     # Run tests once
npm run db:migrate    # Run database migrations
npm start             # Start production server
```

## Contributing

1. Create a feature branch from `main`
2. Make focused changes in your assigned modules
3. Run `npm run typecheck` before committing
4. Use conventional commit messages (`feat:`, `fix:`, `chore:`)
5. Submit a pull request

## License

MIT
