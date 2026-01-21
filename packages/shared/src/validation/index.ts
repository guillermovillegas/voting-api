/**
 * Shared Validation Schemas (Zod)
 *
 * OWNERSHIP: SHARED-APPEND
 * Add new schemas at the end. Do not modify existing schemas.
 */

import { z } from 'zod';
import { APP_CONFIG } from '../constants/index.js';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const userIdSchema = z.string().uuid();
export const teamIdSchema = z.string().uuid();
export const emailSchema = z.string().email();

// ============================================================================
// AUTH SCHEMAS (AGENT_AUTH)
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  name: z.string().min(2).max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================================================
// TEAM SCHEMAS (AGENT_TEAMS)
// ============================================================================

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
});

export const addMemberSchema = z.object({
  userId: userIdSchema,
});

export const teamMembersSchema = z.object({
  memberIds: z
    .array(userIdSchema)
    .min(APP_CONFIG.minTeamSize, `Team must have at least ${APP_CONFIG.minTeamSize} members`)
    .max(APP_CONFIG.maxTeamSize, `Team cannot have more than ${APP_CONFIG.maxTeamSize} members`),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type TeamMembersInput = z.infer<typeof teamMembersSchema>;

// ============================================================================
// VOTE SCHEMAS (AGENT_VOTING)
// ============================================================================

export const submitVoteSchema = z.object({
  teamId: teamIdSchema,
  publicNote: z.string().max(500).optional(),
});

export const updateRankingSchema = z.object({
  teamId: teamIdSchema,
  ranking: z.number().int().positive(),
});

export const privateNoteSchema = z.object({
  teamId: teamIdSchema,
  note: z.string().max(1000),
});

export type SubmitVoteInput = z.infer<typeof submitVoteSchema>;
export type UpdateRankingInput = z.infer<typeof updateRankingSchema>;
export type PrivateNoteInput = z.infer<typeof privateNoteSchema>;

// ============================================================================
// PRESENTATION SCHEMAS (AGENT_PRESENT)
// ============================================================================

export const presentationStatusSchema = z.enum(['upcoming', 'current', 'completed']);

export const timerControlSchema = z.object({
  action: z.enum(['start', 'pause', 'reset']),
});

export type TimerControlInput = z.infer<typeof timerControlSchema>;

// ============================================================================
// ADD NEW SCHEMAS BELOW THIS LINE
// Format: // Added by AGENT_<ID> - <date>
// ============================================================================
