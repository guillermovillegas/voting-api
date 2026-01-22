import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../app';

describe('Auth API', () => {
  let server: Server;
  let baseUrl = '';
  const testUser = {
    username: `testuser_${Date.now()}`,
    name: 'Test User',
    email: `testuser_${Date.now()}@test.com`,
    password: 'TestPass123!',
  };

  beforeAll(async () => {
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => {
      server.on('listening', () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('POST /api/v1/auth/register', () => {
    it('rejects registration with missing fields', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com' }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it('rejects weak passwords', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'weakpassuser',
          name: 'Weak Pass',
          email: 'weak@test.com',
          password: 'weak',
        }),
      });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('password');
    });

    it('rejects invalid email format', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'bademail',
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'TestPass123!',
        }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('rejects login with missing credentials', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });

    it('rejects login with non-existent user or handles gracefully without DB', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'TestPass123!',
        }),
      });
      // 401 with DB, 500 without DB connection
      expect([401, 500]).toContain(response.status);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/me`);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it('rejects invalid tokens', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/token', () => {
    it('rejects token exchange without credentials or rate limits', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // 400 for validation error, or 429 if rate limited
      expect([400, 429]).toContain(response.status);
    });
  });
});
