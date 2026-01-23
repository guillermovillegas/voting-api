# Hackathon Voting API - LLM Reference

This document provides complete API specifications for LLM-assisted integration with the Hackathon Voting API.

---

## Quick Reference (Copy-Paste)

```typescript
// API Base URL
const API_URL = 'https://voting-api-lcvw.onrender.com';

// OPTION 1: Simple auth with X-User-Id header (Recommended for training)
// First, create a user:
const joinRes = await fetch(`${API_URL}/api/v1/auth/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Your Name' }),
});
const { data } = await joinRes.json();
const userId = data.user.id; // Store this!

// Then use X-User-Id header for all requests:
const response = await fetch(`${API_URL}/api/v1/teams`, {
  headers: {
    'X-User-Id': userId,
    'Content-Type': 'application/json',
  },
});

// OPTION 2: JWT Bearer token (traditional auth)
const response = await fetch(`${API_URL}/api/v1/teams`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

// Socket.IO connection
import { io } from 'socket.io-client';
const socket = io('wss://voting-api-lcvw.onrender.com');
socket.emit('leaderboard:subscribe');
socket.on('leaderboard:update', (data) => console.log(data));
```

---

## Table of Contents

1. [Live Deployment](#live-deployment)
2. [Quick Start](#quick-start-examples)
3. [Frontend Setup](#frontend-setup)
4. [TypeScript Interfaces](#typescript-interfaces)
5. [API Client Example](#api-client-example)
6. [Authentication](#authentication)
7. [React Hooks Examples](#react-hooks-examples)
8. [Socket.IO Integration](#socketio-integration)
9. [API Endpoints](#authentication-endpoints)
10. [Error Handling Patterns](#error-handling-patterns)
11. [Common Workflows](#common-workflows)
12. [Business Rules](#business-rules)

---

## Live Deployment

```
API_URL: https://voting-api-lcvw.onrender.com
WEBSOCKET_URL: wss://voting-api-lcvw.onrender.com
ROOT_INFO: https://voting-api-lcvw.onrender.com/
HEALTH_CHECK: https://voting-api-lcvw.onrender.com/health
API_DOCS: https://voting-api-lcvw.onrender.com/api/docs
```

### Quick Start Examples

**API Info (Root Endpoint):**
```bash
curl https://voting-api-lcvw.onrender.com/
```
Response:
```json
{
  "success": true,
  "data": {
    "name": "Hackathon Voting API",
    "version": "1.0.0",
    "description": "REST API for hackathon voting with real-time WebSocket support",
    "documentation": "/api/docs",
    "health": "/health",
    "endpoints": {
      "auth": "/api/v1/auth",
      "teams": "/api/v1/teams",
      "votes": "/api/v1/votes",
      "leaderboard": "/api/v1/leaderboard",
      "presentations": "/api/v1/presentations",
      "timer": "/api/v1/timer"
    }
  }
}
```

**Health Check:**
```bash
curl https://voting-api-lcvw.onrender.com/health
```
Response:
```json
{"success":true,"data":{"status":"ok","timestamp":"2026-01-22T08:49:58.732Z"},"timestamp":"2026-01-22T08:49:58.732Z"}
```

**Register User:**
```bash
curl -X POST https://voting-api-lcvw.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass1#","name":"User Name"}'
```

**Login:**
```bash
curl -X POST https://voting-api-lcvw.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass1#"}'
```

**Authenticated Request:**
```bash
curl https://voting-api-lcvw.onrender.com/api/v1/teams \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get Leaderboard (No Auth Required):**
```bash
curl https://voting-api-lcvw.onrender.com/api/v1/leaderboard
```

---

## Frontend Setup

### Environment Variables

Create a `.env.local` file in your Next.js or React project:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://voting-api-lcvw.onrender.com
NEXT_PUBLIC_WS_URL=wss://voting-api-lcvw.onrender.com

# For local development
# NEXT_PUBLIC_API_URL=http://localhost:3000
# NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### Required Dependencies

```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

### CORS Configuration

The API allows requests from any origin. No special CORS configuration needed on frontend.

**Allowed Origins:** `*` (all origins)
**Allowed Methods:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`
**Allowed Headers:** `Content-Type, Authorization`

### Token Storage Best Practices

```typescript
// Recommended: Store tokens in memory + localStorage for persistence
// Access token: Use for API calls
// Refresh token: Store securely, use to get new access token

const TOKEN_KEY = 'voting_access_token';
const REFRESH_KEY = 'voting_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
```

---

## TypeScript Interfaces

Copy these interfaces into your frontend project (e.g., `src/types/api.ts`):

```typescript
// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  type: string;
  status: number;
  detail?: string;
  instance?: string;
  timestamp: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'voter';
  teamId: string | null;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  presentationOrder: number | null;
  hasPresented: boolean;
  createdAt: string;
}

export interface TeamWithMembers extends Team {
  members: User[];
}

export interface Vote {
  id: string;
  userId: string;
  teamId: string;
  isFinalVote: boolean;
  publicNote: string | null;
  submittedAt: string;
}

export interface PrivateNote {
  id: string;
  userId: string;
  teamId: string;
  note: string;
  ranking: number;
  updatedAt: string;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  voteCount: string;  // Note: returned as string, parse to number
  rank: string;       // Note: returned as string, parse to number
  hasPresented: boolean;
}

export interface LeaderboardStats {
  totalTeams: number;
  totalVotes: number;
  teamsPresented: number;
  topTeam: LeaderboardEntry | null;
}

export interface Presentation {
  id: string;
  teamId: string;
  status: 'upcoming' | 'current' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
}

export interface QueueStatus {
  current: Presentation | null;
  upcoming: Presentation[];
  completed: Presentation[];
}

export interface TimerState {
  isActive: boolean;
  durationSeconds: number;
  startedAt: string | null;
  pausedAt: string | null;
  elapsedSeconds: number;
  currentPresentationId: string | null;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ============================================================================
// VOTING TYPES
// ============================================================================

export interface VoteRequest {
  teamId: string;
  isFinalVote: boolean;
  publicNote?: string;
}

export interface VoteResponse {
  vote: Vote;
  isNew: boolean;
}

export interface UserVotes {
  votes: Array<{
    vote_id: string;
    team_id: string;
    team_name: string;
    is_final_vote: boolean;
    public_note: string | null;
    submitted_at: string;
  }>;
  finalVote: {
    vote_id: string;
    team_id: string;
    team_name: string;
    is_final_vote: boolean;
    public_note: string | null;
    submitted_at: string;
  } | null;
  hasVoted: boolean;
}

export interface UserRanking {
  teamId: string;
  teamName: string;
  ranking: number;
  note: string | null;
  hasVoted: boolean;
}

export interface RankingsResponse {
  rankings: UserRanking[];
  finalVoteTeamId: string | null;
}

export interface NoteRequest {
  teamId: string;
  note: string;
  ranking: number;
}

// ============================================================================
// SOCKET.IO EVENT TYPES
// ============================================================================

export interface SocketEvents {
  // Leaderboard
  'leaderboard:subscribe': () => void;
  'leaderboard:unsubscribe': () => void;
  'leaderboard:request': () => void;
  'leaderboard:update': (entries: LeaderboardEntry[]) => void;
  'leaderboard:team:update': (data: { teamId: string; entry: LeaderboardEntry | null }) => void;
  'leaderboard:error': (data: { message: string }) => void;

  // Presentations
  'presentation:subscribe': () => void;
  'presentation:unsubscribe': () => void;
  'presentation:request': () => void;
  'presentation:queue:updated': (status: QueueStatus) => void;
  'presentation:started': (presentation: Presentation) => void;
  'presentation:completed': (presentation: Presentation) => void;
  'presentation:update': (presentation: Presentation) => void;
  'presentation:error': (data: { message: string }) => void;

  // Timer
  'timer:subscribe': () => void;
  'timer:unsubscribe': () => void;
  'timer:request': () => void;
  'timer:update': (state: TimerState) => void;
  'timer:started': (state: TimerState) => void;
  'timer:paused': (state: TimerState) => void;
  'timer:expired': () => void;
  'timer:reset': (state: TimerState) => void;
  'timer:error': (data: { message: string }) => void;

  // Votes
  'vote:submitted': (vote: Vote) => void;
  'vote:count:update': (data: { teamId: string; count: number }) => void;
}
```

---

## API Client Example

Create a typed API client (`src/lib/api.ts`):

```typescript
import { tokenStorage } from './token-storage';
import type {
  ApiResponse,
  ApiError,
  User,
  Team,
  TeamWithMembers,
  LeaderboardEntry,
  LeaderboardStats,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  VoteRequest,
  VoteResponse,
  UserVotes,
  RankingsResponse,
  NoteRequest,
  PrivateNote,
  Presentation,
  QueueStatus,
  TimerState,
} from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://voting-api-lcvw.onrender.com';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = tokenStorage.getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;

      // Handle token expiry - attempt refresh
      if (response.status === 401 && tokenStorage.getRefreshToken()) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request
          return this.request<T>(endpoint, options);
        }
      }

      throw new ApiRequestError(error);
    }

    return (data as ApiResponse<T>).data;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        tokenStorage.clearTokens();
        return false;
      }

      const data = await response.json();
      tokenStorage.setAccessToken(data.data.accessToken);
      tokenStorage.setRefreshToken(data.data.refreshToken);
      return true;
    } catch {
      tokenStorage.clearTokens();
      return false;
    }
  }

  // ========== AUTH ==========

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    tokenStorage.setAccessToken(result.accessToken);
    tokenStorage.setRefreshToken(result.refreshToken);
    return result;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    tokenStorage.setAccessToken(result.accessToken);
    tokenStorage.setRefreshToken(result.refreshToken);
    return result;
  }

  async logout(): Promise<void> {
    await this.request('/api/v1/auth/logout', { method: 'POST' });
    tokenStorage.clearTokens();
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/v1/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('/api/v1/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ========== TEAMS ==========

  async getTeams(): Promise<Team[]> {
    return this.request<Team[]>('/api/v1/teams');
  }

  async getTeam(teamId: string): Promise<Team> {
    return this.request<Team>(`/api/v1/teams/${teamId}`);
  }

  async getTeamWithMembers(teamId: string): Promise<TeamWithMembers> {
    return this.request<TeamWithMembers>(`/api/v1/teams/${teamId}/members`);
  }

  async getUserTeam(userId: string): Promise<Team | null> {
    return this.request<Team | null>(`/api/v1/teams/user/${userId}`);
  }

  // ========== VOTING ==========

  async submitVote(data: VoteRequest): Promise<VoteResponse> {
    return this.request<VoteResponse>('/api/v1/votes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyVotes(): Promise<UserVotes> {
    return this.request<UserVotes>('/api/v1/votes/me');
  }

  async getMyRankings(): Promise<RankingsResponse> {
    return this.request<RankingsResponse>('/api/v1/votes/rankings');
  }

  async saveNote(data: NoteRequest): Promise<PrivateNote> {
    return this.request<PrivateNote>('/api/v1/votes/notes', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async exportNotes(format: 'json' | 'csv' = 'json'): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/votes/notes/export?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${tokenStorage.getAccessToken()}`,
        },
      }
    );
    return response.text();
  }

  async getVotingStatus(): Promise<{ isOpen: boolean }> {
    return this.request<{ isOpen: boolean }>('/api/v1/votes/status');
  }

  async getTeamVoteCount(teamId: string): Promise<{ teamId: string; count: number }> {
    return this.request<{ teamId: string; count: number }>(`/api/v1/votes/teams/${teamId}/count`);
  }

  // ========== LEADERBOARD (No Auth Required) ==========

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/leaderboard`);
    const data = await response.json();
    return data.data;
  }

  async getLeaderboardStats(): Promise<LeaderboardStats> {
    const response = await fetch(`${this.baseUrl}/api/v1/leaderboard/stats`);
    const data = await response.json();
    return data.data;
  }

  async getTeamLeaderboardEntry(teamId: string): Promise<LeaderboardEntry> {
    const response = await fetch(`${this.baseUrl}/api/v1/leaderboard/${teamId}`);
    const data = await response.json();
    return data.data;
  }

  // ========== PRESENTATIONS ==========

  async getPresentations(): Promise<Presentation[]> {
    return this.request<Presentation[]>('/api/v1/presentations');
  }

  async getCurrentPresentation(): Promise<Presentation | null> {
    return this.request<Presentation | null>('/api/v1/presentations/current');
  }

  async getUpcomingPresentations(): Promise<Presentation[]> {
    return this.request<Presentation[]>('/api/v1/presentations/upcoming');
  }

  async getPresentationStatus(): Promise<QueueStatus> {
    return this.request<QueueStatus>('/api/v1/presentations/status');
  }

  // ========== TIMER ==========

  async getTimer(): Promise<TimerState> {
    return this.request<TimerState>('/api/v1/timer');
  }

  // ========== TEAM MANAGEMENT ==========

  async createTeam(name: string, memberIds?: string[]): Promise<Team> {
    return this.request<Team>('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
  }

  async updateTeam(teamId: string, data: Partial<Team>): Promise<Team> {
    return this.request<Team>(`/api/v1/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.request(`/api/v1/teams/${teamId}`, { method: 'DELETE' });
  }

  async toggleVoting(): Promise<{ isOpen: boolean }> {
    return this.request<{ isOpen: boolean }>('/api/v1/votes/toggle', {
      method: 'POST',
    });
  }

  async initializePresentations(): Promise<Presentation[]> {
    return this.request<Presentation[]>('/api/v1/presentations/initialize', {
      method: 'POST',
    });
  }

  async startPresentation(presentationId: string): Promise<Presentation> {
    return this.request<Presentation>(`/api/v1/presentations/${presentationId}/start`, {
      method: 'POST',
    });
  }

  async nextPresentation(): Promise<Presentation> {
    return this.request<Presentation>('/api/v1/presentations/next', {
      method: 'POST',
    });
  }

  async resetPresentations(): Promise<void> {
    await this.request('/api/v1/presentations/reset', { method: 'POST' });
  }

  async startTimer(durationSeconds?: number, presentationId?: string): Promise<TimerState> {
    return this.request<TimerState>('/api/v1/timer/start', {
      method: 'POST',
      body: JSON.stringify({ durationSeconds, presentationId }),
    });
  }

  async pauseTimer(): Promise<TimerState> {
    return this.request<TimerState>('/api/v1/timer/pause', { method: 'POST' });
  }

  async resumeTimer(): Promise<TimerState> {
    return this.request<TimerState>('/api/v1/timer/resume', { method: 'POST' });
  }

  async resetTimer(): Promise<TimerState> {
    return this.request<TimerState>('/api/v1/timer/reset', { method: 'POST' });
  }
}

