# Concurrent Agent Development Rules - Voting App

## 🎯 PROJECT CONTEXT
This project is designed to stress-test multiple AI agents working concurrently on the same codebase.
**Goal**: Identify and prevent git merge conflicts, commit collisions, and integration issues.

---

## 🚨 STRESS TEST FINDINGS (2026-01-20)

### Test 1 Issues
1. **Bash permissions block git operations** - Subagents can't run git without approval
2. **Infinite retry loops** - Agents retry failing commands indefinitely (100+ times)
3. **No branch isolation** - Without git, all changes go to main
4. **Protected file violations** - Time pressure causes agents to ignore rules

### Test 2 Findings (After Mitigations)
| Component | Result |
|-----------|--------|
| Pre-created branches | ✅ Agents checkout successfully |
| Simple bash (mkdir, git checkout) | ✅ Works |
| Heredoc file creation (cat > file) | ❌ Still denied |
| Retry limits (3x max) | ✅ Agents stopped correctly |
| **Write tool for files** | ✅ **SUCCESS - Use this instead of Bash!** |

### ✅ SOLUTION DISCOVERED
**Use Write/Edit tools for file creation, NOT Bash heredocs!**
- `Write` tool works for all agent types without special permissions
- `Bash` is only needed for git operations (checkout, commit, push)
- Agents using `Write` tool (like AGENT_UI) completed all file creation successfully

### Required Mitigations
- **Pre-create branches** before launching agents
- **Use Write tool** for file creation (not bash cat/heredoc)
- **Add retry limits** - Max 3 attempts, then stop and report
- **Enforce file ownership** - Block writes outside assigned modules

---

## ⚠️ CRITICAL: FILE CREATION METHOD

**ALWAYS use Write/Edit tools for creating files - NEVER use Bash heredocs!**

```
❌ WRONG: cat > file.ts << 'EOF' ... EOF  (will be denied)
✅ RIGHT: Use Write tool with file_path and content parameters
```

### If Bash commands are denied:
1. **DO NOT retry more than 3 times** - Stop and report the failure
2. **Use Write/Edit tools** - These work without Bash permissions
3. **Report the blocker** - Output: "GIT BLOCKED: Cannot create branch/commit."
4. **Continue with file creation** - Use Write tool to complete code work
5. **Document in session summary** - List all files created and pending git operations

### Pre-launch checklist (for the orchestrating user):
- [ ] Create feature branches BEFORE launching agents
- [ ] Instruct agents to use Write tool for files (not Bash)
- [ ] Grant Bash permissions ONLY for git commands (checkout, add, commit)

---

## 🚨 CRITICAL: AGENT IDENTIFICATION

**BEFORE ANY CODE GENERATION, YOU MUST:**
1. Identify yourself with an AGENT_ID (e.g., `AGENT_1`, `AGENT_AUTH`, `AGENT_UI`)
2. Check `AGENT_MANIFEST.md` for your assigned modules
3. NEVER touch files outside your assigned scope without explicit user approval

---

## 🔒 FILE OWNERSHIP SYSTEM

### Ownership Tiers
| Tier | Description | Access Rule |
|------|-------------|-------------|
| **EXCLUSIVE** | Assigned to single agent | Only owner can modify |
| **SHARED-APPEND** | Multiple agents can add | Append-only, no edits to existing code |
| **SHARED-COORDINATE** | Requires coordination | Must claim lock in LOCKS.md before editing |
| **PROTECTED** | Core infrastructure | Requires explicit user approval |

### Protected Files (NEVER modify without user approval)
```
package.json           # Dependencies - coordination required
tsconfig.json          # TypeScript config
.env*                  # Environment files
prisma/schema.prisma   # Database schema - coordination required
docker-compose.yml     # Container config
```

---

## 🌳 GIT WORKFLOW FOR CONCURRENT AGENTS

### Branch Naming Convention
```
agent/<agent-id>/<feature-scope>
```
Examples:
- `agent/auth/login-api`
- `agent/ui/voting-form`
- `agent/db/schema-teams`

### Pre-Commit Checklist
1. **ALWAYS** run `git fetch origin` before committing
2. **CHECK** for conflicting branches: `git branch -r | grep <your-feature-scope>`
3. **VERIFY** no one else touched your files: `git log --oneline --since="1 hour ago" -- <your-files>`
4. **REBASE** if needed: `git rebase origin/main`

### Commit Message Format
```
[AGENT_ID][SCOPE] type: description

Examples:
[AGENT_AUTH][api] feat: add JWT token validation middleware
[AGENT_UI][components] fix: resolve voting form submission bug
```

