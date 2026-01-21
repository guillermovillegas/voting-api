# Concurrent Agent Development Stress Test Report

## TEST 2 SUMMARY (2026-01-20)

**Key Discovery:** Use `Write` tool for file creation, NOT `Bash` heredocs!

| Agent | Branch Checkout | File Creation | Commit |
|-------|-----------------|---------------|--------|
| AGENT_AUTH | ✅ Success | ❌ Bash denied | ❌ N/A |
| AGENT_VOTING | ✅ Success | ❌ Bash denied | ❌ N/A |
| AGENT_TEAMS | ✅ Success | ❌ Bash denied | ❌ N/A |
| AGENT_LEADER | ✅ Success | ❌ Bash denied | ❌ N/A |
| AGENT_UI | N/A | ✅ **Used Write tool** | ❌ No Bash |

**Retry limits worked** - All agents stopped after 3 failures (no infinite loops)
**Pre-created branches worked** - All agents checked out successfully
**Solution**: Agents must use Write/Edit tools for files, Bash only for git

---

## TEST 1 SUMMARY (2025-01-20)

**Date:** 2025-01-20
**Test Duration:** ~6 minutes
**Agents Launched:** 5 (parallel)
**Agent Types:** nextjs-saas-developer (4), react-component-builder (1)

---

## Executive Summary

The stress test revealed **critical blockers** that prevent effective concurrent agent development:

1. **Git operations completely blocked** - Subagents lack bash permissions for git
2. **Infinite retry loops** - Agents retry failed commands indefinitely (100+ attempts)
3. **No branch isolation** - All changes written to main branch
4. **Protected file violations** - Agents ignore ownership rules under time pressure

Despite these issues, **file creation worked well** when agents followed module boundaries.

---

## Test Configuration

| Agent ID | Task | Target Module | Files Created |
|----------|------|---------------|---------------|
| AGENT_AUTH | Auth API | server/modules/auth | 3 |
| AGENT_VOTING | Voting API | server/modules/voting | 3 |
| AGENT_TEAMS | Teams API | server/modules/teams | 0 (blocked) |
| AGENT_UI | React Components | client/components/ui | 4 |
| AGENT_LEADER | Leaderboard | server/modules/leaderboard | 4 |

---

## Issues Discovered

### 1. CRITICAL: Bash Permission Denial

**Symptom:** All git commands denied with "Permission to use Bash has been auto-denied"

**Impact:**
- Agents couldn't create branches
- No commits could be made
- No merges possible
- All work landed on `main` branch

**Evidence:**
```
git checkout -b agent/auth/login-api
Error: Permission to use Bash has been auto-denied (prompts unavailable).
```

**Root Cause:** Subagent Bash tool requires approval for each command, but background agents can't prompt for approval.

### 2. CRITICAL: Infinite Retry Loops

**Symptom:** Agents retried failing bash commands 50+ times without stopping

**Impact:**
- Wasted compute resources
- Agents never completed
- Required manual termination

**Evidence:** Agent acbd224 attempted `git checkout -b agent/auth/login-api` over 100 times consecutively.

### 3. HIGH: Shared File Race Condition

**Symptom:** Multiple agents modified `packages/shared/src/types/index.ts` simultaneously

**Impact:**
- Potential data loss (last write wins)
- In this test: worked because all agents APPENDED (lucky)

**Files Affected:**
- `packages/shared/src/types/index.ts` - 3 agents wrote to this
- `packages/server/src/index.ts` - 2 agents modified

### 4. MEDIUM: Protected File Violations

**Symptom:** AGENT_LEADER modified protected `index.ts` without coordination

**Impact:**
- Bypassed ownership rules
- Created uncoordinated changes

---

## What Worked

### 1. Module Isolation (EXCLUSIVE ownership)
- Each agent correctly created files in their assigned directories
- No conflicts in module-specific files
- auth/ voting/ leaderboard/ remained separate

### 2. SHARED-APPEND Pattern
- Multiple agents appending to shared types file didn't conflict
- Each agent added their types at the end
- File remained valid TypeScript

### 3. File Creation Without Git
- 13 new files created successfully
- Code quality was acceptable
- Agents followed type conventions

---

## Recommendations

### Immediate Fixes

1. **Pre-create branches before launching agents**
   ```bash
   git checkout -b agent/auth/api
   git checkout -b agent/voting/api
   git checkout -b agent/leader/api
   # etc.
   ```

2. **Use Bash agent type for git-heavy tasks**
   - The `Bash` subagent_type has default bash permissions
   - Or grant explicit permissions in agent prompt

3. **Add retry limits to agent prompts**
   ```
   IMPORTANT: If a bash command fails 3 times, STOP retrying.
   Report the failure and continue with non-bash work.
   ```

### Rule Improvements

4. **Enforce file ownership with tool restrictions**
   - Add to prompts: "You may ONLY write to files in your assigned module"
   - Block writes to paths outside ownership

5. **Require lock claims for shared files**
   - Add to prompts: "Before editing any file in shared/, check LOCKS.md first"

6. **Add session timeout**
   - Agents should auto-terminate after 5 minutes if no progress

### Architecture Changes

7. **Use worktrees for true isolation**
   ```bash
   git worktree add ../voting-auth agent/auth/api
   git worktree add ../voting-voting agent/voting/api
   ```

8. **Central coordination agent**
   - One agent manages git operations
   - Other agents only write files
   - Coordinator commits and merges

---

## Recommended Agent Launch Pattern

```javascript
// 1. Pre-create branches (run as main session)
git checkout main
git checkout -b agent/auth/api
git checkout -b agent/voting/api
git checkout -b agent/leader/api
git checkout main

// 2. Launch agents with explicit bash permissions and retry limits
Task({
  subagent_type: "Bash",  // Has bash permissions
  prompt: `
    You are AGENT_AUTH.
    CRITICAL: If any bash command fails 3 times, STOP and report failure.

    1. git checkout agent/auth/api
    2. Create files in packages/server/src/modules/auth/
    3. git add . && git commit -m "[AGENT_AUTH] feat: auth API"
    4. DO NOT merge - leave for coordinator
  `
})
```

---

## Metrics

| Metric | Value |
|--------|-------|
| Files Created | 13 |
| Files Modified | 3 |
| Merge Conflicts | 0 (no merges attempted) |
| Bash Retries | 400+ (across all agents) |
| Successful Commits | 0 |
| Agent Completions | 0 (all stuck) |

---

## Conclusion

Concurrent agent development is **possible but requires careful orchestration**:

1. **Don't rely on agents for git operations** - Pre-configure branches
2. **Enforce strict module boundaries** - Prevent shared file races
3. **Add failure handling** - Retry limits and fallback behaviors
4. **Use a coordinator pattern** - One agent handles integration

The module ownership system (EXCLUSIVE/SHARED-APPEND) worked well when followed. The main failure was the bash permission model blocking essential git operations.
