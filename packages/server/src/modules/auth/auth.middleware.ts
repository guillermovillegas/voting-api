/**
 * Auth Middleware
 * Protects routes and extracts authenticated user from JWT
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JWTPayload } from './auth.service';
import type { UserRole } from '@voting/shared';

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
 * Middleware to protect routes - requires valid JWT
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
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
  requireAuth,
  requireRole,
  optionalAuth,
  requireAdmin,
  isAuthenticated,
};

export default AuthMiddleware;
