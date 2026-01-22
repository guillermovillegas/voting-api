import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../app';

describe('Voting API', () => {
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

  describe('POST /api/v1/votes', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: 'some-team-id',
          isFinalVote: false,
        }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/votes/me', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/votes/me`);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/v1/votes/rankings', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/votes/rankings`);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/votes/notes/export', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/votes/notes/export`);
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/votes/notes', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/votes/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: 'some-id',
          note: 'Test note',
          ranking: 5,
        }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/votes/status', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/votes/status`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/votes/admin/toggle', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseUrl}/api/v1/votes/admin/toggle`, {
        method: 'POST',
      });
      expect(response.status).toBe(401);
    });
  });
});
