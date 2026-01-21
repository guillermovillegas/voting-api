# Agent Manifest - Module Ownership

> This file defines which agent owns which modules. Check this before modifying any file.
> Last updated: 2025-01-20

---

## Agent Registry

| Agent ID | Scope | Primary Modules |
|----------|-------|-----------------|
| `AGENT_AUTH` | Authentication & Authorization | auth module (client + server) |
| `AGENT_TEAMS` | Team Management | teams module, member assignment |
| `AGENT_VOTING` | Voting System | voting module, stack ranking |
| `AGENT_PRESENT` | Presentation Queue | presentations module, timer |
| `AGENT_LEADER` | Leaderboard | leaderboard module, real-time updates |
| `AGENT_ADMIN` | Admin Dashboard | admin module, reports |
| `AGENT_INFRA` | Infrastructure | database, websocket, core setup |
| `AGENT_UI` | Shared UI Components | design system, base components |

---

## Module Ownership Map

### Server Modules (`packages/server/src/`)

| Path | Owner | Tier | Notes |
|------|-------|------|-------|
| `modules/auth/` | AGENT_AUTH | EXCLUSIVE | JWT, sessions, middleware |
| `modules/teams/` | AGENT_TEAMS | EXCLUSIVE | CRUD, member assignment |
| `modules/voting/` | AGENT_VOTING | EXCLUSIVE | Vote submission, validation |
| `modules/presentations/` | AGENT_PRESENT | EXCLUSIVE | Queue, timer state |
| `modules/leaderboard/` | AGENT_LEADER | EXCLUSIVE | Rankings, calculations |
| `modules/admin/` | AGENT_ADMIN | EXCLUSIVE | Reports, exports |
| `core/` | AGENT_INFRA | PROTECTED | App setup, requires approval |
| `shared/middleware/` | ALL | SHARED-APPEND | Add new files only |
| `shared/utils/` | ALL | SHARED-APPEND | Add new files only |
| `shared/types/` | ALL | SHARED-APPEND | Add new types only |

### Client Modules (`packages/client/src/`)

| Path | Owner | Tier | Notes |
|------|-------|------|-------|
| `features/auth/` | AGENT_AUTH | EXCLUSIVE | Login, register UI |
| `features/teams/` | AGENT_TEAMS | EXCLUSIVE | Team management UI |
| `features/voting/` | AGENT_VOTING | EXCLUSIVE | Voting interface |
| `features/presentations/` | AGENT_PRESENT | EXCLUSIVE | Queue view, timer |
| `features/leaderboard/` | AGENT_LEADER | EXCLUSIVE | Live rankings |
| `features/admin/` | AGENT_ADMIN | EXCLUSIVE | Admin dashboard |
| `components/ui/` | AGENT_UI | EXCLUSIVE | Base components |
| `components/` (root) | ALL | SHARED-APPEND | Feature-specific shared |
| `hooks/` | ALL | SHARED-APPEND | Add new hooks only |
| `stores/` | VARIOUS | SHARED-COORDINATE | Claim lock first |
| `lib/` | AGENT_INFRA | PROTECTED | Core utilities |

### Shared Package (`packages/shared/`)

| Path | Owner | Tier | Notes |
|------|-------|------|-------|
| `types/` | ALL | SHARED-APPEND | Interface definitions |
| `constants/` | ALL | SHARED-APPEND | Shared constants |
| `validation/` | ALL | SHARED-APPEND | Zod schemas |

### Database (`packages/database/` or `prisma/`)

| Path | Owner | Tier | Notes |
|------|-------|------|-------|
| `schema.prisma` | AGENT_INFRA | PROTECTED | Requires coordination |
| `migrations/` | AGENT_INFRA | PROTECTED | Generated files |
| `seed.ts` | ALL | SHARED-COORDINATE | Claim lock |

---

## Protected Files (User Approval Required)

These files affect all agents and require explicit user confirmation:

```
/package.json
/packages/*/package.json
/tsconfig.json
/tsconfig.*.json
/prisma/schema.prisma
/.env*
/docker-compose*.yml
/.github/workflows/*
```

---

## Integration Points

When your module needs to interact with another:

### Auth Integration
Other modules that need auth:
- Import `authMiddleware` from `@voting/server/modules/auth`
- Import `useAuth` hook from `@voting/client/features/auth`

### Socket Integration
Real-time features coordinate through:
- `packages/server/src/core/socket.ts` (PROTECTED)
- Each module registers its own event handlers

### Store Integration
State management:
- Each feature owns its own slice in `stores/<feature>.ts`
- Cross-feature reads OK, cross-feature writes need lock

---

## Claiming a Module

If you're a new agent and need to claim a module:

1. Check this manifest for unclaimed areas
2. Add your claim below in the "Pending Claims" section
3. Wait for user approval before proceeding

### Pending Claims

| Agent ID | Requested Module | Reason | Status |
|----------|------------------|--------|--------|
| (none) | | | |
