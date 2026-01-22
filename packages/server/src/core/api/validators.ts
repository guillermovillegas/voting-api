/**
 * Shared Validation Utilities
 *
 * Common Zod schemas and validation functions used across the API.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email format');

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Team ID parameter
 */
export const teamIdParamSchema = z.object({
  teamId: uuidSchema,
});

/**
 * User ID parameter
 */
export const userIdParamSchema = z.object({
  userId: uuidSchema,
});

/**
 * Presentation ID parameter
 */
export const presentationIdParamSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

/**
 * Validate email format
 */
export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}

/**
 * Extract and validate pagination from query
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  return paginationSchema.parse(query);
}
