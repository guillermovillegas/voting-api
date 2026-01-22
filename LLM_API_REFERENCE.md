# Hackathon Voting API - LLM Reference

This document provides complete API specifications for LLM-assisted integration with the Hackathon Voting API.

---

## Live Deployment

```
API_URL: https://voting-api-lcvw.onrender.com
WEBSOCKET_URL: wss://voting-api-lcvw.onrender.com
HEALTH_CHECK: https://voting-api-lcvw.onrender.com/health
API_DOCS: https://voting-api-lcvw.onrender.com/api/docs
```

### Quick Start Examples

**Health Check:**
```bash
curl https://voting-api-lcvw.onrender.com/health
```
Response:
```json
{"success":true,"data":{"status":"ok","timestamp":"2026-01-22T08:49:58.732Z"},"timestamp":"2026-01-22T08:49:58.732Z"}
```

**Register User:**
```bash
curl -X POST https://voting-api-lcvw.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass1#","name":"User Name"}'
```

**Login:**
```bash
curl -X POST https://voting-api-lcvw.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass1#"}'
```

**Authenticated Request:**
```bash
curl https://voting-api-lcvw.onrender.com/api/v1/teams \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get Leaderboard (No Auth Required):**
```bash
curl https://voting-api-lcvw.onrender.com/api/v1/leaderboard
```

---

## Base Configuration

```
BASE_URL: https://voting-api-lcvw.onrender.com/api/v1
CONTENT_TYPE: application/json
AUTHENTICATION: Bearer Token (JWT)
```

---

## Authentication

### Token Usage

All authenticated endpoints require the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### JWT Payload Structure

```json
{
  "userId": "uuid",
  "email": "string",
  "role": "admin | voter",
  "iat": "number (unix timestamp)",
  "exp": "number (unix timestamp)"
}
```

### Token Lifetimes

- Access Token: 7 days (604800 seconds)
- Refresh Token: 30 days

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": "<T>",
  "timestamp": "ISO 8601 string"
}
```

### Error Response (RFC 9457)

