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

// Re-export common validation schemas from validators
export {
  teamIdParamSchema,
  userIdParamSchema,
  presentationIdParamSchema,
  uuidParamSchema,
} from './validators';
