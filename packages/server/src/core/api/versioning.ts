/**
 * API Versioning
 *
 * URL-based versioning system for API endpoints.
 * Supports multiple versions for backward compatibility.
 *
 * OWNERSHIP: AGENT_INFRA
 */

import type { Request, Response, NextFunction } from 'express';

// ============================================================================
// VERSION CONFIGURATION
// ============================================================================

export const API_VERSIONS = {
  v1: 'v1',
  // Future versions can be added here
} as const;

export type ApiVersion = keyof typeof API_VERSIONS;
export const CURRENT_VERSION: ApiVersion = 'v1';
export const DEFAULT_VERSION = CURRENT_VERSION;

// ============================================================================
// VERSION DETECTION
// ============================================================================

/**
 * Extract API version from request path
 * Supports: /api/v1/..., /api/v2/..., etc.
 */
export function extractVersion(req: Request): ApiVersion {
  const pathParts = req.path.split('/');
  const versionIndex = pathParts.indexOf('api');

  if (versionIndex >= 0 && versionIndex + 1 < pathParts.length) {
    const versionPart = pathParts[versionIndex + 1];
    if (versionPart in API_VERSIONS) {
      return versionPart as ApiVersion;
    }
  }

  return DEFAULT_VERSION;
}

/**
 * Middleware to attach version to request
 */
export function versionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const version = extractVersion(req);
  (req as Request & { apiVersion: ApiVersion }).apiVersion = version;
  next();
}

/**
 * Check if version is supported
 */
export function isVersionSupported(version: string): version is ApiVersion {
  return version in API_VERSIONS;
}

/**
 * Get versioned path
 */
export function getVersionedPath(path: string, version: ApiVersion = CURRENT_VERSION): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/api/${version}/${cleanPath}`;
}