// Custom error class for API errors
export class ApiRequestError extends Error {
  code: string;
  status: number;
  detail?: string;

  constructor(error: ApiError) {
    super(error.error);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.status = error.status;
    this.detail = error.detail;
  }
}

// Export singleton instance
export const api = new ApiClient(API_URL);
```

---

## React Hooks Examples

### useAuth Hook

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { api, ApiRequestError } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import type { User, LoginRequest, RegisterRequest } from '@/types/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    try {
      if (!tokenStorage.getAccessToken()) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await api.getMe();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (error) {
      tokenStorage.clearTokens();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (data: LoginRequest) => {
    const response = await api.login(data);
    setState({ user: response.user, isLoading: false, isAuthenticated: true });
  };

  const register = async (data: RegisterRequest) => {
    const response = await api.register(data);
    setState({ user: response.user, isLoading: false, isAuthenticated: true });
  };

  const logout = async () => {
    await api.logout();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### useLeaderboard Hook

```typescript
// src/hooks/useLeaderboard.ts
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { LeaderboardEntry } from '@/types/api';

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setIsLoading(true);
      const data = await api.getLeaderboard();
      setEntries(data);
      setError(null);
    } catch (err) {
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Parse string values to numbers for sorting/display
  const parsedEntries = entries.map(entry => ({
    ...entry,
    voteCountNum: parseInt(entry.voteCount, 10),
    rankNum: parseInt(entry.rank, 10),
  }));

  return { entries: parsedEntries, isLoading, error, refresh };
}
```

### useVoting Hook

```typescript
// src/hooks/useVoting.ts
import { useState, useCallback } from 'react';
import { api, ApiRequestError } from '@/lib/api';
import type { VoteRequest, UserVotes, RankingsResponse } from '@/types/api';

