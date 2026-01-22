/**
 * Auth Service
 * Handles JWT token generation, password hashing, and user authentication
 */

import { z } from 'zod';
import type { User, UserId } from '@voting/shared';

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: UserId;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Hash a password using SHA-256 with salt
 * In production, use bcrypt or argon2
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hash === originalHash;
}

/**
 * Generate JWT token
 * Uses simple base64 encoding - in production use jsonwebtoken library
 */
export function generateToken(user: User): AuthTokens {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + expiresIn,
  };

  // Simple JWT structure: header.payload.signature
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));

  // Create signature (simplified - use crypto.subtle.sign in production)
  const signatureInput = `${headerB64}.${payloadB64}.${JWT_SECRET}`;
  const signatureB64 = btoa(signatureInput);

  const accessToken = `${headerB64}.${payloadB64}.${signatureB64}`;

  // Refresh token with longer expiry
  const refreshPayload = { ...payload, exp: now + 30 * 24 * 60 * 60 };
  const refreshPayloadB64 = btoa(JSON.stringify(refreshPayload));
  const refreshSignatureInput = `${headerB64}.${refreshPayloadB64}.${JWT_SECRET}`;
  const refreshSignatureB64 = btoa(refreshSignatureInput);
  const refreshToken = `${headerB64}.${refreshPayloadB64}.${refreshSignatureB64}`;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSignatureInput = `${headerB64}.${payloadB64}.${JWT_SECRET}`;
    const expectedSignatureB64 = btoa(expectedSignatureInput);

    if (signatureB64 !== expectedSignatureB64) {
      return null;
    }

    const payload = JSON.parse(atob(payloadB64)) as JWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(
  refreshToken: string,
  user: User
): AuthTokens | null {
  const payload = verifyToken(refreshToken);
  if (!payload) return null;

  return generateToken(user);
}

export const AuthService = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  refreshAccessToken,
  loginSchema,
  registerSchema,
  passwordSchema,
};

export default AuthService;
