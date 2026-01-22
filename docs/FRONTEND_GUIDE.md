# Frontend Integration Guide

This guide helps you build a frontend for the Hackathon Voting API.

## Setup

### Install Dependencies

```bash
npm install socket.io-client
```

### API Client Setup

```javascript
// api.js
const API_URL = 'http://localhost:3000/api/v1';

let accessToken = localStorage.getItem('accessToken');

// Helper for authenticated requests
async function fetchAPI(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth functions
export async function register(username, name, email, password) {
  const data = await fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, name, email, password }),
  });
  accessToken = data.data.accessToken;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  return data.data.user;
}

export async function login(email, password) {
  const data = await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  accessToken = data.data.accessToken;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  return data.data.user;
}

export async function logout() {
  accessToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function getCurrentUser() {
  return (await fetchAPI('/auth/me')).data;
}

// Teams
export async function getTeams() {
  return (await fetchAPI('/teams')).data;
}

export async function getTeam(teamId) {
  return (await fetchAPI(`/teams/${teamId}`)).data;
}

// Voting
export async function submitVote(teamId, isFinalVote, publicNote = '') {
  return (await fetchAPI('/votes', {
    method: 'POST',
    body: JSON.stringify({ teamId, isFinalVote, publicNote }),
  })).data;
}

export async function getMyVotes() {
  return (await fetchAPI('/votes/me')).data;
}

export async function getRankings() {
  return (await fetchAPI('/votes/rankings')).data;
}

export async function updateNote(teamId, note, ranking) {
  return (await fetchAPI('/votes/notes', {
    method: 'PUT',
    body: JSON.stringify({ teamId, note, ranking }),
  })).data;
}

export async function getVotingStatus() {
  return (await fetchAPI('/votes/status')).data;
}

// Leaderboard (public)
export async function getLeaderboard() {
  const response = await fetch(`${API_URL}/leaderboard`);
  const data = await response.json();
  return data.data;
}

// Presentations
export async function getPresentations() {
  return (await fetchAPI('/presentations')).data;
}

export async function getCurrentPresentation() {
  return (await fetchAPI('/presentations/current')).data;
}

// Timer
export async function getTimer() {
  return (await fetchAPI('/timer')).data;
}

export async function getRemainingTime() {
  return (await fetchAPI('/timer/remaining')).data;
}
```

---

## React Components Examples

### Login Form

```jsx
import { useState } from 'react';
import { login } from './api';

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      {error && <div className="error">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Team List with Voting

```jsx
import { useState, useEffect } from 'react';
import { getTeams, submitVote, getMyVotes } from './api';

function TeamList() {
  const [teams, setTeams] = useState([]);
  const [myVotes, setMyVotes] = useState({ hasVoted: false, finalVote: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [teamsData, votesData] = await Promise.all([
        getTeams(),
        getMyVotes(),
      ]);
      setTeams(teamsData);
      setMyVotes(votesData);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleVote = async (teamId) => {
    if (myVotes.hasVoted) {
      alert('You have already submitted your final vote!');
      return;
    }

    const confirmFinal = confirm('Submit as final vote? This cannot be changed.');

    try {
      await submitVote(teamId, confirmFinal);
      const updated = await getMyVotes();
      setMyVotes(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading teams...</div>;

  return (
    <div>
      <h2>Teams</h2>
      {myVotes.hasVoted && (
        <div className="voted-banner">
          You voted for: {myVotes.finalVote.team_name}
        </div>
      )}

      <div className="team-grid">
        {teams.map((team) => (
          <div key={team.id} className="team-card">
            <h3>{team.name}</h3>
            <p>{team.description}</p>

            <button
              onClick={() => handleVote(team.id)}
              disabled={myVotes.hasVoted}
            >
              {myVotes.hasVoted ? 'Already Voted' : 'Vote'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Live Leaderboard

```jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getLeaderboard } from './api';

const socket = io('http://localhost:3000');

function Leaderboard() {
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    // Load initial data
    getLeaderboard().then(setRankings);

    // Listen for real-time updates
    socket.on('leaderboard:update', (data) => {
      setRankings(data);
    });

    return () => {
      socket.off('leaderboard:update');
    };
  }, []);

  return (
    <div className="leaderboard">
      <h2>Live Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Votes</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((entry) => (
            <tr key={entry.teamId} className={`rank-${entry.rank}`}>
              <td>#{entry.rank}</td>
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

### Presentation Timer

```jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getTimer, getCurrentPresentation } from './api';

const socket = io('http://localhost:3000');

function PresentationTimer() {
  const [timer, setTimer] = useState(null);
  const [presentation, setPresentation] = useState(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    // Load initial state
    getTimer().then(setTimer);
    getCurrentPresentation().then(setPresentation);

    // Listen for updates
    socket.on('timer:update', (state) => {
      setTimer(state);
    });

    socket.on('presentation:update', (data) => {
      if (data.presentation) {
        setPresentation(data.presentation);
      }
    });

    socket.on('timer:expired', () => {
      // Play sound or show notification
      new Audio('/alarm.mp3').play();
    });

    return () => {
      socket.off('timer:update');
      socket.off('presentation:update');
      socket.off('timer:expired');
    };
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!timer?.isActive) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(timer.startedAt).getTime()) / 1000
      );
      setRemaining(Math.max(0, timer.durationSeconds - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-display">
      {presentation && (
        <h2>Now Presenting: {presentation.teamName}</h2>
      )}

      <div className={`countdown ${remaining < 30 ? 'warning' : ''}`}>
        {formatTime(remaining)}
      </div>

      {!timer?.isActive && (
        <div className="paused">Timer Paused</div>
      )}
    </div>
  );
}
```

---

## CSS Styling (Tailwind Example)

```css
/* Basic styles for voting app */
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.team-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: white;
}

.leaderboard table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard th,
.leaderboard td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.leaderboard .rank-1 {
  background: #fef3c7;
  font-weight: bold;
}

.countdown {
  font-size: 4rem;
  font-weight: bold;
  text-align: center;
}

.countdown.warning {
  color: #dc2626;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.voted-banner {
  background: #10b981;
  color: white;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.error {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.25rem;
  margin-bottom: 1rem;
}
```

---

## Quick Start Checklist

1. [ ] Set up API client with token handling
2. [ ] Implement login/register forms
3. [ ] Create team list with vote buttons
4. [ ] Add live leaderboard with WebSocket
5. [ ] Build presentation timer display
6. [ ] Add private notes feature
7. [ ] Implement admin controls (if admin user)

## Best Practices

1. **Store tokens in localStorage** for persistence
2. **Handle 401 errors** by redirecting to login
3. **Use WebSocket for live updates** instead of polling
4. **Show loading states** during API calls
5. **Display user-friendly error messages**
6. **Disable vote button** after final vote submitted