export function useVoting() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitVote = useCallback(async (data: VoteRequest) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.submitVote(data);
      return result;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        // Handle specific error codes
        if (err.code === 'ALREADY_VOTED') {
          throw new Error('You have already cast your final vote');
        }
        if (err.code === 'SELF_VOTE') {
          throw new Error('You cannot vote for your own team');
        }
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const getMyVotes = useCallback(async (): Promise<UserVotes> => {
    return api.getMyVotes();
  }, []);

  const getMyRankings = useCallback(async (): Promise<RankingsResponse> => {
    return api.getMyRankings();
  }, []);

  const saveNote = useCallback(async (teamId: string, note: string, ranking: number) => {
    return api.saveNote({ teamId, note, ranking });
  }, []);

  return {
    submitVote,
    getMyVotes,
    getMyRankings,
    saveNote,
    isSubmitting,
    error,
  };
}
```

---

## Socket.IO Integration

### Socket Hook for Real-time Updates

```typescript
// src/hooks/useSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LeaderboardEntry, Presentation, QueueStatus, TimerState } from '@/types/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://voting-api-lcvw.onrender.com';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, isConnected };
}

// Specialized hook for leaderboard updates
export function useLeaderboardSocket(onUpdate: (entries: LeaderboardEntry[]) => void) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('leaderboard:subscribe');
    socket.on('leaderboard:update', onUpdate);

    return () => {
      socket.emit('leaderboard:unsubscribe');
      socket.off('leaderboard:update', onUpdate);
    };
  }, [socket, isConnected, onUpdate]);

  const requestUpdate = useCallback(() => {
    socket?.emit('leaderboard:request');
  }, [socket]);

  return { isConnected, requestUpdate };
}

