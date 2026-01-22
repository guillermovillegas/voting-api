/**
 * API Error Classes
 *
 * Standardized error classes following RFC 9457 Problem Details format.
 * All API errors extend from ApiError base class.
 *
 * OWNERSHIP: AGENT_INFRA
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly type: string;
  public readonly detail?: string;
  public readonly instance?: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    detail?: string,
    instance?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.type = `https://api.voting.app/errors/${code.toLowerCase()}`;
    this.detail = detail;
    this.instance = instance;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to RFC 9457 Problem Details format
   */
  toProblemDetails(): {
    success: false;
    error: string;
    code: string;
    type: string;
    status: number;
    detail?: string;
    instance?: string;
    timestamp: string;
  } {
    return {
      success: false,
      error: this.message,
      code: this.code,
      type: this.type,
      status: this.statusCode,
      detail: this.detail,
      instance: this.instance,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

/**
 * Validation Error (400)
 * Used when request data fails validation
 */
export class ValidationError extends ApiError {
  constructor(message: string, detail?: string, instance?: string) {
    super(message, 400, 'VALIDATION_ERROR', detail, instance);
  }
}

/**
 * Unauthorized Error (401)
 * Used when authentication is required but missing or invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required', detail?: string) {
    super(message, 401, 'UNAUTHORIZED', detail);
  }
}

/**
 * Forbidden Error (403)
 * Used when user is authenticated but lacks permission
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access forbidden', detail?: string) {
    super(message, 403, 'FORBIDDEN', detail);
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', `The requested ${resource.toLowerCase()} does not exist`);
  }
}

/**
 * Conflict Error (409)
 * Used when operation conflicts with current state
 */
export class ConflictError extends ApiError {
  constructor(message: string, detail?: string) {
    super(message, 409, 'CONFLICT', detail);
  }
}

/**
 * Unprocessable Entity Error (422)
 * Used when request is valid but business logic prevents processing
 */
export class UnprocessableEntityError extends ApiError {
  constructor(message: string, detail?: string) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', detail);
  }
}

/**
 * Rate Limit Error (429)
 * Used when rate limit is exceeded
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(
      message,
      429,
      'RATE_LIMIT_EXCEEDED',
      retryAfter ? `Retry after ${retryAfter} seconds` : undefined
    );
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', detail?: string) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', detail);
  }
}

// ============================================================================
// ERROR TYPE GUARDS
// ============================================================================

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
