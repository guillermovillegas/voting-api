/**
 * Rate Limiting Configuration
 *
 * Configures rate limiting for different endpoint types.
 * Prevents abuse and DoS attacks.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

/**
 * Rate limiter for authentication endpoints
 * Stricter limits to prevent brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Rate limiter for vote submission endpoints
 * Prevents vote manipulation
 */
export const voteRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many vote requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many vote requests, please slow down',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Rate limiter for general API endpoints
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Rate limiter for admin endpoints
 * Higher limit for admin operations
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many admin requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Strict rate limiter for sensitive operations
 * Used for password changes, system resets, etc.
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many requests for this operation, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests for this operation, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});