```json
{
  "success": false,
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "type": "https://api.voting.app/errors/{code_lowercase}",
  "status": 400,
  "detail": "Additional details (optional)",
  "instance": "Request path (optional)",
  "timestamp": "ISO 8601 string"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions (not admin) |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate email) |
| `UNPROCESSABLE_ENTITY` | 422 | Business rule violation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Voting | 10 requests | 1 minute |
| Password Change | 5 requests | 1 hour |
| General | 100 requests | 15 minutes |
| Admin | 200 requests | 15 minutes |

Rate limit headers returned: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

**Rate Limit Response (429):**
```json
{
  "success": false,
  "error": "Too many authentication attempts, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429,
  "timestamp": "2026-01-22T08:52:02.845Z"
}
```

**Important:** Authentication endpoints are strictly limited to 5 requests per 15 minutes. Store tokens and reuse them rather than re-authenticating frequently.

---

## Data Types

### User

```typescript
{
  id: string           // UUID
  email: string        // Email format
  name: string         // 2-100 characters
  role: "admin" | "voter"
  teamId: string | null  // UUID or null
  createdAt: string    // ISO 8601
}
```

### Team

```typescript
{
  id: string              // UUID
  name: string            // 2-100 characters, unique
  presentationOrder: number | null  // Positive integer
  hasPresented: boolean
  createdAt: string       // ISO 8601
}
```

### Vote

```typescript
{
  id: string           // UUID
  userId: string       // UUID
  teamId: string       // UUID
  isFinalVote: boolean
  publicNote: string | null  // Max 500 characters
  submittedAt: string  // ISO 8601
}
```

### PrivateNote

```typescript
{
  id: string        // UUID
  userId: string    // UUID
  teamId: string    // UUID
  note: string      // Max 1000 characters
  ranking: number   // 1-100
  updatedAt: string // ISO 8601
}
```

### Presentation

```typescript
{
  id: string                    // UUID
  teamId: string                // UUID
  status: "upcoming" | "current" | "completed"
  startedAt: string | null      // ISO 8601
  completedAt: string | null    // ISO 8601
}
```

### LeaderboardEntry

```typescript
{
  teamId: string      // UUID
  teamName: string
  voteCount: number
  rank: number        // DENSE_RANK (ties share rank)
  hasPresented: boolean
}
```

### TimerState

```typescript
{
  isActive: boolean
  durationSeconds: number       // Default 300 (5 minutes)
  startedAt: string | null      // ISO 8601
  pausedAt: string | null       // ISO 8601
  elapsedSeconds: number
  currentPresentationId: string | null  // UUID
}
```

---

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "name": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "voter",
      "teamId": null,
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 400: Invalid email format, password too weak
- 409: Email already registered

---

### POST /auth/login

Authenticate user and receive tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "voter",
      "teamId": null,
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 401: Invalid email or password

---

### POST /auth/token

Token exchange endpoint (OAuth2-style).

**Password Grant Request:**

```json
{
  "grantType": "password",
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Refresh Token Grant Request:**

```json
{
  "grantType": "refresh_token",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /auth/refresh

Refresh access token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 401: Invalid or expired refresh token

---

### POST /auth/logout

Invalidate current session.

**Headers:** `Authorization: Bearer <token>` required

**Request:** No body

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out."
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /auth/me

Get current authenticated user.

**Headers:** `Authorization: Bearer <token>` required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "voter",
    "teamId": null,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### PUT /auth/password

Change user password.

**Headers:** `Authorization: Bearer <token>` required

**Request:**

```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewSecure2@"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully."
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 401: Current password incorrect
- 400: New password doesn't meet requirements

---

## Teams Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### GET /teams

List all teams.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Team Alpha",
      "presentationOrder": 1,
      "hasPresented": false,
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /teams/:teamId

Get team by ID.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": 1,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 404: Team not found

---

### GET /teams/:teamId/members

Get team with member list.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": 1,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "members": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "member@example.com",
        "name": "Team Member",
        "role": "voter",
        "teamId": "550e8400-e29b-41d4-a716-446655440001",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /teams

Create new team. **Admin only.**

**Request:**

```json
{
  "name": "Team Alpha",
  "memberIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**Constraints:**
- `name`: 2-100 characters, unique
- `memberIds`: Optional, 3-6 UUIDs

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": null,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 403: Not admin
- 409: Team name already exists

---

### PATCH /teams/:teamId

Update team. **Admin only.**

**Path Parameters:**
- `teamId` (string, UUID, required)

**Request (all fields optional):**

```json
{
  "name": "Team Alpha Updated",
  "presentationOrder": 2,
  "hasPresented": true
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha Updated",
    "presentationOrder": 2,
    "hasPresented": true,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### DELETE /teams/:teamId

Delete team. **Admin only.**

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response:** 204 No Content

---

### POST /teams/:teamId/members

Add members to team. **Admin only.**

**Path Parameters:**
- `teamId` (string, UUID, required)

**Request:**

```json
{
  "memberIds": [
    "550e8400-e29b-41d4-a716-446655440004"
  ]
}
```

**Constraints:**
- Team must have 3-6 members after addition

**Response (200):** Team with updated members list

---

### DELETE /teams/:teamId/members

Remove members from team. **Admin only.**

**Path Parameters:**
- `teamId` (string, UUID, required)

**Request:**

```json
{
  "memberIds": [
    "550e8400-e29b-41d4-a716-446655440004"
  ]
}
```

**Constraints:**
- Team must retain 3-6 members after removal

**Response (200):** Team with updated members list

---

### GET /teams/user/:userId

Get team for specific user.

**Path Parameters:**
- `userId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": 1,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Returns `null` in data if user not assigned to team.

---

## Voting Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### POST /votes

Submit vote for a team.

**Request:**

```json
{
  "teamId": "550e8400-e29b-41d4-a716-446655440001",
  "isFinalVote": true,
  "publicNote": "Great presentation!"
}
```

**Constraints:**
- `teamId`: UUID, required
- `isFinalVote`: boolean, required
- `publicNote`: string, max 500 chars, optional
- Cannot vote for own team (enforced by database)
- Only one final vote allowed per user
- Team must have presented (if setting enforced)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "vote": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "isFinalVote": true,
      "publicNote": "Great presentation!",
      "submittedAt": "2024-01-20T10:30:00.000Z"
    },
    "isNew": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 400: Voting is closed
- 404: Team not found
- 422: Already submitted final vote, self-vote attempted, team hasn't presented

---

### GET /votes/me

Get current user's votes.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "votes": [
      {
        "vote_id": "550e8400-e29b-41d4-a716-446655440010",
        "team_id": "550e8400-e29b-41d4-a716-446655440001",
        "team_name": "Team Alpha",
        "is_final_vote": true,
        "public_note": "Great presentation!",
        "submitted_at": "2024-01-20T10:30:00.000Z"
      }
    ],
    "finalVote": {
      "vote_id": "550e8400-e29b-41d4-a716-446655440010",
      "team_id": "550e8400-e29b-41d4-a716-446655440001",
      "team_name": "Team Alpha",
      "is_final_vote": true,
      "public_note": "Great presentation!",
      "submitted_at": "2024-01-20T10:30:00.000Z"
    },
    "hasVoted": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /votes/rankings

Get user's rankings and notes.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "teamId": "550e8400-e29b-41d4-a716-446655440001",
        "teamName": "Team Alpha",
        "ranking": 1,
        "note": "Excellent technical demo",
        "hasVoted": true
      },
      {
        "teamId": "550e8400-e29b-41d4-a716-446655440002",
        "teamName": "Team Beta",
        "ranking": 2,
        "note": "Good concept",
        "hasVoted": false
      }
    ],
    "finalVoteTeamId": "550e8400-e29b-41d4-a716-446655440001"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Note: Only returns teams that have presented.

---

### PUT /votes/notes

Update private note for a team.

**Request:**

```json
{
  "teamId": "550e8400-e29b-41d4-a716-446655440001",
  "note": "Excellent technical implementation",
  "ranking": 1
}
```

**Constraints:**
- `teamId`: UUID, required
- `note`: string, max 1000 chars, required
- `ranking`: integer 1-100, required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "teamId": "550e8400-e29b-41d4-a716-446655440001",
    "note": "Excellent technical implementation",
    "ranking": 1,
    "updatedAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /votes/notes/export

Export notes as JSON or CSV.

**Query Parameters:**
- `format`: "json" | "csv" (default: "json")

**Response (200) - JSON:**

```json
[
  {
    "team_name": "Team Alpha",
    "ranking": 1,
    "note": "Excellent technical implementation",
    "is_final_vote": true,
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
]
```

**Response (200) - CSV:**

```
Rank,Team,Note,Is Final Vote,Last Updated
1,"Team Alpha","Excellent technical implementation",Yes,2024-01-20T10:30:00Z
```

Headers for CSV:
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="my-rankings.csv"`

---

### GET /votes/teams/:teamId/count

Get vote count for specific team.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "teamId": "550e8400-e29b-41d4-a716-446655440001",
    "count": 15
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Note: Counts final votes only.

---

### GET /votes/status

Check if voting is open.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "isOpen": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /votes/admin/toggle

Toggle voting open/closed. **Admin only.**

**Request:** No body

**Response (200):**

```json
{
  "success": true,
  "data": {
    "isOpen": false
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

## Leaderboard Endpoints

No authentication required for leaderboard endpoints.

### GET /leaderboard

Get current rankings.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "teamName": "Team Alpha",
      "voteCount": "15",
      "rank": "1",
      "hasPresented": true
    },
    {
      "teamId": "550e8400-e29b-41d4-a716-446655440002",
      "teamName": "Team Beta",
      "voteCount": "15",
      "rank": "1",
      "hasPresented": true
    },
    {
      "teamId": "550e8400-e29b-41d4-a716-446655440003",
      "teamName": "Team Gamma",
      "voteCount": "12",
      "rank": "2",
      "hasPresented": true
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Note:** `voteCount` and `rank` are returned as strings. Parse to integers if needed. Uses DENSE_RANK - ties share the same rank.

---

### GET /leaderboard/stats

Get leaderboard statistics.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalTeams": 10,
    "totalVotes": 45,
    "teamsPresented": 8,
    "topTeam": {
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "teamName": "Team Alpha",
      "voteCount": "15",
      "rank": "1",
      "hasPresented": true
    }
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /leaderboard/:teamId

Get specific team's leaderboard entry.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "teamId": "550e8400-e29b-41d4-a716-446655440001",
    "teamName": "Team Alpha",
    "voteCount": "15",
    "rank": "1",
    "hasPresented": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 404: Team not found

---

## Presentations Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### GET /presentations

List all presentations.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "status": "completed",
      "startedAt": "2024-01-20T10:00:00.000Z",
      "completedAt": "2024-01-20T10:05:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440031",
      "teamId": "550e8400-e29b-41d4-a716-446655440002",
      "status": "current",
      "startedAt": "2024-01-20T10:05:00.000Z",
      "completedAt": null
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /presentations/current

Get current presentation.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440031",
    "teamId": "550e8400-e29b-41d4-a716-446655440002",
    "status": "current",
    "startedAt": "2024-01-20T10:05:00.000Z",
    "completedAt": null
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Returns `null` in data if no current presentation.

---

### GET /presentations/upcoming

Get upcoming presentations.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440032",
      "teamId": "550e8400-e29b-41d4-a716-446655440003",
      "status": "upcoming",
      "startedAt": null,
      "completedAt": null
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /presentations/completed

Get completed presentations.

**Response (200):** Array of completed presentations

---

### GET /presentations/status

Get full queue status.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "current": {
      "id": "550e8400-e29b-41d4-a716-446655440031",
      "teamId": "550e8400-e29b-41d4-a716-446655440002",
      "status": "current",
      "startedAt": "2024-01-20T10:05:00.000Z",
      "completedAt": null
    },
    "upcoming": [...],
    "completed": [...]
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /presentations/:id

Get presentation by ID.

**Path Parameters:**
- `id` (string, UUID, required)

**Response (200):** Single presentation object

---

### POST /presentations/initialize

Initialize presentation queue. **Admin only.**

Creates presentation entries for all teams in random order.

**Request:** No body

**Response (201):** Array of created presentations

---

### POST /presentations/:id/start

Start a presentation. **Admin only.**

**Path Parameters:**
- `id` (string, UUID, required)

**Response (200):** Updated presentation with status "current"

---

### POST /presentations/next

Advance to next presentation. **Admin only.**

Marks current as completed, starts next in queue.

**Request:** No body

**Response (200):** New current presentation

---

### POST /presentations/reset

Reset presentation queue. **Admin only.**

Deletes all presentations.

**Request:** No body

**Response (200):** Empty data

---

## Timer Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### GET /timer

Get current timer state.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "isActive": true,
    "durationSeconds": 300,
    "startedAt": "2024-01-20T10:05:00.000Z",
    "pausedAt": null,
    "elapsedSeconds": 120,
    "currentPresentationId": "550e8400-e29b-41d4-a716-446655440031"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /timer/start

Start timer. **Admin only.**

**Request (optional):**

```json
{
  "durationSeconds": 300,
  "presentationId": "550e8400-e29b-41d4-a716-446655440031"
}
```

**Response (200):** Updated timer state

---

### POST /timer/pause

Pause timer. **Admin only.**

**Request:** No body

**Response (200):** Updated timer state with `pausedAt` set

---

### POST /timer/resume

Resume paused timer. **Admin only.**

**Request:** No body

**Response (200):** Updated timer state with `pausedAt` cleared

---

### POST /timer/reset

Reset timer. **Admin only.**

**Request:** No body

**Response (200):** Reset timer state

---

## Socket.IO Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('https://voting-api-lcvw.onrender.com', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### Leaderboard Events

**Subscribe:**
```javascript
socket.emit('leaderboard:subscribe');
```

**Receive updates:**
```javascript
socket.on('leaderboard:update', (entries: LeaderboardEntry[]) => {});
socket.on('leaderboard:team:update', (data: { teamId: string, entry: LeaderboardEntry | null }) => {});
socket.on('leaderboard:error', (data: { message: string }) => {});
```

**Request current state:**
```javascript
socket.emit('leaderboard:request');
```

**Unsubscribe:**
```javascript
socket.emit('leaderboard:unsubscribe');
```

---

### Presentation Events

**Subscribe:**
```javascript
socket.emit('presentation:subscribe');
```

**Receive updates:**
```javascript
socket.on('presentation:queue:updated', (status: QueueStatus) => {});
socket.on('presentation:started', (presentation: Presentation) => {});
socket.on('presentation:completed', (presentation: Presentation) => {});
socket.on('presentation:update', (presentation: Presentation) => {});
socket.on('presentation:error', (data: { message: string }) => {});
```

**Request current state:**
```javascript
socket.emit('presentation:request');
```

---

### Timer Events

**Subscribe:**
```javascript
socket.emit('timer:subscribe');
```

**Receive updates:**
```javascript
socket.on('timer:update', (state: TimerState) => {});
socket.on('timer:started', (state: TimerState) => {});
socket.on('timer:paused', (state: TimerState) => {});
socket.on('timer:expired', () => {});
socket.on('timer:reset', (state: TimerState) => {});
socket.on('timer:error', (data: { message: string }) => {});
```

**Request current state:**
```javascript
socket.emit('timer:request');
```

---

### Vote Events

**Receive updates:**
```javascript
socket.on('vote:submitted', (vote: Vote) => {});
socket.on('vote:count:update', (data: { teamId: string, count: number }) => {});
```

---

## Common Workflows

### 1. User Registration and Login

```
1. POST /auth/register → Get tokens
2. Store accessToken and refreshToken
3. Use accessToken in Authorization header for all requests
4. When accessToken expires, POST /auth/refresh with refreshToken
```

### 2. Voting Flow

```
1. GET /teams → List available teams
2. GET /presentations/completed → See which teams have presented
3. PUT /votes/notes → Save notes and rankings for teams
4. POST /votes → Submit final vote (isFinalVote: true)
5. GET /votes/me → Confirm vote was recorded
```

### 3. Admin: Running Presentations

```
1. POST /presentations/initialize → Create queue
2. POST /presentations/:id/start → Start first presentation
3. POST /timer/start → Start countdown timer
4. POST /timer/pause/resume → Control timer as needed
5. POST /presentations/next → Move to next team
6. Repeat steps 3-5 for each team
```

### 4. Real-time Updates

```
1. Connect to Socket.IO
2. Emit 'leaderboard:subscribe'
3. Emit 'presentation:subscribe'
4. Emit 'timer:subscribe'
5. Listen for update events
6. Update UI accordingly
```

---

## Business Rules

1. **One Final Vote**: Each user can submit exactly one final vote
2. **No Self-Voting**: Database trigger prevents voting for own team
3. **Presentation Required**: Teams must present before receiving votes (configurable)
4. **Team Size**: 3-6 members per team enforced
5. **Team Lock**: Users cannot change teams after submitting final vote
6. **Voting Window**: Admin controls when voting is open/closed

---

## Verified Endpoints (Tested 2026-01-22)

All endpoints below have been tested against the live deployment:

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/health` | GET | No | ✅ Verified |
| `/api/v1/auth/register` | POST | No | ✅ Verified |
| `/api/v1/auth/login` | POST | No | ✅ Verified |
| `/api/v1/auth/me` | GET | Yes | ✅ Verified |
| `/api/v1/auth/refresh` | POST | No | ✅ Verified |
| `/api/v1/teams` | GET | Yes | ✅ Verified |
| `/api/v1/teams/:id` | GET | Yes | ✅ Verified |
| `/api/v1/teams/:id/members` | GET | Yes | ✅ Verified |
| `/api/v1/votes` | POST | Yes | ✅ Verified |
| `/api/v1/votes/me` | GET | Yes | ✅ Verified |
| `/api/v1/votes/status` | GET | Yes | ✅ Verified |
| `/api/v1/votes/rankings` | GET | Yes | ✅ Verified |
| `/api/v1/votes/notes` | PUT | Yes | ✅ Verified |
| `/api/v1/votes/notes/export` | GET | Yes | ✅ Verified |
| `/api/v1/votes/teams/:id/count` | GET | Yes | ✅ Verified |
| `/api/v1/leaderboard` | GET | No | ✅ Verified |
| `/api/v1/leaderboard/stats` | GET | No | ✅ Verified |
| `/api/v1/leaderboard/:id` | GET | No | ✅ Verified |
| `/api/v1/presentations` | GET | Yes | ✅ Verified |
| `/api/v1/presentations/current` | GET | Yes | ✅ Verified |
| `/api/v1/presentations/upcoming` | GET | Yes | ✅ Verified |
| `/api/v1/presentations/status` | GET | Yes | ✅ Verified |
| `/api/v1/timer` | GET | Yes | ✅ Verified |
| `/api/docs` | GET | No | ✅ Verified |

**Verified Behaviors:**
- ✅ Password validation (requires uppercase, lowercase, number, special char)
- ✅ JWT authentication with 7-day access token expiry
- ✅ Token refresh flow working
- ✅ Rate limiting (5 req/15min on auth endpoints)
- ✅ Duplicate vote prevention ("You have already cast your final vote")
- ✅ Vote count updates in real-time on leaderboard
- ✅ Private notes with rankings saved correctly
- ✅ 401 responses for unauthenticated requests
- ✅ 404 responses for invalid routes
