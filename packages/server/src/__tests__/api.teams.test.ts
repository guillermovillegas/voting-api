import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../app';

describe('Teams API', () => {
  let server: Server;
  let baseUrl = '';

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

  describe('GET /api/v1/teams', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/teams`);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it('rejects invalid tokens', async () => {
      const response = await fetch(`${baseUrl}/api/v1/teams`, {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/teams/:teamId', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/teams/some-id`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/teams', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Team' }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/teams/:teamId', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/teams/some-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Team' }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/teams/:teamId', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/teams/some-id`, {
        method: 'DELETE',
      });
      expect(response.status).toBe(401);
    });
  });
});