// Specialized hook for presentation updates
export function usePresentationSocket(
  onQueueUpdate: (status: QueueStatus) => void,
  onPresentationStarted?: (presentation: Presentation) => void,
  onPresentationCompleted?: (presentation: Presentation) => void
) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('presentation:subscribe');
    socket.on('presentation:queue:updated', onQueueUpdate);

    if (onPresentationStarted) {
      socket.on('presentation:started', onPresentationStarted);
    }
    if (onPresentationCompleted) {
      socket.on('presentation:completed', onPresentationCompleted);
    }

    return () => {
      socket.emit('presentation:unsubscribe');
      socket.off('presentation:queue:updated', onQueueUpdate);
      if (onPresentationStarted) {
        socket.off('presentation:started', onPresentationStarted);
      }
      if (onPresentationCompleted) {
        socket.off('presentation:completed', onPresentationCompleted);
      }
    };
  }, [socket, isConnected, onQueueUpdate, onPresentationStarted, onPresentationCompleted]);

  return { isConnected };
}

// Specialized hook for timer updates
export function useTimerSocket(
  onUpdate: (state: TimerState) => void,
  onExpired?: () => void
) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('timer:subscribe');
    socket.on('timer:update', onUpdate);
    socket.on('timer:started', onUpdate);
    socket.on('timer:paused', onUpdate);
    socket.on('timer:reset', onUpdate);

    if (onExpired) {
      socket.on('timer:expired', onExpired);
    }

    return () => {
      socket.emit('timer:unsubscribe');
      socket.off('timer:update', onUpdate);
      socket.off('timer:started', onUpdate);
      socket.off('timer:paused', onUpdate);
      socket.off('timer:reset', onUpdate);
      if (onExpired) {
        socket.off('timer:expired', onExpired);
      }
    };
  }, [socket, isConnected, onUpdate, onExpired]);

  return { isConnected };
}
```

### Example: Real-time Leaderboard Component

```tsx
// src/components/Leaderboard.tsx
import { useState, useCallback } from 'react';
import { useLeaderboardSocket } from '@/hooks/useSocket';
import type { LeaderboardEntry } from '@/types/api';

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const handleUpdate = useCallback((newEntries: LeaderboardEntry[]) => {
    setEntries(newEntries);
  }, []);

  const { isConnected, requestUpdate } = useLeaderboardSocket(handleUpdate);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        <button onClick={requestUpdate}>Refresh</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Votes</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.teamId}>
              <td>{entry.rank}</td>
              <td>{entry.teamName}</td>
              <td>{entry.voteCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Base Configuration

```
BASE_URL: https://voting-api-lcvw.onrender.com/api/v1
CONTENT_TYPE: application/json
AUTHENTICATION: Bearer Token (JWT)
```

---

## Authentication

The API supports two authentication methods:

### Option 1: X-User-Id Header (Recommended for Training)

Simple header-based auth for training and demos. No passwords required.

```
X-User-Id: <user-uuid>
X-User-Name: <display-name>  (optional)
```

First, create a user with `POST /auth/join`, then use the returned ID in all requests.

### Option 2: JWT Bearer Token

Traditional token-based auth for production use.

```
Authorization: Bearer <access_token>
```

Get tokens via `POST /auth/login` or `POST /auth/register`.

### JWT Payload Structure

```json
{
  "userId": "uuid",
  "email": "string",
  "role": "admin | voter",
  "iat": "number (unix timestamp)",
  "exp": "number (unix timestamp)"
}
```

### Token Lifetimes

- Access Token: 7 days (604800 seconds)
- Refresh Token: 30 days

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": "<T>",
  "timestamp": "ISO 8601 string"
}
```

### Error Response (RFC 9457)

```json
{
  "success": false,
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "type": "https://api.voting.app/errors/{code_lowercase}",
  "status": 400,
  "detail": "Additional details (optional)",
  "instance": "Request path (optional)",
  "timestamp": "ISO 8601 string"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions (not admin) |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate email) |
| `UNPROCESSABLE_ENTITY` | 422 | Business rule violation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Voting | 10 requests | 1 minute |
| Password Change | 5 requests | 1 hour |
| General | 100 requests | 15 minutes |
| Admin | 200 requests | 15 minutes |

Rate limit headers returned: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

**Rate Limit Response (429):**
```json
{
  "success": false,
  "error": "Too many authentication attempts, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429,
  "timestamp": "2026-01-22T08:52:02.845Z"
}
```

**Important:** Authentication endpoints are strictly limited to 5 requests per 15 minutes. Store tokens and reuse them rather than re-authenticating frequently.

---

## Data Types

### User

```typescript
{
  id: string           // UUID
  email: string        // Email format
  name: string         // 2-100 characters
  role: "admin" | "voter"
  teamId: string | null  // UUID or null
  createdAt: string    // ISO 8601
}
```

### Team

```typescript
{
  id: string              // UUID
  name: string            // 2-100 characters, unique
  presentationOrder: number | null  // Positive integer
  hasPresented: boolean
  createdAt: string       // ISO 8601
}
```

