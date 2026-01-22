# Hackathon Voting App - Features & Development Plan

## Overview

A real-time voting application for a hackathon with 70 participants across 15 teams (3-6 members each). The app enforces strict voting rules, manages sequential presentations, and provides real-time leaderboard updates.

## Core Features

### 1. Authentication & Authorization

- **Basic Authentication (Phase 1)**
  - Email/password or email-based login
  - Email domain validation (company domain)
  - Session management
  - Role-based access (Admin vs Voter)
- **Microsoft Identity Integration (Phase 2)**
  - Abstraction layer for auth provider
  - Swappable authentication service
  - Azure AD integration
  - Single Sign-On (SSO)

### 2. Team Management

- Admin can create/edit teams
- Admin can assign members to teams (3-6 members)
- Team member validation (email domain check)
- Team listing and member view
- Prevent duplicate team assignments

### 3. Presentation Queue Management

- Randomize presentation order on initialization
- Admin controls: Start presentation, Advance to next, Reset queue
- Current presentation indicator
- Presentation status tracking (upcoming, current, completed)
- Lock final vote submission when presentation is active (ranking still allowed)
- **Single Presentation Timer** (not per presentation)
  - Fixed duration for all presentations (configurable in settings)
  - Single timer that starts when admin starts current presentation
  - Visual countdown display on main view only (not on individual mobile voting screens)
  - Timer start/pause/reset controls (admin only)
  - Timer state stored on server, synced to all clients via WebSocket
  - Automatic notification when time expires
  - Hybrid approach: Server stores timer state, admin controls it, all clients sync from server

### 4. Voting System

- **During Presentations:**
  - Stack ranking interface for personal notes/tracking
  - Up/down arrow controls OR "Move to #1" button (mobile-friendly, no drag-and-drop)
  - Private notes/feedback per team (not shared)
  - Real-time ranking updates (for personal tracking only)
  - Download personal notes/rankings
  - Ranking is for personal organization, not used for final vote
- **Final Voting (After All Presentations):**
  - Submit final vote from same screen as ranking
  - Team at top of ranked list becomes the final vote (user confirms submission)
  - Cannot vote for own team (strictly enforced)
  - Optional public note explaining why this team was chosen as #1
  - Public note is entered fresh (not pre-populated) before final vote submission
  - One-time submission (cannot change after submit)
  - Vote confirmation dialog
  - **Team assignment cannot be changed after user submits their vote**

### 5. Live Leaderboard

