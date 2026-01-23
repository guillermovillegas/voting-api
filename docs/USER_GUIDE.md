# Hackathon Voting App - User Guide

A real-time voting system for hackathon presentations with live leaderboard updates.

## Quick Start

### 1. Start the Server

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:password@host:5432/database"
export DB_SSL=true
export PORT=3000

# Start server
npm run dev:server
```

Server runs at `http://localhost:3000`

### 2. Join (Simple - Recommended for Training)

The easiest way to get started - no password required:

```bash
curl -X POST http://localhost:3000/api/v1/auth/join \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe"
    },
    "message": "Welcome! Store your user ID to stay logged in."
  }
}
```

**Important:** Save the `user.id` - you'll use it as the `X-User-Id` header for all requests:

```bash
curl http://localhost:3000/api/v1/teams \
  -H "X-User-Id: 550e8400-e29b-41d4-a716-446655440000"
```

### 2b. Register (Full Account - Optional)

For production use with email/password:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### 3. Login (For Email/Password Users)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

Response includes `accessToken` - use this for authenticated requests:
```bash
Authorization: Bearer <your-access-token>
```

**Note:** If you used `/auth/join`, use the `X-User-Id` header instead.

---

## For Voters

### View Teams

```bash
curl http://localhost:3000/api/v1/teams \
  -H "Authorization: Bearer <token>"
```

### Submit a Vote

```bash
curl -X POST http://localhost:3000/api/v1/votes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "<team-uuid>",
    "isFinalVote": true,
    "publicNote": "Great presentation!"
  }'
```

**Rules:**
- You can only submit ONE final vote
- You cannot vote for your own team
- Non-final votes can be changed

### View Your Votes

```bash
curl http://localhost:3000/api/v1/votes/me \
  -H "Authorization: Bearer <token>"
```

### Save Private Notes

Keep personal notes about teams (only you can see these):

```bash
curl -X PUT http://localhost:3000/api/v1/votes/notes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "<team-uuid>",
    "note": "Good technical demo, creative UI",
    "ranking": 8
  }'
```

### Export Your Rankings

**JSON format:**
```bash
curl http://localhost:3000/api/v1/votes/notes/export \
  -H "Authorization: Bearer <token>"
```

**CSV format:**
```bash
curl "http://localhost:3000/api/v1/votes/notes/export?format=csv" \
  -H "Authorization: Bearer <token>"
```

### View Leaderboard

```bash
curl http://localhost:3000/api/v1/leaderboard
```

---

## Managing the Event

### Create a Team

```bash
curl -X POST http://localhost:3000/api/v1/teams \
  -H "X-User-Id: <your-user-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Alpha",
    "description": "Building an AI assistant"
  }'
```

### Add Members to Team

```bash
curl -X POST http://localhost:3000/api/v1/teams/<team-id>/members \
  -H "X-User-Id: <your-user-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "memberIds": ["<user-id-1>", "<user-id-2>"]
  }'
```

### Initialize Presentation Queue

Randomly orders teams for presentations:

```bash
curl -X POST http://localhost:3000/api/v1/presentations/initialize \
  -H "X-User-Id: <your-user-id>"
```

### Control Presentations

**Start a presentation:**
```bash
curl -X POST http://localhost:3000/api/v1/presentations/<presentation-id>/start \
  -H "X-User-Id: <your-user-id>"
```

**Move to next presentation:**
```bash
curl -X POST http://localhost:3000/api/v1/presentations/next \
  -H "X-User-Id: <your-user-id>"
```

### Control Timer

**Start timer:**
```bash
curl -X POST http://localhost:3000/api/v1/timer/start \
  -H "X-User-Id: <your-user-id>" \
  -H "Content-Type: application/json" \
  -d '{"presentationId": "<presentation-id>"}'
```

**Pause timer:**
```bash
curl -X POST http://localhost:3000/api/v1/timer/pause \
  -H "X-User-Id: <your-user-id>"
```

**Set timer duration (in seconds):**
```bash
curl -X PUT http://localhost:3000/api/v1/timer/duration \
  -H "X-User-Id: <your-user-id>" \
  -H "Content-Type: application/json" \
  -d '{"durationSeconds": 300}'
```

### Toggle Voting

Open or close voting:

```bash
curl -X POST http://localhost:3000/api/v1/votes/toggle \
  -H "X-User-Id: <your-user-id>"
```

### View Statistics

```bash
curl http://localhost:3000/api/v1/admin/stats \
  -H "X-User-Id: <your-user-id>"
```

### Export All Votes

```bash
curl http://localhost:3000/api/v1/admin/votes/export \
  -H "X-User-Id: <your-user-id>"
```

---

## API Documentation

Interactive API docs available at:
```
http://localhost:3000/api/docs
```

## Health Check

```bash
curl http://localhost:3000/health
```

---

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing or invalid auth | Include X-User-Id header or Bearer token |
| 422 Already voted | Already submitted final vote | Final votes cannot be changed |
| 422 Cannot vote for self | Trying to vote for own team | Vote for a different team |
| 429 Too Many Requests | Rate limited | Wait and retry |

---

## Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| Auth (login/register) | 5 requests / 15 minutes |
| Voting | 10 requests / minute |
| General | 100 requests / 15 minutes |
| Admin (destructive) | 5 requests / hour |