### Vote

```typescript
{
  id: string           // UUID
  userId: string       // UUID
  teamId: string       // UUID
  isFinalVote: boolean
  publicNote: string | null  // Max 500 characters
  submittedAt: string  // ISO 8601
}
```

### PrivateNote

```typescript
{
  id: string        // UUID
  userId: string    // UUID
  teamId: string    // UUID
  note: string      // Max 1000 characters
  ranking: number   // 1-100
  updatedAt: string // ISO 8601
}
```

### Presentation

```typescript
{
  id: string                    // UUID
  teamId: string                // UUID
  status: "upcoming" | "current" | "completed"
  startedAt: string | null      // ISO 8601
  completedAt: string | null    // ISO 8601
}
```

### LeaderboardEntry

```typescript
{
  teamId: string      // UUID
  teamName: string
  voteCount: string   // ⚠️ String! Parse with parseInt()
  rank: string        // ⚠️ String! DENSE_RANK (ties share rank)
  hasPresented: boolean
}
```

**Important:** `voteCount` and `rank` are returned as strings from the API. Always parse them:
```typescript
const voteCountNum = parseInt(entry.voteCount, 10);
const rankNum = parseInt(entry.rank, 10);
```

### TimerState

```typescript
{
  isActive: boolean
  durationSeconds: number       // Default 300 (5 minutes)
  startedAt: string | null      // ISO 8601
  pausedAt: string | null       // ISO 8601
  elapsedSeconds: number
  currentPresentationId: string | null  // UUID
}
```

---

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "name": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "voter",
      "teamId": null,
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 400: Invalid email format, password too weak
- 409: Email already registered

---

### POST /auth/login

Authenticate user and receive tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "voter",
      "teamId": null,
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 401: Invalid email or password

---

### POST /auth/token

Token exchange endpoint (OAuth2-style).

**Password Grant Request:**

```json
{
  "grantType": "password",
  "email": "user@example.com",
  "password": "SecurePass1!"
}
```

**Refresh Token Grant Request:**

```json
{
  "grantType": "refresh_token",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /auth/refresh

Refresh access token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 401: Invalid or expired refresh token

---

### POST /auth/logout

Invalidate current session.

**Headers:** `Authorization: Bearer <token>` required

**Request:** No body

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out."
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /auth/me

Get current authenticated user.

**Headers:** `Authorization: Bearer <token>` required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "voter",
    "teamId": null,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### PUT /auth/password

Change user password.

**Headers:** `Authorization: Bearer <token>` required

**Request:**

```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewSecure2@"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully."
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 401: Current password incorrect
- 400: New password doesn't meet requirements

---

### POST /auth/join

Simple user creation - no password required. Ideal for training sessions.

**Request:**

```json
{
  "name": "John Doe"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user-550e8400@voting.app",
      "name": "John Doe",
      "role": "voter",
      "teamId": null
    },
    "message": "Welcome! Store your user ID to stay logged in."
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Store the returned `user.id` and send it as `X-User-Id` header on all future requests.

---

### POST /auth/setup

Setup user with name and team assignment. Requires `X-User-Id` header.

**Headers:** `X-User-Id: <user-uuid>` required

**Request:**

```json
{
  "name": "John Doe",
  "teamId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "teamId": "550e8400-e29b-41d4-a716-446655440001"
    },
    "message": "Setup complete"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### PUT /auth/me

Update current user's profile.

**Headers:** Authentication required (X-User-Id or Bearer token)

**Request (all fields optional):**

```json
{
  "name": "New Name",
  "teamId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "New Name",
    "role": "voter",
    "teamId": "550e8400-e29b-41d4-a716-446655440001"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

## Teams Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### GET /teams

List all teams.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Team Alpha",
      "presentationOrder": 1,
      "hasPresented": false,
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /teams/:teamId

Get team by ID.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": 1,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 404: Team not found

---

### GET /teams/:teamId/members

Get team with member list.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": 1,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "members": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "member@example.com",
        "name": "Team Member",
        "role": "voter",
        "teamId": "550e8400-e29b-41d4-a716-446655440001",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /teams

Create new team.

**Request:**

```json
{
  "name": "Team Alpha",
  "memberIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**Constraints:**
- `name`: 2-100 characters, unique
- `memberIds`: Optional, 3-6 UUIDs

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": null,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 409: Team name already exists

---

### PATCH /teams/:teamId

Update team.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Request (all fields optional):**

```json
{
  "name": "Team Alpha Updated",
  "presentationOrder": 2,
  "hasPresented": true
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha Updated",
    "presentationOrder": 2,
    "hasPresented": true,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### DELETE /teams/:teamId

Delete team.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response:** 204 No Content

---

### POST /teams/:teamId/members

Add members to team.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Request:**

```json
{
  "memberIds": [
    "550e8400-e29b-41d4-a716-446655440004"
  ]
}
```

**Constraints:**
- Team must have 3-6 members after addition

**Response (200):** Team with updated members list

---

### DELETE /teams/:teamId/members

Remove members from team.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Request:**

```json
{
  "memberIds": [
    "550e8400-e29b-41d4-a716-446655440004"
  ]
}
```

**Constraints:**
- Team must retain 3-6 members after removal

**Response (200):** Team with updated members list

---

### GET /teams/user/:userId

Get team for specific user.

**Path Parameters:**
- `userId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Team Alpha",
    "presentationOrder": 1,
    "hasPresented": false,
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Returns `null` in data if user not assigned to team.

---

## Voting Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### POST /votes

Submit vote for a team.

**Request:**

```json
{
  "teamId": "550e8400-e29b-41d4-a716-446655440001",
  "isFinalVote": true,
  "publicNote": "Great presentation!"
}
```

**Constraints:**
- `teamId`: UUID, required
- `isFinalVote`: boolean, required
- `publicNote`: string, max 500 chars, optional
- Cannot vote for own team (enforced by database)
- Only one final vote allowed per user
- Team must have presented (if setting enforced)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "vote": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "isFinalVote": true,
      "publicNote": "Great presentation!",
      "submittedAt": "2024-01-20T10:30:00.000Z"
    },
    "isNew": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 400: Voting is closed
