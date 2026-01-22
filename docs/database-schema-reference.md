# Database Schema Reference

This document describes the actual database schema as deployed to PostgreSQL. The schema was created via migration `001_initial_schema.sql` and verified on **2026-01-20**.

## Database Information

- **Database**: `training`
- **Schema**: `public`
- **PostgreSQL Version**: 17.7
- **Host**: `psql-training-dev-eastus2-001.postgres.database.azure.com`

## Migration Status

| Version | Name | Applied At |
|---------|------|------------|
| 001_initial_schema | 001_initial_schema | 2026-01-20 |

## Custom Types (ENUMs)

### user_role
- `admin`
- `voter`

### presentation_status
- `upcoming`
- `current`
- `completed`

## Tables

### users

Application users (admins and voters).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `email` | `varchar(255)` | NOT NULL | - | Unique email address |
| `password` | `varchar(255)` | NOT NULL | - | Hashed password |
| `name` | `varchar(255)` | NOT NULL | - | User's full name |
| `role` | `user_role` | NOT NULL | `'voter'` | User role (admin or voter) |
| `team_id` | `uuid` | NULL | - | Foreign key to teams table |
| `created_at` | `timestamp` | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | `timestamp` | NOT NULL | `now()` | Last update timestamp (auto-updated) |

**Indexes:**
- Primary Key: `users_pkey` on `id`
- Unique: `users_email_key` on `email`
- Index: `idx_users_email` on `email`
- Index: `idx_users_team_id` on `team_id`

**Foreign Keys:**
- `fk_users_team_id`: `team_id` → `teams(id)` ON DELETE SET NULL

**Triggers:**
- `update_users_updated_at`: Automatically updates `updated_at` on row update

**Referenced By:**
- `private_notes.user_id` (CASCADE delete)
- `votes.user_id` (CASCADE delete)

---

### teams

Hackathon teams (3-6 members each).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `name` | `varchar(255)` | NOT NULL | - | Unique team name |
| `presentation_order` | `integer` | NULL | - | Order in which team will present (nullable until randomized) |
| `has_presented` | `boolean` | NOT NULL | `false` | Whether team has completed their presentation |
| `created_at` | `timestamp` | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | `timestamp` | NOT NULL | `now()` | Last update timestamp (auto-updated) |

**Indexes:**
- Primary Key: `teams_pkey` on `id`
- Unique: `teams_name_key` on `name`
- Index: `idx_teams_presentation_order` on `presentation_order`
- Index: `idx_teams_has_presented` on `has_presented`

**Triggers:**
- `update_teams_updated_at`: Automatically updates `updated_at` on row update

**Referenced By:**
- `users.team_id` (SET NULL on delete)
- `presentations.team_id` (CASCADE delete)
- `private_notes.team_id` (CASCADE delete)
- `votes.team_id` (CASCADE delete)

---

### votes

User votes for teams. One final vote per user enforced.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NOT NULL | - | Foreign key to users |
| `team_id` | `uuid` | NOT NULL | - | Foreign key to teams (team being voted for) |
| `is_final_vote` | `boolean` | NOT NULL | `false` | True if this is the user's final vote (one per user) |
| `public_note` | `text` | NULL | - | Optional public note explaining why team was chosen |
| `submitted_at` | `timestamp` | NOT NULL | `now()` | Vote submission timestamp |

**Indexes:**
- Primary Key: `votes_pkey` on `id`
- Unique: `idx_votes_one_final_vote_per_user` on `(user_id, is_final_vote)` WHERE `is_final_vote = true`
- Index: `idx_votes_user_id` on `user_id`
- Index: `idx_votes_team_id` on `team_id`
- Index: `idx_votes_is_final_vote` on `is_final_vote`
- Index: `idx_votes_submitted_at` on `submitted_at`

**Foreign Keys:**
- `votes_user_id_fkey`: `user_id` → `users(id)` ON DELETE CASCADE
- `votes_team_id_fkey`: `team_id` → `teams(id)` ON DELETE CASCADE

**Constraints:**
- Unique constraint ensures only one final vote per user (`idx_votes_one_final_vote_per_user`)

---

### private_notes

Private notes and rankings (not shared between users).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NOT NULL | - | Foreign key to users |
| `team_id` | `uuid` | NOT NULL | - | Foreign key to teams |
| `note` | `text` | NOT NULL | `''` | Private note text |
| `ranking` | `integer` | NOT NULL | `0` | User's personal ranking of this team |
| `updated_at` | `timestamp` | NOT NULL | `now()` | Last update timestamp (auto-updated) |

**Indexes:**
- Primary Key: `private_notes_pkey` on `id`
- Unique: `idx_private_notes_user_team` on `(user_id, team_id)` - One note per user-team combination
- Index: `idx_private_notes_user_id` on `user_id`
- Index: `idx_private_notes_team_id` on `team_id`

**Foreign Keys:**
- `private_notes_user_id_fkey`: `user_id` → `users(id)` ON DELETE CASCADE
- `private_notes_team_id_fkey`: `team_id` → `teams(id)` ON DELETE CASCADE