- Stack ranking based on #1 position votes
- Only shows teams that have presented
- Real-time updates as votes come in
- Visual indicators (rank changes, vote counts)
- Hide teams that haven't presented yet
- **Tie handling:** Show ties as ties (e.g., if two teams tie for #1, show both as #1, next team is #3)

### 6. Admin Dashboard

- Team management (CRUD operations)
- Member assignment interface
- Presentation queue control
- View all individual votes (transparency)
- View aggregate statistics
- Export vote data (CSV/JSON)
- Reset/initialize voting system

## Technical Architecture

### Stack Recommendation

- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL (or MongoDB for flexibility)
- **Real-time:** Socket.io for WebSocket connections
- **Frontend:** React.js (or Next.js for SSR)
- **Authentication:** Passport.js (abstracted for Microsoft Identity later)
- **Deployment:** Azure (ADO pipeline)

### Data Model

```
Users
- id, email, name, role (admin/voter), teamId (nullable), createdAt

Teams
- id, name, presentationOrder (nullable), hasPresented (boolean), createdAt

Votes
- id, userId, teamId (voted for), finalVote (boolean), publicNote, submittedAt

PrivateNotes
- id, userId, teamId, note, ranking, updatedAt

Presentations
- id, teamId, status (upcoming/current/completed), startedAt, completedAt

TimerState (single global timer)
- id, isActive (boolean), duration (integer, seconds), startedAt, pausedAt, elapsedSeconds, currentPresentationId
```

### Authentication Abstraction Strategy

- Create `AuthService` interface/abstract class
- Implement `BasicAuthService` (Phase 1)
- Implement `MicrosoftAuthService` (Phase 2)
- Use dependency injection to swap providers
- Store auth strategy in environment config

## View Specifications

### 1. Presentation Queue View (Main View)

- **Purpose:** Display current and upcoming presentations
- **Features:**
  - Current presentation highlight
  - Upcoming presentations list (in order)
  - Completed presentations list
  - Admin controls (if admin role)
  - Timer/status indicators
  - **Single presentation timer display**
    - Countdown timer for current presentation (fixed duration)
    - Timer visible on main view only (not on individual mobile voting screens)
    - Timer controls (start/pause/reset) for admins
    - Visual timer indicator
    - Time expiration alerts
    - Real-time sync from server via WebSocket

### 2. Live Leaderboard View

- **Purpose:** Real-time ranking of presented teams
- **Features:**
  - Stack ranked list (1st, 2nd, 3rd...)
  - Vote count per team
  - Visual rank indicators
  - Auto-refresh or WebSocket updates
  - "Teams not yet presented" message

### 3. Voting App (Individual Users)

- **Purpose:** Main interface for voters
- **Features:**
  - Stack ranking interface for personal notes/tracking
  - **Mobile-friendly ranking controls:** Up/down arrows OR "Move to #1" button (no drag-and-drop)
  - Private notes text area per team
  - Final vote submission from same screen (team at top of list)
  - Optional public note entry before final vote submission (explaining why team was chosen as #1)
  - Download personal notes button
  - Vote submission confirmation
  - Own team restriction warning (cannot vote for own team)
  - **Mobile-responsive design**
    - Touch-friendly up/down arrow controls
    - "Move to #1" quick action button
    - Responsive layout for mobile devices
    - Optimized for small screens (phones and tablets)
    - Timer NOT displayed on individual mobile voting screens (only on main view)

### 4. Admin App

- **Purpose:** Administrative controls and oversight
- **Features:**
  - Team management panel
  - Member assignment interface
  - Presentation queue controls
  - Presentation timer controls (start/pause/reset)
  - Vote transparency view (all individual votes)
  - Statistics dashboard
  - Export functionality
  - System initialization/reset

## Development Tasks

### Phase 1: Foundation & Basic Auth

1. **Project Setup**

   - Initialize Node.js project structure
   - Set up Express.js server
   - Configure database (PostgreSQL/MongoDB)
   - Set up development environment
   - Create ADO pipeline configuration

2. **Database Schema**

   - Create Users table
   - Create Teams table
   - Create Votes table
   - Create PrivateNotes table
   - Create Presentations table (with timer fields)
   - Set up relationships and constraints

3. **Authentication System (Basic)**

   - Implement email/password authentication
   - Email domain validation
   - Session management (JWT or sessions)
   - Role-based middleware (admin/voter)
   - Create AuthService abstraction layer

4. **API Endpoints (Backend)**

   - Auth endpoints (login, logout, register)
   - Team CRUD endpoints
   - Vote endpoints (submit, get)
   - Presentation endpoints
   - Leaderboard endpoint
   - Admin endpoints

### Phase 2: Core Voting Features

5. **Team Management**

   - Admin UI for team creation/editing
   - Member assignment interface
   - Team validation (3-6 members)
   - Duplicate assignment prevention

6. **Presentation Queue**

   - Randomization algorithm
   - Queue management API
   - Status tracking
   - Admin controls UI
   - **Single presentation timer implementation**
     - Timer state management (server-side, single global timer)
     - Timer API endpoints (start/pause/reset)
     - Real-time timer updates via WebSocket (hybrid approach)
     - Timer UI components (main view only, not on individual mobile screens)
     - Fixed duration configuration
     - Server stores timer state, admin controls it, clients sync from server

7. **Voting Interface**

   - Stack ranking component (up/down arrows or "Move to #1" button)
   - Private notes storage
   - Final vote submission from same screen (team at top of ranked list)
   - Own team restriction enforcement
   - Optional public note entry before final vote (fresh entry, not pre-populated)
   - Vote submission flow with confirmation
   - Mobile-responsive design implementation
     - Responsive CSS/styling
     - Touch-friendly up/down arrow controls
     - Mobile layout optimization
     - Cross-device testing
   - Prevent team assignment changes after vote submission

8. **Leaderboard**

   - Real-time ranking calculation (based on #1 position votes)
   - Tie handling: Show ties as ties (e.g., two teams at #1, next is #3)
   - WebSocket integration (Socket.io)
   - Leaderboard UI component
   - Filter teams that haven't presented

### Phase 3: Admin & Polish

9. **Admin Dashboard**

   - Team management UI
   - Presentation controls
   - Vote transparency view
   - Statistics display
   - Export functionality

10. **Real-time Updates**

    - WebSocket server setup
    - Leaderboard broadcast
    - Vote count updates
    - Presentation status updates

11. **Data Validation & Security**

    - Strict vote validation (own team check)
    - Input sanitization
    - Rate limiting
    - Error handling
    - Audit logging

### Phase 4: Microsoft Identity Integration

12. **Auth Provider Swap**

    - Implement MicrosoftAuthService
    - Azure AD configuration
    - OAuth2 flow
    - Update environment config
    - Test authentication swap

### Phase 5: Testing & Deployment

13. **Testing (Continuous - Test as We Build)**

    - Unit tests for core logic (write as features are built)
    - Integration tests for API (test endpoints as they're created)
    - E2E tests for voting flow (test complete flows incrementally)
    - Load testing (70 concurrent users)
    - Real-time feature testing (WebSocket connections, timer sync)
    - Mobile device testing (responsive design, touch interactions)
    - Error recovery scenario testing

14. **Error Recovery & Resilience**

    - Database connection loss handling
    - WebSocket disconnection recovery
    - Vote submission retry logic
    - Timer state recovery after server restart
    - Offline capability or clear error messages
    - Data validation and error handling throughout
    - Graceful degradation for real-time features

15. **Deployment**

    - ADO pipeline finalization
    - Cloud infrastructure setup (Azure)
    - Database migration scripts
    - Environment configuration
    - Monitoring and logging

## Key Technical Considerations

### Vote Enforcement

- Server-side validation: Check `user.teamId !== vote.teamId`
- Database constraint: Add check constraint if possible
- Frontend prevention: Disable/hide own team in voting UI
- **Team assignment lock:** Prevent team assignment changes after user submits vote
- Audit trail: Log all vote attempts (successful and blocked)

### Real-time Updates

- Use Socket.io for bidirectional communication
- Broadcast leaderboard updates on vote submission
- Broadcast presentation status changes
- Broadcast timer state updates (single timer, synced to all clients)
- Handle reconnection gracefully
- Timer synchronization: Server stores state, admin controls, clients sync via WebSocket

### Data Persistence

- All votes must be saved immediately
- Private notes saved on change (debounced)
- Final votes marked with `finalVote: true`
- Timestamps for audit trail

### Scalability

- Database indexing on frequently queried fields
- Connection pooling
- Caching for leaderboard calculations
- Rate limiting on vote submissions

## Security Requirements

- HTTPS in production
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection
- Secure session management
- Environment variable for secrets
- Role-based access control enforcement

## Future Enhancements (Post-MVP)

- Additional presentation customization options
- Enhanced reporting features
- Integration with external tools