- 404: Team not found
- 422: Already submitted final vote, self-vote attempted, team hasn't presented

---

### GET /votes/me

Get current user's votes.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "votes": [
      {
        "vote_id": "550e8400-e29b-41d4-a716-446655440010",
        "team_id": "550e8400-e29b-41d4-a716-446655440001",
        "team_name": "Team Alpha",
        "is_final_vote": true,
        "public_note": "Great presentation!",
        "submitted_at": "2024-01-20T10:30:00.000Z"
      }
    ],
    "finalVote": {
      "vote_id": "550e8400-e29b-41d4-a716-446655440010",
      "team_id": "550e8400-e29b-41d4-a716-446655440001",
      "team_name": "Team Alpha",
      "is_final_vote": true,
      "public_note": "Great presentation!",
      "submitted_at": "2024-01-20T10:30:00.000Z"
    },
    "hasVoted": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /votes/rankings

Get user's rankings and notes.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "teamId": "550e8400-e29b-41d4-a716-446655440001",
        "teamName": "Team Alpha",
        "ranking": 1,
        "note": "Excellent technical demo",
        "hasVoted": true
      },
      {
        "teamId": "550e8400-e29b-41d4-a716-446655440002",
        "teamName": "Team Beta",
        "ranking": 2,
        "note": "Good concept",
        "hasVoted": false
      }
    ],
    "finalVoteTeamId": "550e8400-e29b-41d4-a716-446655440001"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Note: Only returns teams that have presented.

---

### PUT /votes/notes

Update private note for a team.

**Request:**

```json
{
  "teamId": "550e8400-e29b-41d4-a716-446655440001",
  "note": "Excellent technical implementation",
  "ranking": 1
}
```

**Constraints:**
- `teamId`: UUID, required
- `note`: string, max 1000 chars, required
- `ranking`: integer 1-100, required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "teamId": "550e8400-e29b-41d4-a716-446655440001",
    "note": "Excellent technical implementation",
    "ranking": 1,
    "updatedAt": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /votes/notes/export

Export notes as JSON or CSV.

**Query Parameters:**
- `format`: "json" | "csv" (default: "json")

**Response (200) - JSON:**

```json
[
  {
    "team_name": "Team Alpha",
    "ranking": 1,
    "note": "Excellent technical implementation",
    "is_final_vote": true,
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
]
```

**Response (200) - CSV:**

```
Rank,Team,Note,Is Final Vote,Last Updated
1,"Team Alpha","Excellent technical implementation",Yes,2024-01-20T10:30:00Z
```

