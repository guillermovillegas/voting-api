/**
 * Input Validation Middleware
 *
 * Validation utilities and middleware for request validation.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from './errors';

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body against Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        const field = firstError?.path.join('.') || 'body';
        const message = firstError?.message || 'Validation failed';
        throw new ValidationError(`Invalid ${field}: ${message}`, error.message);
      }
      throw new ValidationError('Invalid request body');
    }
  };
}

/**
 * Validate request query parameters against Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as unknown as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        const field = firstError?.path.join('.') || 'query';
        const message = firstError?.message || 'Validation failed';
        throw new ValidationError(`Invalid ${field}: ${message}`, error.message);
      }
      throw new ValidationError('Invalid query parameters');
    }
  };
}

/**
 * Validate request parameters against Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as unknown as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        const field = firstError?.path.join('.') || 'params';
        const message = firstError?.message || 'Validation failed';
        throw new ValidationError(`Invalid ${field}: ${message}`, error.message);
      }
      throw new ValidationError('Invalid route parameters');
    }
  };
}

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

/**
 * UUID parameter validation
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

/**
 * Team ID parameter validation
 */
export const teamIdParamSchema = z.object({
  teamId: z.string().uuid('Invalid team ID format'),
});

/**
 * User ID parameter validation
 */
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

/**
 * Presentation ID parameter validation
 */
export const presentationIdParamSchema = z.object({
  id: z.string().uuid('Invalid presentation ID format'),
});
