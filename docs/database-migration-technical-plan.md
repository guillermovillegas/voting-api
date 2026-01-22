---
name: Remove ORM and Implement Raw SQL PostgreSQL Architecture
overview: Phase out Prisma ORM completely and replace with a raw SQL PostgreSQL implementation using the `pg` library. Create a proper database schema, migration system, connection pool, and refactor all services to use parameterized SQL queries following 2026 best practices.
todos:
  - id: phase1-deps
    content: Install pg library and remove Prisma dependencies from package.json
    status: pending
  - id: phase1-pool
    content: Create database connection pool in packages/server/src/core/db/pool.ts
    status: pending
  - id: phase1-client
    content: Create database client wrapper in packages/server/src/core/db/client.ts
    status: pending
  - id: phase1-types
    content: Create database type definitions in packages/server/src/core/db/types.ts
    status: pending
  - id: phase2-schema
    content: Create PostgreSQL schema SQL file in packages/server/src/core/migrations/001_initial_schema.sql
    status: pending
  - id: phase2-migrations
    content: Implement migration system in packages/server/src/core/migrations/index.ts
    status: pending
  - id: phase3-auth-queries
    content: Create auth queries in packages/server/src/modules/auth/auth.queries.ts
    status: pending
  - id: phase3-teams-queries
    content: Create teams queries in packages/server/src/modules/teams/teams.queries.ts
    status: pending
  - id: phase3-voting-queries
    content: Create voting queries in packages/server/src/modules/voting/voting.queries.ts
    status: pending
  - id: phase3-leaderboard-queries
    content: Create leaderboard queries in packages/server/src/modules/leaderboard/leaderboard.queries.ts
    status: pending
  - id: phase4-refactor-auth
    content: Refactor auth.service.ts to use database queries instead of in-memory storage
    status: pending
  - id: phase4-refactor-teams
    content: Refactor teams.service.ts to use database queries instead of in-memory storage
    status: pending
  - id: phase4-refactor-voting
    content: Refactor voting.service.ts to use database queries instead of in-memory storage
    status: pending
  - id: phase4-refactor-leaderboard
    content: Refactor leaderboard.service.ts to use database queries instead of in-memory storage
    status: pending
  - id: phase5-remove-prisma
    content: Delete prisma/schema.prisma and remove Prisma scripts from package.json
    status: pending
  - id: phase5-update-scripts
    content: Update package.json scripts to use new migration system
    status: pending
  - id: phase6-testing
    content: Test database connection, queries, and integration with all modules
    status: pending
isProject: false
---

# Remove ORM and Implement Raw SQL PostgreSQL Architecture

## Current State Analysis

- **Prisma Schema Exists**: `prisma/schema.prisma` defines models but Prisma is not actually used
- **In-Memory Storage**: All services (`voting.service.ts`, `teams.service.ts`, `auth.service.ts`) use Map-based in-memory storage
- **No Database Connection**: No actual PostgreSQL connection exists in the codebase
- **Prisma Scripts**: Package.json has Prisma scripts but Prisma is not in dependencies

## Architecture Overview

### Database Layer Architecture

```
packages/server/src/
├── core/
│   ├── db/
│   │   ├── pool.ts          # PostgreSQL connection pool
│   │   ├── client.ts        # Database client wrapper
│   │   └── types.ts         # Database row types
│   └── migrations/
│       ├── index.ts         # Migration runner
│       └── 001_initial_schema.sql
├── modules/
│   └── [each module]/
│       └── [module].queries.ts  # SQL queries for module
```

### Key Design Decisions (2026 Best Practices)

1. **Raw SQL with Parameterized Queries**: Use `pg` library with parameterized queries to prevent SQL injection while maintaining performance
2. **Connection Pooling**: Use `pg.Pool` for efficient connection management
3. **Schema Organization**: Use PostgreSQL schemas for logical organization (optional, can use `public` schema)
4. **Migration System**: Custom migration system using SQL files (not Prisma migrations)
5. **Type Safety**: Generate TypeScript types from database schema using `pgtyped` or manual type definitions
6. **Query Organization**: Co-locate SQL queries with domain logic in `.queries.ts` files

