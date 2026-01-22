/**
 * API Middleware
 *
 * Shared middleware for request handling, error handling, and response formatting.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError, isApiError, InternalServerError } from './errors';
import { errorResponse } from './response';

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Centralized error handling middleware
 * Converts all errors to standardized API responses
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging
  console.error('API Error:', {
    error,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle known API errors
  if (isApiError(error)) {
    const problemDetails = error.toProblemDetails();
    res.status(error.statusCode).json(problemDetails);
    return;
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ message: string; path: (string | number)[] }> };
    const firstIssue = zodError.issues[0];
    const field = firstIssue?.path.join('.') || 'input';
    const message = firstIssue?.message || 'Validation failed';

    res.status(400).json(
      errorResponse(`Invalid ${field}: ${message}`, 'VALIDATION_ERROR', 400, message, req.path)
    );
    return;
  }

  // Handle database errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; message?: string };
    // Don't expose database error details to clients
    const apiError = new InternalServerError('Database operation failed');
    res.status(500).json(apiError.toProblemDetails());
    return;
  }

  // Handle unknown errors
  const apiError = new InternalServerError(
    'An unexpected error occurred',
    error instanceof Error ? error.message : 'Unknown error'
  );
  res.status(500).json(apiError.toProblemDetails());
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(
    errorResponse(
      `Route ${req.method} ${req.path} not found`,
      'NOT_FOUND',
      404,
      'The requested endpoint does not exist',
      req.path
    )
  );
}

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Log all API requests for debugging and monitoring
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

// ============================================================================
// RESPONSE FORMATTER MIDDLEWARE
// ============================================================================

/**
 * Ensure all responses follow standard format
 * Wraps res.json to ensure consistent format
 */
export function responseFormatter(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    // If response already has success field, use as-is
    if (body && typeof body === 'object' && 'success' in body) {
      return originalJson(body);
    }

    // Otherwise, wrap in standard format
    return originalJson({
      success: true,
      data: body,
      timestamp: new Date().toISOString(),
    });
  };

  next();
}
