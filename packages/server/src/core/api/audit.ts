/**
 * Audit Logging
 *
 * Logs critical operations for security and compliance.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import type { Request, Response, NextFunction } from 'express';

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface AuditLog {
  timestamp: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an audit event
 */
export function logAudit(log: AuditLog): void {
  // In production, this would write to a database or logging service
  console.log('[AUDIT]', JSON.stringify(log));
}

/**
 * Create audit log from request
 */
export function createAuditLog(
  req: Request,
  action: string,
  resource: string,
  resourceId?: string,
  success: boolean = true,
  error?: string
): AuditLog {
  const userId = (req as Request & { user?: { userId: string } }).user?.userId;

  return {
    timestamp: new Date().toISOString(),
    userId,
    action,
    resource,
    resourceId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    success,
    error,
  };
}

/**
 * Middleware helper to log request
 */
export function auditMiddleware(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send.bind(res);

    res.send = function (body: unknown): Response {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      const log = createAuditLog(req, action, resource, undefined, success);
      logAudit(log);
      return originalSend(body);
    };

    next();
  };
}