## Phase 1: Database Infrastructure Setup

### 1.1 Install Dependencies

**File**: `packages/server/package.json`

- Add `pg` (PostgreSQL client)
- Add `@types/pg` (TypeScript types)
- Remove any Prisma references (if present)
- Add `pgtyped` or similar for type generation (optional)

### 1.2 Create Database Connection Pool

**File**: `packages/server/src/core/db/pool.ts`

- Create PostgreSQL connection pool using `pg.Pool`
- Configure pool settings (min/max connections, idle timeout)
- Use environment variables for connection string
- Export pool instance for use across modules
- Handle connection errors gracefully

**File**: `packages/server/src/core/db/client.ts`

- Create database client wrapper
- Provide helper functions for transactions
- Add query execution wrapper with error handling
- Support for prepared statements

**File**: `packages/server/src/core/db/types.ts`

- Define TypeScript interfaces matching database row structures
- Map SQL types to TypeScript types
- Export types for use in services

### 1.3 Environment Configuration

**File**: `.env.example` (if exists) or document in README

- `DATABASE_URL`: PostgreSQL connection string
- `DB_POOL_MIN`: Minimum pool connections (default: 2)
- `DB_POOL_MAX`: Maximum pool connections (default: 10)

## Phase 2: Database Schema Design

### 2.1 Create SQL Schema File

**File**: `packages/server/src/core/migrations/001_initial_schema.sql`

Based on Prisma schema, create PostgreSQL DDL:

**Tables to Create:**

1. **users**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `email VARCHAR(255) UNIQUE NOT NULL`
   - `password VARCHAR(255) NOT NULL` (hashed)
   - `name VARCHAR(255) NOT NULL`
   - `role VARCHAR(20) NOT NULL DEFAULT 'voter' CHECK (role IN ('admin', 'voter'))`
   - `team_id UUID REFERENCES teams(id) ON DELETE SET NULL`
   - `created_at TIMESTAMP DEFAULT NOW()`
   - `updated_at TIMESTAMP DEFAULT NOW()`
   - Indexes: `idx_users_email`, `idx_users_team_id`

2. **teams**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `name VARCHAR(255) UNIQUE NOT NULL`
   - `presentation_order INTEGER`
   - `has_presented BOOLEAN DEFAULT FALSE`
   - `created_at TIMESTAMP DEFAULT NOW()`
   - `updated_at TIMESTAMP DEFAULT NOW()`
   - Index: `idx_teams_presentation_order`

3. **votes**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
   - `team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE`
   - `is_final_vote BOOLEAN DEFAULT FALSE`
   - `public_note TEXT`
   - `submitted_at TIMESTAMP DEFAULT NOW()`
   - Constraint: `UNIQUE(user_id, is_final_vote) WHERE is_final_vote = TRUE` (one final vote per user)
   - Indexes: `idx_votes_team_id`, `idx_votes_user_id`

4. **private_notes**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
   - `team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE`
   - `note TEXT DEFAULT ''`
   - `ranking INTEGER DEFAULT 0`
   - `updated_at TIMESTAMP DEFAULT NOW()`
   - Constraint: `UNIQUE(user_id, team_id)`
   - Index: `idx_private_notes_user_id`