---

## 📁 MODULE BOUNDARIES

### Backend Modules (Node.js/Express)
```
packages/server/
├── src/
│   ├── modules/
│   │   ├── auth/          # AGENT_AUTH exclusive
│   │   ├── teams/         # AGENT_TEAMS exclusive
│   │   ├── voting/        # AGENT_VOTING exclusive
│   │   ├── presentations/ # AGENT_PRESENT exclusive
│   │   └── leaderboard/   # AGENT_LEADER exclusive
│   ├── shared/            # SHARED-APPEND only
│   │   ├── middleware/    # Add new files only
│   │   ├── utils/         # Add new files only
│   │   └── types/         # Add new interfaces only
│   └── core/              # PROTECTED - user approval required
│       ├── app.ts
│       ├── database.ts
│       └── socket.ts
```

### Frontend Modules (React)
```
packages/client/
├── src/
│   ├── features/
│   │   ├── auth/          # AGENT_AUTH exclusive
│   │   ├── voting/        # AGENT_VOTING exclusive
│   │   ├── admin/         # AGENT_ADMIN exclusive
│   │   ├── leaderboard/   # AGENT_LEADER exclusive
│   │   └── presentations/ # AGENT_PRESENT exclusive
│   ├── components/
│   │   └── ui/            # SHARED-APPEND - add new components only
│   ├── hooks/             # SHARED-APPEND
│   ├── lib/               # PROTECTED
│   └── stores/            # SHARED-COORDINATE - claim lock first
```

---

## 🔐 SOFT LOCK SYSTEM

### Before Editing Shared Files
1. Check `LOCKS.md` for active locks
2. Add your lock claim:
```markdown
## Active Locks
| File | Agent | Claimed | Expires | Purpose |
|------|-------|---------|---------|---------|
| stores/voting.ts | AGENT_VOTING | 2024-01-20T10:00 | 2024-01-20T11:00 | Adding vote submission logic |
```
3. After completing work, REMOVE your lock entry

### Lock Conflicts
If a file is locked by another agent:
- 🛑 DO NOT proceed
- 💬 Notify user: "File `X` is locked by `AGENT_Y`. Waiting for release or user override."

---

## 🔄 MERGE CONFLICT PREVENTION

### High-Risk Files (Monitor Closely)
These files are commonly edited by multiple features:
- `packages/server/src/core/app.ts` - Route registration
- `packages/client/src/App.tsx` - Route definitions
- `packages/shared/types/index.ts` - Type exports
- `prisma/schema.prisma` - Database models

### Conflict Prevention Strategies
1. **Additive-Only Changes**: When possible, ADD new code instead of modifying existing
2. **Separate Files**: Create new files instead of expanding existing ones
3. **Index Pattern**: Use `index.ts` barrel exports that agents only append to
4. **Feature Flags**: Gate incomplete features instead of merge-blocking

### When Conflicts Occur
```bash
# Check conflict scope
git diff --name-only --diff-filter=U

# For each conflicted file, analyze both versions
# NEVER blindly pick one side
# Create merged solution preserving both intents
```

---

## 📋 TASK CLAIM PROTOCOL

Before starting any task:
1. Check `TASKS.md` for unclaimed tasks
2. Add your claim:
```markdown
## In Progress
| Task ID | Description | Agent | Branch | Started |
|---------|-------------|-------|--------|---------|
| T001 | Auth API endpoints | AGENT_AUTH | agent/auth/api | 2024-01-20 |
```
3. After completion, move to `## Completed` section

---

## 🧪 TESTING REQUIREMENTS

### Before Committing
```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Unit tests for your module
npm run test -- --filter=<your-module>
```

### Integration Points
When your feature needs to integrate with another module:
1. Define interface in `packages/shared/types/`
2. Create mock implementation for testing
3. Document integration in `INTEGRATION.md`
4. Let other agent implement their side

---

## ⚡ QUICK REFERENCE

### Safe Operations (No Coordination Needed)
- Creating new files in your EXCLUSIVE module
- Adding exports to your module's `index.ts`
- Adding new test files
- Adding types to shared types (append only)

### Requires Coordination
- Modifying any file in `core/` or `lib/`
- Changing shared state management
- Adding new dependencies
- Modifying database schema
- Changing API contracts

### NEVER Do Without User Approval
- Force push any branch
- Delete files outside your module
- Modify another agent's committed code
- Merge to main/production
- Change CI/CD configuration
