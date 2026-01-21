# File Locks - Concurrent Edit Coordination

> Check this file BEFORE editing any SHARED-COORDINATE files.
> Locks auto-expire after 1 hour. Clean up your locks when done!

---

## How to Use Locks

### Before Editing a Shared File:
1. Check "Active Locks" below
2. If file is locked by another agent → STOP, notify user
3. If file is free → Add your lock entry, then proceed

### After Completing Your Edit:
1. Remove your lock entry from this file
2. Commit the unlock along with your changes

---

## Active Locks

| File | Agent | Claimed (UTC) | Expires (UTC) | Purpose |
|------|-------|---------------|---------------|---------|
| | | | | |

*No active locks*

---

## Lock History (Last 24 Hours)

| File | Agent | Duration | Completed |
|------|-------|----------|-----------|
| | | | |

*No recent locks*

---

## Lockable Files (SHARED-COORDINATE Tier)

These files require a lock before editing:

### Stores
- `packages/client/src/stores/auth.ts`
- `packages/client/src/stores/voting.ts`
- `packages/client/src/stores/teams.ts`
- `packages/client/src/stores/ui.ts`

### Database
- `prisma/seed.ts`

### Routes
- `packages/server/src/core/routes.ts`
- `packages/client/src/App.tsx`

### Socket Events
- `packages/server/src/core/socket.ts`

---

## Lock Conflict Resolution

If two agents need the same file:

1. **First-come-first-served**: Earlier timestamp wins
2. **Time-critical**: User can override and reassign lock
3. **Urgent fix**: User can grant temporary concurrent access

To request lock override, agent should output:
```
LOCK CONFLICT: Need `<file>` currently held by `<agent>`.
Reason: <why urgent>
Requesting user override.
```