5. **presentations**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE`
   - `status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'current', 'completed'))`
   - `started_at TIMESTAMP`
   - `completed_at TIMESTAMP`
   - Indexes: `idx_presentations_status`, `idx_presentations_team_id`

6. **timer_state**
   - `id VARCHAR(50) PRIMARY KEY DEFAULT 'global'`
   - `is_active BOOLEAN DEFAULT FALSE`
   - `duration_seconds INTEGER DEFAULT 300`
   - `started_at TIMESTAMP`
   - `paused_at TIMESTAMP`
   - `elapsed_seconds INTEGER DEFAULT 0`
   - `presentation_id UUID REFERENCES presentations(id)`

**Additional Schema Elements:**

- Triggers for `updated_at` timestamps (auto-update on row modification)
- Check constraints for data validation
- Foreign key constraints with appropriate CASCADE/SET NULL behavior
- Indexes on frequently queried columns

### 2.2 Migration System

**File**: `packages/server/src/core/migrations/index.ts`

- Create migration runner that executes SQL files in order
- Track applied migrations in `schema_migrations` table
- Support for up/down migrations (optional)
- Integration with application startup

**File**: `packages/server/src/core/migrations/001_initial_schema.sql`

- Complete SQL schema as described above

## Phase 3: Query Layer Implementation

### 3.1 Create Query Files for Each Module

**Pattern**: Each module gets a `.queries.ts` file with parameterized SQL queries

**File**: `packages/server/src/modules/auth/auth.queries.ts`

- `findUserByEmail(email: string): Promise<User | null>`
- `findUserById(id: string): Promise<User | null>`
- `createUser(user: CreateUserInput): Promise<User>`
- `updateUserPassword(id: string, hashedPassword: string): Promise<void>`

**File**: `packages/server/src/modules/teams/teams.queries.ts`

- `getAllTeams(): Promise<Team[]>`
- `getTeamById(id: string): Promise<Team | null>`
- `createTeam(team: CreateTeamInput): Promise<Team>`
- `updateTeam(id: string, updates: UpdateTeamInput): Promise<Team>`
- `deleteTeam(id: string): Promise<void>`
- `getTeamMembers(teamId: string): Promise<User[]>`
- `assignUserToTeam(userId: string, teamId: string): Promise<void>`
- `removeUserFromTeam(userId: string, teamId: string): Promise<void>`

**File**: `packages/server/src/modules/voting/voting.queries.ts`

- `submitVote(vote: VoteInput): Promise<Vote>`
- `getUserVotes(userId: string): Promise<Vote[]>`
- `getFinalVote(userId: string): Promise<Vote | null>`
- `getVoteCount(teamId: string): Promise<number>`
- `updatePrivateNote(note: PrivateNoteInput): Promise<PrivateNote>`
- `getPrivateNotes(userId: string): Promise<PrivateNote[]>`
- `getUserRankings(userId: string): Promise<Ranking[]>`

**File**: `packages/server/src/modules/presentations/presentations.queries.ts`

- `getAllPresentations(): Promise<Presentation[]>`
- `getCurrentPresentation(): Promise<Presentation | null>`
- `createPresentation(teamId: string): Promise<Presentation>`
- `updatePresentationStatus(id: string, status: string): Promise<Presentation>`
- `getTimerState(): Promise<TimerState | null>`
- `updateTimerState(state: TimerStateInput): Promise<TimerState>`

**File**: `packages/server/src/modules/leaderboard/leaderboard.queries.ts`

- `getLeaderboardEntries(): Promise<LeaderboardEntry[]>`
- `getTeamVoteCount(teamId: string): Promise<number>`
- Complex query with JOINs for ranking calculation

### 3.2 Query Implementation Pattern

Each query function should:
- Use parameterized queries (`$1`, `$2`, etc.)
- Handle errors appropriately
- Return typed results
- Use transactions for multi-step operations
- Include proper error messages

**Example Pattern:**

```typescript
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, email, password, name, role, team_id, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}
```

## Phase 4: Service Layer Refactoring

### 4.1 Refactor Auth Service

**File**: `packages/server/src/modules/auth/auth.service.ts`

- Replace in-memory storage with database queries
- Import queries from `auth.queries.ts`
- Maintain same public API
- Update error handling for database errors

### 4.2 Refactor Teams Service

**File**: `packages/server/src/modules/teams/teams.service.ts`

- Replace Map-based storage with database queries
- Use transactions for member assignment operations
- Maintain team size validation logic
- Update all CRUD operations

### 4.3 Refactor Voting Service

**File**: `packages/server/src/modules/voting/voting.service.ts`

- Replace in-memory storage with database queries
- Implement vote validation using database constraints
- Use transactions for vote submission
- Update leaderboard calculation queries

### 4.4 Refactor Presentation Service

**File**: `packages/server/src/modules/presentations/presentations.service.ts` (if exists)

- Replace in-memory storage with database queries
- Implement timer state persistence
- Update presentation queue management

### 4.5 Refactor Leaderboard Service

**File**: `packages/server/src/modules/leaderboard/leaderboard.service.ts`

- Replace in-memory calculations with SQL aggregations
- Use efficient JOIN queries for rankings
- Implement tie-handling in SQL

## Phase 5: Remove Prisma

### 5.1 Remove Prisma Files

- Delete `prisma/schema.prisma`
- Delete `prisma/migrations/` directory (if exists)
- Remove Prisma scripts from `package.json`

### 5.2 Update Package Scripts

**File**: `package.json`

Replace Prisma scripts:
- Remove: `db:generate`, `db:push`, `db:migrate`, `db:studio`
- Add: `db:migrate` (runs custom migration system)
- Add: `db:seed` (optional, for seeding data)

### 5.3 Update Documentation

- Update README with new database setup instructions
- Document migration process
- Update environment variable documentation

## Phase 6: Testing & Validation

### 6.1 Database Connection Testing

- Test connection pool initialization
- Test connection error handling
- Test transaction rollback on errors

### 6.2 Query Testing

- Test all CRUD operations
- Test complex queries (JOINs, aggregations)
- Test constraint violations
- Test foreign key cascades

### 6.3 Integration Testing

- Test full voting flow with database
- Test team management with database
- Test leaderboard calculations
- Test concurrent access scenarios

## Architecture Benefits

1. **Performance**: Raw SQL with optimized queries, no ORM overhead
2. **Control**: Direct query optimization and execution plan control
3. **Simplicity**: No ORM abstraction layer, clearer code paths
4. **Type Safety**: Manual type definitions or `pgtyped` for compile-time safety
5. **Migration Control**: Custom migration system with full SQL control
6. **Best Practices**: Follows 2026 recommendations for high-performance Node.js + PostgreSQL

## Migration Strategy

1. **Parallel Implementation**: Keep in-memory storage working while building database layer
2. **Feature Flags**: Use environment variable to switch between in-memory and database
3. **Gradual Migration**: Migrate one module at a time (auth → teams → voting → presentations)
4. **Testing**: Test each module thoroughly before moving to next
5. **Rollback Plan**: Keep in-memory code until database is fully validated

## Files to Create/Modify

### New Files
- `packages/server/src/core/db/pool.ts`
- `packages/server/src/core/db/client.ts`
- `packages/server/src/core/db/types.ts`
- `packages/server/src/core/migrations/index.ts`
- `packages/server/src/core/migrations/001_initial_schema.sql`
- `packages/server/src/modules/auth/auth.queries.ts`
- `packages/server/src/modules/teams/teams.queries.ts`
- `packages/server/src/modules/voting/voting.queries.ts`
- `packages/server/src/modules/presentations/presentations.queries.ts` (if needed)
- `packages/server/src/modules/leaderboard/leaderboard.queries.ts`

### Modified Files
- `packages/server/package.json` (add `pg`, remove Prisma)
- `packages/server/src/modules/auth/auth.service.ts`
- `packages/server/src/modules/teams/teams.service.ts`
- `packages/server/src/modules/voting/voting.service.ts`
- `packages/server/src/modules/leaderboard/leaderboard.service.ts`
- `package.json` (update scripts)
- `.env.example` or documentation

### Deleted Files
- `prisma/schema.prisma`
- `prisma/migrations/` (if exists)

## Security Considerations

1. **Parameterized Queries**: All queries use parameterized statements to prevent SQL injection
2. **Connection Pooling**: Limits concurrent connections to prevent resource exhaustion
3. **Input Validation**: Maintain Zod validation before database operations
4. **Error Handling**: Don't expose database errors to clients
5. **Transaction Safety**: Use transactions for multi-step operations

## Performance Optimizations

1. **Indexes**: Strategic indexes on foreign keys and frequently queried columns
2. **Query Optimization**: Use EXPLAIN ANALYZE to optimize complex queries
3. **Connection Pooling**: Proper pool sizing based on expected load
4. **Prepared Statements**: Reuse prepared statements where beneficial
5. **Batch Operations**: Use transactions for bulk operations
