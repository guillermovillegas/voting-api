# Task Board - Agent Work Distribution

> Claim tasks before starting. One agent per task.
> Update status as you work. Move completed tasks to bottom.

---

## How to Claim a Task

1. Find an unclaimed task in "Available Tasks"
2. Move it to "In Progress" with your AGENT_ID
3. Create your branch: `agent/<id>/<task-scope>`
4. Start working

---

## Available Tasks (Unclaimed)

### Phase 1: Foundation

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T001 | Set up Express server with TypeScript | infra | HIGH | 5 | None |
| T002 | Set up React client with Vite + TypeScript | infra | HIGH | 5 | None |
| T003 | Create Prisma schema for all models | infra | HIGH | 1 | None |
| T004 | Set up shared types package | infra | HIGH | 3 | None |

### Phase 2: Authentication

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T010 | Implement email/password auth API | auth | HIGH | 4 | T001, T003 |
| T011 | Create auth middleware (JWT) | auth | HIGH | 2 | T010 |
| T012 | Build login/register UI components | auth | HIGH | 4 | T002, T010 |
| T013 | Implement role-based access control | auth | MEDIUM | 3 | T011 |

### Phase 3: Team Management

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T020 | Create team CRUD API endpoints | teams | HIGH | 3 | T001, T003 |
| T021 | Build team management admin UI | teams | HIGH | 4 | T002, T020 |
| T022 | Implement member assignment logic | teams | MEDIUM | 3 | T020 |
| T023 | Add team validation (3-6 members) | teams | MEDIUM | 2 | T022 |

### Phase 4: Presentation Queue

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T030 | Create presentation queue API | presentations | HIGH | 3 | T020 |
| T031 | Implement queue randomization | presentations | MEDIUM | 2 | T030 |
| T032 | Build presentation queue UI | presentations | HIGH | 4 | T030 |
| T033 | Implement presentation timer (server) | presentations | MEDIUM | 3 | T030 |
| T034 | Build timer UI component | presentations | MEDIUM | 2 | T033 |

### Phase 5: Voting System

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T040 | Create voting API endpoints | voting | HIGH | 4 | T020, T011 |
| T041 | Implement vote validation (no self-vote) | voting | HIGH | 2 | T040 |
| T042 | Build stack ranking UI (mobile-friendly) | voting | HIGH | 5 | T040 |
| T043 | Implement private notes storage | voting | MEDIUM | 3 | T040 |
| T044 | Build final vote submission flow | voting | HIGH | 3 | T041, T042 |

### Phase 6: Leaderboard

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T050 | Create leaderboard calculation API | leaderboard | HIGH | 3 | T040 |
| T051 | Implement tie handling logic | leaderboard | MEDIUM | 2 | T050 |
| T052 | Build live leaderboard UI | leaderboard | HIGH | 3 | T050 |
| T053 | Set up WebSocket for real-time updates | leaderboard | HIGH | 4 | T050, T001 |

### Phase 7: Admin Dashboard

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T060 | Build admin dashboard layout | admin | HIGH | 3 | T013 |
| T061 | Create vote transparency view | admin | MEDIUM | 3 | T060, T040 |
| T062 | Implement data export (CSV/JSON) | admin | LOW | 2 | T060 |
| T063 | Add presentation controls UI | admin | HIGH | 3 | T060, T033 |

### Phase 8: Polish & Testing

| ID | Task | Module | Priority | Est. Files | Dependencies |
|----|------|--------|----------|------------|--------------|
| T070 | Add comprehensive error handling | all | MEDIUM | 5 | All core |
| T071 | Implement WebSocket reconnection | infra | MEDIUM | 2 | T053 |
| T072 | Add rate limiting | infra | MEDIUM | 2 | T001 |
| T073 | Write unit tests for voting logic | voting | HIGH | 3 | T040-T044 |
| T074 | Write E2E tests for main flows | all | MEDIUM | 5 | All core |

---

## In Progress

| ID | Task | Agent | Branch | Started | Notes |
|----|------|-------|--------|---------|-------|
| | | | | | |

*No tasks in progress*

---

## Completed

| ID | Task | Agent | PR/Commit | Completed |
|----|------|-------|-----------|-----------|
| | | | | |

*No completed tasks yet*

---

## Blocked

| ID | Task | Agent | Blocked By | Notes |
|----|------|-------|------------|-------|
| | | | | |

*No blocked tasks*

---

## Task Dependencies Graph

```
Phase 1 (Foundation)
T001 ─┬─→ T010 → T011 → T013
      │         ↓
T002 ─┼─→ T012
      │
T003 ─┤
      │
T004 ─┘

Phase 3-6 (Features)
T020 → T021
  │
  ├─→ T022 → T023
  │
  └─→ T030 → T031
        ↓
      T032 → T033 → T034

T040 → T041 → T044
  │
  ├─→ T042
  │
  └─→ T043

T050 → T051
  ↓
T052 ← T053
```
