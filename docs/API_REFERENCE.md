# API Reference

Base URL: `http://localhost:3000/api/v1`

## Authentication

All endpoints except `/health` and `/leaderboard` require authentication.

Include the token in the `Authorization` header:
```
Authorization: Bearer <access-token>
```

---

## Auth Endpoints

### POST /auth/register
Create a new user account.

**Request Body:**
```json
{
  "username": "string (required)",
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, 8+ chars with uppercase, lowercase, number, special char)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "string", "name": "string", "role": "voter" },
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 604800
  }
}
```

### POST /auth/login
Authenticate and get tokens.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:** `200 OK` - Same as register

### POST /auth/token
Exchange credentials for tokens.

**Request Body (Password):**
```json
{
  "grantType": "password",
  "email": "string",
  "password": "string"
}
```

**Request Body (Refresh):**
```json
{
  "grantType": "refresh_token",
  "refreshToken": "string"
}
```

### GET /auth/me
Get current user profile.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "role": "admin|voter",
    "teamId": "uuid|null"
  }
}
```

### PUT /auth/password
Change password.

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

---

## Teams Endpoints

### GET /teams
List all teams.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string|null",
      "hasPresented": false,
      "presentationOrder": 1
    }
  ]
}
```

### GET /teams/:teamId
Get team by ID.

### GET /teams/:teamId/members
Get team with member details.

### POST /teams (Admin)
Create a team.

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

### PATCH /teams/:teamId (Admin)
Update a team.

### DELETE /teams/:teamId (Admin)
Delete a team.

### POST /teams/:teamId/members (Admin)
Add members to team.

**Request Body:**
```json
{
  "memberIds": ["uuid", "uuid"]
}
```

### DELETE /teams/:teamId/members (Admin)
Remove members from team.

---

## Voting Endpoints

### POST /votes
Submit a vote.

**Request Body:**
```json
{
  "teamId": "uuid (required)",
  "isFinalVote": "boolean (required)",
  "publicNote": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "vote": {
      "id": "uuid",
      "userId": "uuid",
      "teamId": "uuid",
      "isFinalVote": true,
      "publicNote": "string",
      "submittedAt": "datetime"
    },
    "isNew": true
  }
}
```

### GET /votes/me
Get your submitted votes.

**Response:**
```json
{
  "success": true,
  "data": {
    "votes": [{
      "vote_id": "uuid",
      "team_id": "uuid",
      "team_name": "string",
      "is_final_vote": true,
      "public_note": "string",
      "submitted_at": "datetime"
    }],
    "finalVote": { ... },
    "hasVoted": true
  }
}
```

### GET /votes/rankings
Get your rankings and notes.

### GET /votes/notes/export
Export your notes.

**Query Params:**
- `format`: `json` (default) or `csv`

### PUT /votes/notes
Update a private note.

**Request Body:**
```json
{
  "teamId": "uuid",
  "note": "string",
  "ranking": "number (1-10)"
}
```

### GET /votes/teams/:teamId/count
Get vote count for a team.

### GET /votes/status
Get voting open/closed status.

### POST /votes/admin/toggle (Admin)
Toggle voting on/off.

---

## Leaderboard Endpoints

### GET /leaderboard
Get current rankings (public).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "teamId": "uuid",
      "teamName": "string",
      "voteCount": 5,
      "rank": 1
    }
  ]
}
```

### GET /leaderboard/stats
Get leaderboard statistics.

### GET /leaderboard/:teamId
Get a specific team's entry.

---

## Presentations Endpoints

### GET /presentations
List all presentations.

### GET /presentations/current
Get current presentation.

### GET /presentations/upcoming
Get upcoming presentations.

### GET /presentations/completed
Get completed presentations.

### GET /presentations/status
Get queue status.

### POST /presentations/initialize (Admin)
Initialize presentation queue (randomizes order).

### POST /presentations/:id/start (Admin)
Start a presentation.

### POST /presentations/next (Admin)
Advance to next presentation.

### POST /presentations/reset (Admin)
Reset the queue.

---

## Timer Endpoints

### GET /timer
Get current timer state.

**Response:**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "durationSeconds": 300,
    "elapsedSeconds": 45,
    "startedAt": "datetime",
    "presentationId": "uuid"
  }
}
```

### GET /timer/remaining
Get remaining time in seconds.

### POST /timer/start (Admin)
Start timer.

**Request Body:**
```json
{
  "presentationId": "uuid"
}
```

### POST /timer/pause (Admin)
Pause timer.

### POST /timer/reset (Admin)
Reset timer.

### PUT /timer/duration (Admin)
Set timer duration.

**Request Body:**
```json
{
  "durationSeconds": 300
}
```

---

## Admin Endpoints

### GET /admin/stats
System statistics.

### GET /admin/users
List all users.

### GET /admin/teams
List all teams with details.

### GET /admin/votes
List all votes (transparency).

### GET /admin/votes/statistics
Vote statistics.

### GET /admin/votes/export
Export all votes (CSV/JSON).

### POST /admin/reset
Reset entire system (destructive).

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400,
  "timestamp": "datetime"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| ALREADY_VOTED | 422 | Already submitted final vote |
| SELF_VOTE | 422 | Cannot vote for own team |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_SERVER_ERROR | 500 | Server error |