Headers for CSV:
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="my-rankings.csv"`

---

### GET /votes/teams/:teamId/count

Get vote count for specific team.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "teamId": "550e8400-e29b-41d4-a716-446655440001",
    "count": 15
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Note: Counts final votes only.

---

### GET /votes/status

Check if voting is open.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "isOpen": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /votes/toggle

Toggle voting open/closed.

**Request:** No body

**Response (200):**

```json
{
  "success": true,
  "data": {
    "isOpen": false
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

## Leaderboard Endpoints

No authentication required for leaderboard endpoints.

### GET /leaderboard

Get current rankings.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "teamName": "Team Alpha",
      "voteCount": "15",
      "rank": "1",
      "hasPresented": true
    },
    {
      "teamId": "550e8400-e29b-41d4-a716-446655440002",
      "teamName": "Team Beta",
      "voteCount": "15",
      "rank": "1",
      "hasPresented": true
    },
    {
      "teamId": "550e8400-e29b-41d4-a716-446655440003",
      "teamName": "Team Gamma",
      "voteCount": "12",
      "rank": "2",
      "hasPresented": true
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Note:** `voteCount` and `rank` are returned as strings. Parse to integers if needed. Uses DENSE_RANK - ties share the same rank.

---

### GET /leaderboard/stats

Get leaderboard statistics.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalTeams": 10,
    "totalVotes": 45,
    "teamsPresented": 8,
    "topTeam": {
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "teamName": "Team Alpha",
      "voteCount": "15",
      "rank": "1",
      "hasPresented": true
    }
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /leaderboard/:teamId

Get specific team's leaderboard entry.

**Path Parameters:**
- `teamId` (string, UUID, required)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "teamId": "550e8400-e29b-41d4-a716-446655440001",
    "teamName": "Team Alpha",
    "voteCount": "15",
    "rank": "1",
    "hasPresented": true
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**Errors:**
- 404: Team not found

---

## Presentations Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### GET /presentations

List all presentations.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "status": "completed",
      "startedAt": "2024-01-20T10:00:00.000Z",
      "completedAt": "2024-01-20T10:05:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440031",
      "teamId": "550e8400-e29b-41d4-a716-446655440002",
      "status": "current",
      "startedAt": "2024-01-20T10:05:00.000Z",
      "completedAt": null
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /presentations/current

Get current presentation.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440031",
    "teamId": "550e8400-e29b-41d4-a716-446655440002",
    "status": "current",
    "startedAt": "2024-01-20T10:05:00.000Z",
    "completedAt": null
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

Returns `null` in data if no current presentation.

---

### GET /presentations/upcoming

Get upcoming presentations.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440032",
      "teamId": "550e8400-e29b-41d4-a716-446655440003",
      "status": "upcoming",
      "startedAt": null,
      "completedAt": null
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /presentations/completed

Get completed presentations.

**Response (200):** Array of completed presentations

---

### GET /presentations/status

Get full queue status.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "current": {
      "id": "550e8400-e29b-41d4-a716-446655440031",
      "teamId": "550e8400-e29b-41d4-a716-446655440002",
      "status": "current",
      "startedAt": "2024-01-20T10:05:00.000Z",
      "completedAt": null
    },
    "upcoming": [...],
    "completed": [...]
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /presentations/:id

Get presentation by ID.

**Path Parameters:**
- `id` (string, UUID, required)

**Response (200):** Single presentation object

---

### POST /presentations/initialize

Initialize presentation queue.

Creates presentation entries for all teams in random order.

**Request:** No body

**Response (201):** Array of created presentations

---

### POST /presentations/:id/start

Start a presentation.

**Path Parameters:**
- `id` (string, UUID, required)

**Response (200):** Updated presentation with status "current"

---

### POST /presentations/next

Advance to next presentation.

Marks current as completed, starts next in queue.

**Request:** No body

**Response (200):** New current presentation

---

### POST /presentations/reset

Reset presentation queue.

Deletes all presentations.

**Request:** No body

**Response (200):** Empty data

---

## Timer Endpoints

All endpoints require `Authorization: Bearer <token>` header.

### GET /timer

Get current timer state.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "isActive": true,
    "durationSeconds": 300,
    "startedAt": "2024-01-20T10:05:00.000Z",
    "pausedAt": null,
    "elapsedSeconds": 120,
    "currentPresentationId": "550e8400-e29b-41d4-a716-446655440031"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### POST /timer/start

Start timer.

**Request (optional):**

```json
{
  "durationSeconds": 300,
  "presentationId": "550e8400-e29b-41d4-a716-446655440031"
}
```

**Response (200):** Updated timer state

---

### POST /timer/pause

Pause timer.

**Request:** No body

**Response (200):** Updated timer state with `pausedAt` set

---

### POST /timer/resume

Resume paused timer.

**Request:** No body

**Response (200):** Updated timer state with `pausedAt` cleared

---

### POST /timer/reset

Reset timer.

**Request:** No body

**Response (200):** Reset timer state

---

## Socket.IO Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('https://voting-api-lcvw.onrender.com', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### Leaderboard Events

**Subscribe:**
```javascript
socket.emit('leaderboard:subscribe');
```

**Receive updates:**
```javascript
socket.on('leaderboard:update', (entries: LeaderboardEntry[]) => {});
socket.on('leaderboard:team:update', (data: { teamId: string, entry: LeaderboardEntry | null }) => {});
socket.on('leaderboard:error', (data: { message: string }) => {});
```

**Request current state:**
```javascript
socket.emit('leaderboard:request');
```

**Unsubscribe:**
```javascript
socket.emit('leaderboard:unsubscribe');
```

---

### Presentation Events

**Subscribe:**
```javascript
socket.emit('presentation:subscribe');
```

**Receive updates:**
```javascript
socket.on('presentation:queue:updated', (status: QueueStatus) => {});
socket.on('presentation:started', (presentation: Presentation) => {});
socket.on('presentation:completed', (presentation: Presentation) => {});
socket.on('presentation:update', (presentation: Presentation) => {});
socket.on('presentation:error', (data: { message: string }) => {});
```

**Request current state:**
```javascript
socket.emit('presentation:request');
```

---

### Timer Events

**Subscribe:**
```javascript
socket.emit('timer:subscribe');
```

**Receive updates:**
```javascript
socket.on('timer:update', (state: TimerState) => {});
socket.on('timer:started', (state: TimerState) => {});
socket.on('timer:paused', (state: TimerState) => {});
socket.on('timer:expired', () => {});
socket.on('timer:reset', (state: TimerState) => {});
socket.on('timer:error', (data: { message: string }) => {});
```

**Request current state:**
```javascript
socket.emit('timer:request');
```

---

### Vote Events

**Receive updates:**
```javascript
socket.on('vote:submitted', (vote: Vote) => {});
socket.on('vote:count:update', (data: { teamId: string, count: number }) => {});
```

---

## Common Workflows

### 1. User Registration and Login

```
1. POST /auth/register → Get tokens
2. Store accessToken and refreshToken
3. Use accessToken in Authorization header for all requests
4. When accessToken expires, POST /auth/refresh with refreshToken
```

### 2. Voting Flow

```
1. GET /teams → List available teams
2. GET /presentations/completed → See which teams have presented
3. PUT /votes/notes → Save notes and rankings for teams
4. POST /votes → Submit final vote (isFinalVote: true)
5. GET /votes/me → Confirm vote was recorded
```

### 3. Running Presentations

```
1. POST /presentations/initialize → Create queue
2. POST /presentations/:id/start → Start first presentation
3. POST /timer/start → Start countdown timer
4. POST /timer/pause/resume → Control timer as needed
5. POST /presentations/next → Move to next team
6. Repeat steps 3-5 for each team
```

### 4. Real-time Updates

```
1. Connect to Socket.IO
2. Emit 'leaderboard:subscribe'
3. Emit 'presentation:subscribe'
4. Emit 'timer:subscribe'
5. Listen for update events
6. Update UI accordingly
```

### 5. Complete Voter Experience Flow

```typescript
// 1. Login
const { user, accessToken } = await api.login({ email, password });

// 2. Get all teams
const teams = await api.getTeams();

// 3. Watch presentations (subscribe to real-time updates)
socket.emit('presentation:subscribe');
socket.emit('timer:subscribe');

// 4. Take notes during presentations
await api.saveNote({
  teamId: currentTeam.id,
  note: 'Great technical demo, innovative solution',
  ranking: 1,
});

// 5. Review your rankings
const rankings = await api.getMyRankings();

// 6. Submit final vote
await api.submitVote({
  teamId: topTeam.id,
  isFinalVote: true,
  publicNote: 'Best overall presentation!',
});

// 7. Watch leaderboard for results
socket.emit('leaderboard:subscribe');
socket.on('leaderboard:update', (entries) => updateUI(entries));
```

### 6. Event Management Flow

```typescript
// 1. Create teams before event
await api.createTeam('Team Alpha', [userId1, userId2, userId3]);
await api.createTeam('Team Beta', [userId4, userId5, userId6]);

// 2. Initialize presentation queue (randomizes order)
const presentations = await api.initializePresentations();

// 3. Start the event - begin first presentation
await api.startPresentation(presentations[0].id);
await api.startTimer(300); // 5 minute timer

// 4. After each presentation, advance to next
await api.nextPresentation();
await api.startTimer(300);

// 5. Open voting when ready
await api.toggleVoting(); // { isOpen: true }

// 6. Monitor results on leaderboard
socket.emit('leaderboard:subscribe');

// 7. Close voting when done
await api.toggleVoting(); // { isOpen: false }
```

---

## Error Handling Patterns

### Frontend Error Handling Example

```typescript
// src/lib/errors.ts
import { ApiRequestError } from '@/lib/api';

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    // Handle specific API error codes
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return error.detail || 'Please check your input';
      case 'UNAUTHORIZED':
        return 'Please log in to continue';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action';
      case 'NOT_FOUND':
        return 'The requested resource was not found';
      case 'CONFLICT':
        return error.message; // e.g., "Email already registered"
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait and try again.';
      case 'ALREADY_VOTED':
        return 'You have already submitted your final vote';
      case 'SELF_VOTE':
        return 'You cannot vote for your own team';
      case 'VOTING_CLOSED':
        return 'Voting is currently closed';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Usage in components
try {
  await api.submitVote({ teamId, isFinalVote: true });
} catch (error) {
  const message = getErrorMessage(error);
  toast.error(message); // Show user-friendly error
}
```

### Handling Rate Limits

```typescript
// The API returns rate limit headers
// RateLimit-Limit: 5
// RateLimit-Remaining: 3
// RateLimit-Reset: 1706000000

async function handleRateLimitedRequest<T>(
  request: () => Promise<T>,
  onRateLimited: (retryAfterMs: number) => void
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 429) {
      // Auth endpoints: wait 15 minutes
      // General endpoints: wait 15 minutes
      // Show user feedback
      onRateLimited(15 * 60 * 1000); // 15 minutes in ms
    }
    throw error;
  }
}
```

### Loading and Error States

```typescript
// src/hooks/useApiRequest.ts
import { useState, useCallback } from 'react';
import { getErrorMessage } from '@/lib/errors';

interface UseApiRequestReturn<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApiRequest<T>(
  apiFunction: (...args: any[]) => Promise<T>
): UseApiRequestReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (...args: any[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, execute, reset };
}

// Usage
function VoteButton({ teamId }: { teamId: string }) {
  const { execute, isLoading, error } = useApiRequest(api.submitVote);

  const handleVote = async () => {
    const result = await execute({ teamId, isFinalVote: true });
    if (result) {
      toast.success('Vote submitted!');
    }
  };

  return (
    <div>
      <button onClick={handleVote} disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit Vote'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

---

## Business Rules

1. **One Final Vote**: Each user can submit exactly one final vote
2. **No Self-Voting**: Database trigger prevents voting for own team
3. **Presentation Required**: Teams must present before receiving votes (configurable)
4. **Team Size**: 3-6 members per team enforced
5. **Team Lock**: Users cannot change teams after submitting final vote
6. **Voting Window**: Admin controls when voting is open/closed

---

## Verified Endpoints (Tested 2026-01-22)

All endpoints below have been tested against the live deployment:

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/` | GET | No | ✅ Verified |
| `/health` | GET | No | ✅ Verified |
| `/api/v1/auth/register` | POST | No | ✅ Verified |
| `/api/v1/auth/login` | POST | No | ✅ Verified |
| `/api/v1/auth/me` | GET | Yes | ✅ Verified |
| `/api/v1/auth/refresh` | POST | No | ✅ Verified |
| `/api/v1/teams` | GET | Yes | ✅ Verified |
| `/api/v1/teams/:id` | GET | Yes | ✅ Verified |
| `/api/v1/teams/:id/members` | GET | Yes | ✅ Verified |
| `/api/v1/votes` | POST | Yes | ✅ Verified |
| `/api/v1/votes/me` | GET | Yes | ✅ Verified |
| `/api/v1/votes/status` | GET | Yes | ✅ Verified |
| `/api/v1/votes/rankings` | GET | Yes | ✅ Verified |
| `/api/v1/votes/notes` | PUT | Yes | ✅ Verified |
| `/api/v1/votes/notes/export` | GET | Yes | ✅ Verified |
| `/api/v1/votes/teams/:id/count` | GET | Yes | ✅ Verified |
| `/api/v1/leaderboard` | GET | No | ✅ Verified |
| `/api/v1/leaderboard/stats` | GET | No | ✅ Verified |
| `/api/v1/leaderboard/:id` | GET | No | ✅ Verified |
| `/api/v1/presentations` | GET | Yes | ✅ Verified |
| `/api/v1/presentations/current` | GET | Yes | ✅ Verified |
| `/api/v1/presentations/upcoming` | GET | Yes | ✅ Verified |
| `/api/v1/presentations/status` | GET | Yes | ✅ Verified |
| `/api/v1/timer` | GET | Yes | ✅ Verified |
| `/api/docs` | GET | No | ✅ Verified |

**Verified Behaviors:**
- ✅ Password validation (requires uppercase, lowercase, number, special char)
- ✅ JWT authentication with 7-day access token expiry
- ✅ Token refresh flow working
- ✅ Rate limiting (5 req/15min on auth endpoints)
- ✅ Duplicate vote prevention ("You have already cast your final vote")
- ✅ Vote count updates in real-time on leaderboard
- ✅ Private notes with rankings saved correctly
- ✅ 401 responses for unauthenticated requests
- ✅ 404 responses for invalid routes
