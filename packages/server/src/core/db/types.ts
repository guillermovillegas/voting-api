/**
 * Database Type Definitions
 *
 * TypeScript interfaces matching database row structures.
 * These types represent the shape of data as it comes from PostgreSQL.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import type { QueryResultRow } from 'pg';

// ============================================================================
// USER TYPES
// ============================================================================

export interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'voter';
  team_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// TEAM TYPES
// ============================================================================

export interface TeamRow {
  id: string;
  name: string;
  presentation_order: number | null;
  has_presented: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// VOTE TYPES
// ============================================================================

export interface VoteRow {
  id: string;
  user_id: string;
  team_id: string;
  is_final_vote: boolean;
  public_note: string | null;
  submitted_at: Date;
}

// ============================================================================
// PRIVATE NOTE TYPES
// ============================================================================

export interface PrivateNoteRow {
  id: string;
  user_id: string;
  team_id: string;
  note: string;
  ranking: number;
  updated_at: Date;
}

// ============================================================================
// PRESENTATION TYPES
// ============================================================================

export interface PresentationRow {
  id: string;
  team_id: string;
  status: 'upcoming' | 'current' | 'completed';
  started_at: Date | null;
  completed_at: Date | null;
}

// ============================================================================
// TIMER STATE TYPES
// ============================================================================

export interface TimerStateRow {
  id: string;
  is_active: boolean;
  duration_seconds: number;
  started_at: Date | null;
  paused_at: Date | null;
  elapsed_seconds: number;
  presentation_id: string | null;
}

// ============================================================================
// QUERY RESULT TYPES
// ============================================================================

export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number;
}

// Re-export for convenience
export type { QueryResultRow };

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface TransactionClient {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  release(): void;
}
