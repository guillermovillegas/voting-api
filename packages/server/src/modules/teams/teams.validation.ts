/**
 * Team Validation Schemas
 *
 * OWNERSHIP: AGENT_TEAMS
 * Zod validation schemas for team-related operations
 */

import { z } from 'zod';

// Constants for team validation
export const TEAM_MIN_SIZE = 3;
export const TEAM_MAX_SIZE = 6;
export const TEAM_NAME_MIN_LENGTH = 2;
export const TEAM_NAME_MAX_LENGTH = 100;

// Schema for creating a new team
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(TEAM_NAME_MIN_LENGTH, `Team name must be at least ${TEAM_NAME_MIN_LENGTH} characters`)
    .max(TEAM_NAME_MAX_LENGTH, `Team name must be at most ${TEAM_NAME_MAX_LENGTH} characters`)
    .trim(),
  memberIds: z
    .array(z.string().uuid('Invalid user ID format'))
    .min(TEAM_MIN_SIZE, `Team must have at least ${TEAM_MIN_SIZE} members`)
    .max(TEAM_MAX_SIZE, `Team must have at most ${TEAM_MAX_SIZE} members`)
    .optional(),
});

// Schema for updating a team
export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(TEAM_NAME_MIN_LENGTH, `Team name must be at least ${TEAM_NAME_MIN_LENGTH} characters`)
    .max(TEAM_NAME_MAX_LENGTH, `Team name must be at most ${TEAM_NAME_MAX_LENGTH} characters`)
    .trim()
    .optional(),
  presentationOrder: z.number().int().positive().nullable().optional(),
  hasPresented: z.boolean().optional(),
});

// Schema for adding members to a team
export const addMembersSchema = z.object({
  memberIds: z
    .array(z.string().uuid('Invalid user ID format'))
    .min(1, 'At least one member ID is required'),
});

// Schema for removing members from a team
export const removeMembersSchema = z.object({
  memberIds: z
    .array(z.string().uuid('Invalid user ID format'))
    .min(1, 'At least one member ID is required'),
});

// Schema for team ID parameter
export const teamIdSchema = z.object({
  teamId: z.string().uuid('Invalid team ID format'),
});

// Schema for member assignment validation
export const memberAssignmentSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  teamId: z.string().uuid('Invalid team ID format'),
});

// Type exports inferred from schemas
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddMembersInput = z.infer<typeof addMembersSchema>;
export type RemoveMembersInput = z.infer<typeof removeMembersSchema>;
export type TeamIdParams = z.infer<typeof teamIdSchema>;
export type MemberAssignmentInput = z.infer<typeof memberAssignmentSchema>;

// Validation helper function
export function validateTeamSize(currentSize: number, addCount: number, removeCount: number): {
  valid: boolean;
  error?: string;
} {
  const newSize = currentSize + addCount - removeCount;

  if (newSize < TEAM_MIN_SIZE) {
    return {
      valid: false,
      error: `Team size cannot be less than ${TEAM_MIN_SIZE}. Current: ${currentSize}, After change: ${newSize}`,
    };
  }

  if (newSize > TEAM_MAX_SIZE) {
    return {
      valid: false,
      error: `Team size cannot exceed ${TEAM_MAX_SIZE}. Current: ${currentSize}, After change: ${newSize}`,
    };
  }

  return { valid: true };
}
