import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../app';

describe('Leaderboard API', () => {
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

  describe('GET /api/v1/leaderboard', () => {
    it('does not require authentication (public endpoint)', async () => {
      const response = await fetch(`${baseUrl}/api/v1/leaderboard`);
      // Should not be 401 - leaderboard is public (may be 500 without DB)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/v1/leaderboard/stats', () => {
    it('does not require authentication (public endpoint)', async () => {
      const response = await fetch(`${baseUrl}/api/v1/leaderboard/stats`);
      // Should not be 401 - stats are public (may be 500 without DB)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/v1/leaderboard/:teamId', () => {
    it('does not require authentication', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/leaderboard/00000000-0000-0000-0000-000000000000`
      );
      // Should not be 401 - endpoint is public (may be 404/500 without DB)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});
