# Integration Points - Cross-Agent Dependencies

> Document your module's dependencies on other modules here.
> This helps coordinate work between agents.

---

## How to Use This Document

When your feature needs functionality from another agent's module:
1. Add an entry in "Integration Requests" below
2. Define the interface you need
3. Create a mock for your tests
4. Let the owning agent implement when ready

---

## Integration Requests

### AGENT_AUTH provides:

**To all agents:**
- `authMiddleware` - Express middleware for protected routes
- `useAuth()` hook - React hook for auth state
- `getCurrentUser()` - Get authenticated user

**Interface:**
```typescript
// Server
export function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export function requireRole(role: UserRole): RequestHandler;

// Client
export function useAuth(): {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};
```

---

### AGENT_TEAMS provides:

**To AGENT_VOTING:**
- `getUserTeam(userId)` - Get team for a user (for self-vote prevention)
- `getTeamMembers(teamId)` - Get team members

**To AGENT_PRESENT:**
- `getAllTeams()` - Get all teams for presentation queue

**Interface:**
```typescript
export async function getUserTeam(userId: UserId): Promise<Team | null>;
export async function getTeamMembers(teamId: TeamId): Promise<User[]>;
export async function getAllTeams(): Promise<Team[]>;
```

---

### AGENT_VOTING provides:

**To AGENT_LEADER:**
- `getVoteCounts()` - Get vote counts per team
- `onVoteSubmitted` - Event when vote is submitted

**To AGENT_ADMIN:**
- `getAllVotes()` - Get all votes for transparency view
- `exportVotes()` - Export votes as CSV/JSON

**Interface:**
```typescript
export async function getVoteCounts(): Promise<Map<TeamId, number>>;
export async function getAllVotes(): Promise<Vote[]>;
export async function exportVotes(format: 'csv' | 'json'): Promise<string>;

// Event emitter
export const voteEvents: EventEmitter<{
  'vote:submitted': (vote: Vote) => void;
}>;
```

---

### AGENT_PRESENT provides:

**To AGENT_VOTING:**
- `isPresentationActive()` - Check if voting should be locked
- `getCurrentPresentation()` - Get current presentation

**To AGENT_LEADER:**
- `getPresentedTeams()` - Get teams that have presented (for leaderboard filter)

**Interface:**
```typescript
export async function isPresentationActive(): Promise<boolean>;
export async function getCurrentPresentation(): Promise<Presentation | null>;
export async function getPresentedTeams(): Promise<TeamId[]>;
```

---

### AGENT_LEADER provides:

**To AGENT_VOTING:**
- None (leaderboard consumes from voting)

**To AGENT_ADMIN:**
- `getLeaderboard()` - Get current leaderboard state

**Interface:**
```typescript
export async function getLeaderboard(): Promise<LeaderboardEntry[]>;
```

---

## WebSocket Event Coordination

### Events by Module

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| `leaderboard:update` | AGENT_LEADER | All clients | `LeaderboardEntry[]` |
| `presentation:update` | AGENT_PRESENT | All clients | `Presentation` |
| `timer:update` | AGENT_PRESENT | All clients | `TimerState` |
| `vote:count` | AGENT_LEADER | All clients | `{ teamId, count }` |

### Socket Room Strategy

```
/rooms
├── /all          # All connected clients
├── /admin        # Admin users only
├── /team/:id     # Team-specific (for private notifications)
└── /voter        # All voters
```

---

## State Management Coordination

### Store Slices by Agent

| Store | Owner | Cross-Agent Access |
|-------|-------|-------------------|
| `authStore` | AGENT_AUTH | Read: All |
| `teamStore` | AGENT_TEAMS | Read: VOTING, PRESENT |
| `voteStore` | AGENT_VOTING | Read: LEADER, ADMIN |
| `presentStore` | AGENT_PRESENT | Read: VOTING, LEADER |
| `leaderStore` | AGENT_LEADER | Read: All |
| `uiStore` | AGENT_UI | Read/Write: All |

### Store Access Rules
- **Read** from any store: OK
- **Write** to own store: OK
- **Write** to other store: Requires LOCKS.md claim

---

## Mocking Strategy

Until dependencies are implemented, use mocks:

```typescript
// packages/client/src/features/voting/__mocks__/teamService.ts
export const mockGetUserTeam = jest.fn().mockResolvedValue({
  id: 'team-1',
  name: 'Mock Team',
  members: [],
});

// Use in tests
jest.mock('@/features/teams/teamService', () => ({
  getUserTeam: mockGetUserTeam,
}));
```

---

## Pending Integration Work

| Requestor | Provider | Interface Needed | Status | Notes |
|-----------|----------|------------------|--------|-------|
| | | | | |

*No pending integrations*
