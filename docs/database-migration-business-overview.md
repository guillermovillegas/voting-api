# Database Migration: Business Overview

## Executive Summary

This document explains the database migration project in non-technical terms, mapping each technical phase to business requirements and explaining why each step is critical for the hackathon voting application.

## Why This Migration Matters

Currently, the voting application stores all data in temporary memory. This means:
- **Data is lost when the server restarts** - All votes, teams, and user information disappears
- **No persistence** - The app cannot reliably track voting history or results
- **Limited scalability** - Cannot handle multiple server instances or high traffic
- **No audit trail** - Cannot verify vote integrity or track changes over time

Moving to a proper database ensures **data permanence, reliability, and scalability** - essential for a production voting system where accuracy and trust are paramount.

---

## Phase 1: Building the Foundation

**What We're Doing**: Setting up the infrastructure to connect to and communicate with the database.

**Why It Matters**: 
- **Reliability**: Establishes a stable connection system that can handle multiple users simultaneously
- **Performance**: Uses connection pooling (like a phone operator managing multiple calls efficiently) to serve 70 participants without slowdowns
- **Security**: Creates a secure channel for all data operations

**Business Impact**: 
- Ensures the app can handle all 70 participants voting simultaneously
- Prevents connection failures during critical voting moments
- Provides the foundation for all future data operations

**Maps to Requirements**: 
- Supports "70 participants across 15 teams" requirement
- Enables real-time voting without data loss
- Foundation for all core features (authentication, voting, leaderboard)

---

## Phase 2: Creating the Data Structure

**What We're Doing**: Designing and creating the database tables that will store all application data.

**Why It Matters**:
- **Data Organization**: Creates structured storage for users, teams, votes, presentations, and timer state
- **Data Integrity**: Enforces rules (like "one final vote per user" and "cannot vote for own team") at the database level
- **Relationships**: Links related data (users to teams, votes to teams, etc.) so information stays consistent

**Business Impact**:
- **Vote Security**: Database-level constraints prevent voting fraud (e.g., voting twice, voting for own team)
- **Data Accuracy**: Ensures team assignments, vote counts, and rankings are always correct
- **Audit Capability**: Timestamps and relationships enable tracking who voted when and for whom

**Maps to Requirements**:
- **Authentication & Authorization**: Users table stores login credentials and roles (admin/voter)
- **Team Management**: Teams table with member relationships (3-6 members per team)
- **Voting System**: Votes table with constraints preventing self-voting and duplicate final votes
- **Presentation Queue**: Presentations table tracks which teams have presented and in what order
- **Timer State**: Stores the single global timer state that syncs across all devices
- **Leaderboard**: Vote relationships enable real-time ranking calculations

**Key Tables Explained**:

1. **Users Table**: Stores all participant information (email, name, role, team assignment)
   - Supports requirement: "Email/password authentication" and "Role-based access (Admin vs Voter)"

2. **Teams Table**: Stores team information and presentation order
   - Supports requirement: "15 teams (3-6 members each)" and "Randomize presentation order"

3. **Votes Table**: Stores all votes with final vote tracking
   - Supports requirement: "One-time submission (cannot change after submit)" and "Cannot vote for own team"

4. **Private Notes Table**: Stores personal ranking notes (not shared)
   - Supports requirement: "Private notes/feedback per team (not shared)" and "Stack ranking interface"

5. **Presentations Table**: Tracks presentation status and timing
   - Supports requirement: "Presentation status tracking (upcoming, current, completed)"

6. **Timer State Table**: Stores the single global timer
   - Supports requirement: "Single presentation timer" and "Timer state stored on server"

---

## Phase 3: Creating Data Access Functions

**What We're Doing**: Building the functions that read from and write to the database for each feature.

**Why It Matters**:
- **Security**: All database operations use parameterized queries (prevents hacking attempts)
- **Organization**: Each feature (auth, teams, voting, etc.) has its own set of database functions
- **Efficiency**: Optimized queries ensure fast response times even with 70 concurrent users

**Business Impact**:
- **Fast Response Times**: Users experience quick login, voting, and leaderboard updates
- **Security**: Protects against data breaches and vote manipulation
- **Maintainability**: Clear organization makes it easier to fix issues or add features

**Maps to Requirements**:

**Authentication Functions**:
- Find user by email (login requirement)
- Create new user (registration requirement)
- Update password (password management)

**Team Management Functions**:
- Get all teams (team listing requirement)
- Create/edit teams (admin team management requirement)
- Assign members to teams (member assignment requirement, 3-6 members)
- Prevent duplicate assignments (requirement: "Prevent duplicate team assignments")

**Voting Functions**:
- Submit vote (final vote submission requirement)
- Get vote count (leaderboard calculation requirement)
- Update private notes (personal notes requirement)
- Get user rankings (stack ranking interface requirement)
- Enforce one final vote per user (requirement: "One-time submission")

**Presentation Functions**:
- Get current presentation (current presentation indicator requirement)
- Update presentation status (admin controls requirement)
- Manage timer state (single timer requirement)

