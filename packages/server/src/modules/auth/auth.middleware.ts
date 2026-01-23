/**
 * Auth Middleware
 * Protects routes and extracts authenticated user from JWT or X-User-Id header
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JWTPayload } from './auth.service';
import type { UserRole } from '@voting/shared';
import { findOrCreateAnonymousUser } from './auth.queries';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export type AuthenticatedRequest = Request & {
  user: JWTPayload;
};

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Middleware to authenticate via X-User-Id header
 * Used for training sessions - creates users with provided name
 * Falls through to JWT auth if X-User-Id header is not present
 *
 * Headers:
 * - X-User-Id: Required UUID for user identification
 * - X-User-Name: Optional display name (defaults to "User {uuid prefix}")
 */
export async function userIdAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];

  // If no X-User-Id header, fall through to next middleware (JWT auth)
  if (!userId || typeof userId !== 'string') {
    next();
    return;
  }

  // Validate UUID format
  if (!isValidUUID(userId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid X-User-Id format. Must be a valid UUID.',
      code: 'INVALID_USER_ID',
    });
    return;
  }

  // Get user name from header or generate default
  const displayName = typeof userName === 'string' && userName.trim()
    ? userName.trim()
    : `User ${userId.substring(0, 8)}`;

  try {
    // Find or create user with provided name
    const user = await findOrCreateAnonymousUser(userId, displayName);

    // Attach user to request (same format as JWT middleware)
    // Add iat/exp for compatibility with JWTPayload type
    const now = Math.floor(Date.now() / 1000);
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 86400 * 7, // 7 days from now
    };

    next();
  } catch (error) {
    console.error('X-User-Id auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with X-User-Id',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Middleware to protect routes - requires valid JWT or X-User-Id (if already authenticated)
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If already authenticated by userIdAuth middleware, skip JWT check
  if (req.user) {
    next();
    return;
  }

  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Provide either X-User-Id header or Authorization Bearer token.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please login again.',
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to optionally attach user if token present (but don't require it)
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req.headers.authorization);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required.',
      });
      return;
    }
    next();
  });
}

/**
 * Guard to check if request is authenticated
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return req.user !== undefined;
}

export const AuthMiddleware = {
  userIdAuth,
  requireAuth,
  requireRole,
  optionalAuth,
  requireAdmin,
  isAuthenticated,
};

export default AuthMiddleware;