**Triggers:**
- `update_private_notes_updated_at`: Automatically updates `updated_at` on row update

---

### presentations

Team presentations with status tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `team_id` | `uuid` | NOT NULL | - | Foreign key to teams |
| `status` | `presentation_status` | NOT NULL | `'upcoming'` | Presentation status (upcoming, current, completed) |
| `started_at` | `timestamp` | NULL | - | When presentation started |
| `completed_at` | `timestamp` | NULL | - | When presentation completed |
| `created_at` | `timestamp` | NOT NULL | `now()` | Creation timestamp |

**Indexes:**
- Primary Key: `presentations_pkey` on `id`
- Index: `idx_presentations_team_id` on `team_id`
- Index: `idx_presentations_status` on `status`

**Foreign Keys:**
- `presentations_team_id_fkey`: `team_id` → `teams(id)` ON DELETE CASCADE

**Referenced By:**
- `timer_state.presentation_id` (SET NULL on delete)

---

### timer_state

Single global timer state for presentations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `varchar(50)` | NOT NULL | `'global'` | Primary key (always 'global') |
| `is_active` | `boolean` | NOT NULL | `false` | Whether timer is currently active |
| `duration_seconds` | `integer` | NOT NULL | `300` | Fixed duration for all presentations (default 300 = 5 minutes) |
| `started_at` | `timestamp` | NULL | - | When timer was started |
| `paused_at` | `timestamp` | NULL | - | When timer was paused |
| `elapsed_seconds` | `integer` | NOT NULL | `0` | Elapsed time in seconds |
| `presentation_id` | `uuid` | NULL | - | Foreign key to current presentation |

**Indexes:**
- Primary Key: `timer_state_pkey` on `id`
- Index: `idx_timer_state_presentation_id` on `presentation_id`

**Foreign Keys:**
- `timer_state_presentation_id_fkey`: `presentation_id` → `presentations(id)` ON DELETE SET NULL

---

### schema_migrations

Tracks applied database migrations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `version` | `varchar(255)` | NOT NULL | - | Migration version (primary key) |
| `name` | `varchar(255)` | NOT NULL | - | Migration name |
| `applied_at` | `timestamp` | NOT NULL | `now()` | When migration was applied |

**Indexes:**
- Primary Key: `schema_migrations_pkey` on `version`
- Index: `idx_schema_migrations_applied_at` on `applied_at`

---

## Relationships

```
users
  ├── team_id → teams.id (SET NULL)
  ├── ← private_notes.user_id (CASCADE)
  └── ← votes.user_id (CASCADE)

teams
  ├── ← users.team_id (SET NULL)
  ├── ← presentations.team_id (CASCADE)
  ├── ← private_notes.team_id (CASCADE)
  └── ← votes.team_id (CASCADE)

presentations
  ├── team_id → teams.id (CASCADE)
  └── ← timer_state.presentation_id (SET NULL)
```

## Key Constraints

1. **One Final Vote Per User**: Unique constraint on `votes(user_id, is_final_vote)` WHERE `is_final_vote = true`
2. **One Note Per User-Team**: Unique constraint on `private_notes(user_id, team_id)`
3. **Unique Email**: Unique constraint on `users.email`
4. **Unique Team Name**: Unique constraint on `teams.name`
5. **Single Timer**: Primary key on `timer_state.id` (always 'global')

## Automatic Features

### Triggers

All tables with `updated_at` columns have triggers that automatically update the timestamp on row updates:
- `update_users_updated_at`
- `update_teams_updated_at`
- `update_private_notes_updated_at`

### Defaults

- UUIDs are auto-generated using `gen_random_uuid()` (PostgreSQL 13+ built-in function)
- Timestamps default to `now()` for `created_at` columns
- `updated_at` is automatically maintained by triggers

## Indexes Summary

| Table | Index Count | Purpose |
|-------|-------------|---------|
| `users` | 4 | Email lookup, team membership queries |
| `teams` | 4 | Name lookup, presentation order sorting, status filtering |
| `votes` | 6 | User votes, team votes, final vote enforcement, timestamp queries |
| `private_notes` | 4 | User notes, team notes, unique user-team constraint |
| `presentations` | 3 | Team presentations, status filtering |
| `timer_state` | 2 | Primary key, presentation lookup |
| `schema_migrations` | 2 | Migration tracking |

**Total Indexes**: 25 (including primary keys and unique constraints)

## Data Integrity Rules

1. **Cascade Deletes**: When a team is deleted, all related votes, presentations, and private notes are deleted
2. **Set NULL on Delete**: When a team is deleted, user team assignments are set to NULL (users remain)
3. **Self-Vote Prevention**: Enforced at application level (user cannot vote for their own team)
4. **One Final Vote**: Database constraint ensures only one final vote per user
5. **Team Size Validation**: Enforced at application level (3-6 members per team)

## Migration Verification

✅ All tables created successfully
✅ All indexes created successfully
✅ All foreign key constraints created successfully
✅ All triggers created successfully
✅ All ENUMs created successfully
✅ Migration tracking table populated

**Migration Applied**: `001_initial_schema` on 2026-01-20