**Leaderboard Functions**:
- Calculate rankings (real-time leaderboard requirement)
- Get vote counts (vote count display requirement)
- Handle ties (tie handling requirement: "Show ties as ties")

---

## Phase 4: Connecting Features to Database

**What We're Doing**: Updating each feature (authentication, teams, voting, leaderboard) to use the database instead of temporary memory.

**Why It Matters**:
- **Data Persistence**: All operations now save permanently
- **Consistency**: All features use the same data source, ensuring consistency
- **Reliability**: Data survives server restarts and can be backed up

**Business Impact**:
- **No Data Loss**: Votes, teams, and user data persist across server restarts
- **Multi-User Support**: Multiple users can interact simultaneously without conflicts
- **Audit Trail**: Complete history of all votes and changes for transparency

**Maps to Requirements**:

**Authentication Service**:
- User login now persists across sessions (requirement: "Session management")
- User roles and permissions stored permanently (requirement: "Role-based access")

**Teams Service**:
- Team data persists (requirement: "Admin can create/edit teams")
- Member assignments saved permanently (requirement: "Admin can assign members to teams")
- Team size validation enforced (requirement: "3-6 members")

**Voting Service**:
- Votes are permanently stored (requirement: "One-time submission (cannot change after submit)")
- Vote validation enforced at database level (requirement: "Cannot vote for own team")
- Private notes persist (requirement: "Private notes/feedback per team")
- Final vote tracking (requirement: "Team at top of ranked list becomes the final vote")

**Leaderboard Service**:
- Rankings calculated from persistent data (requirement: "Stack ranking based on #1 position votes")
- Real-time updates from database (requirement: "Real-time updates as votes come in")
- Only shows teams that presented (requirement: "Only shows teams that have presented")

---

## Phase 5: Removing Old System

**What We're Doing**: Removing the Prisma ORM (Object-Relational Mapping) system that was planned but never used, and cleaning up related files.

**Why It Matters**:
- **Simplification**: Removes unused code and dependencies
- **Clarity**: Eliminates confusion about which system is actually being used
- **Maintenance**: Reduces codebase complexity for future developers

**Business Impact**:
- **Faster Development**: Less code to maintain means faster feature development
- **Lower Risk**: Fewer dependencies means fewer potential security vulnerabilities
- **Clearer Architecture**: Future developers understand the system more easily

**Maps to Requirements**:
- Supports overall requirement for a maintainable, scalable system
- Enables future enhancements without technical debt

---

## Phase 6: Testing and Validation

**What We're Doing**: Thoroughly testing all database operations to ensure everything works correctly.

**Why It Matters**:
- **Vote Integrity**: Ensures votes are counted accurately and cannot be manipulated
- **Data Consistency**: Verifies that all relationships and constraints work correctly
- **Performance**: Confirms the system can handle 70 concurrent users
- **Reliability**: Tests error handling and recovery scenarios

**Business Impact**:
- **Trust**: Stakeholders can trust that votes are accurate and secure
- **Confidence**: Team can deploy to production knowing the system is tested
- **Compliance**: Ensures voting rules are enforced correctly (no self-voting, one vote per user, etc.)

**Maps to Requirements**:
- **Vote Enforcement**: Tests that "cannot vote for own team" is strictly enforced
- **One-Time Submission**: Verifies "cannot change after submit" works correctly
- **Real-Time Updates**: Tests that leaderboard updates in real-time as votes come in
- **Concurrent Access**: Ensures 70 participants can vote simultaneously without issues
- **Data Persistence**: Verifies data survives server restarts

---

## Success Criteria

The migration will be considered successful when:

1. ✅ **All data persists** - Votes, teams, and user data survive server restarts
2. ✅ **Voting rules enforced** - Database prevents self-voting, duplicate votes, and other violations
3. ✅ **Performance maintained** - System handles 70 concurrent users without slowdowns
4. ✅ **Real-time features work** - Leaderboard and timer sync correctly across all devices
5. ✅ **Data integrity** - All relationships (users to teams, votes to teams) remain consistent
6. ✅ **Security maintained** - All database operations are secure and protected from attacks

---

## Risk Mitigation

**Risk**: Data loss during migration
- **Mitigation**: Parallel implementation - keep old system working while building new one

**Risk**: Performance degradation
- **Mitigation**: Optimized queries and connection pooling ensure fast response times

**Risk**: Breaking existing features
- **Mitigation**: Gradual migration - one feature at a time, with thorough testing

**Risk**: Security vulnerabilities
- **Mitigation**: Parameterized queries prevent SQL injection, input validation maintained

---

## Timeline Overview

- **Phase 1-2**: Foundation and schema (establishes infrastructure)
- **Phase 3**: Query layer (enables all data operations)
- **Phase 4**: Service integration (connects features to database)
- **Phase 5**: Cleanup (removes unused code)
- **Phase 6**: Testing (ensures everything works)

Each phase builds on the previous one, ensuring a stable, reliable migration.

---

## Questions?

This migration is essential for making the voting application production-ready. It transforms a temporary demo system into a reliable, scalable platform that can handle the hackathon's requirements with confidence.

For technical details, see `database-migration-technical-plan.md`.
