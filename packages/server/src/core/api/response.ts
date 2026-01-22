/**
 * Standardized API Response Format
 *
 * Ensures all API responses follow a consistent format.
 * Follows 2026 best practices for API response standardization.
 *
 * OWNERSHIP: AGENT_INFRA
 */

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  type?: string;
  status?: number;
  detail?: string;
  instance?: string;
  timestamp: string;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create a success response
 */
export function successResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  code?: string,
  status?: number,
  detail?: string,
  instance?: string
): ErrorResponse {
  return {
    success: false,
    error,
    code,
    type: code ? `https://api.voting.app/errors/${code.toLowerCase()}` : undefined,
    status,
    detail,
    instance,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a paginated response
 */
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    timestamp: new Date().toISOString(),
  };
}
