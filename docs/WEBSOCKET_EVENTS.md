# WebSocket Events Guide

The voting app uses Socket.io for real-time updates. Connect to the same server URL.

## Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

---

## Events You Can Listen To

### vote:submitted
Fired when any user submits a vote.

```javascript
socket.on('vote:submitted', (vote) => {
  console.log('New vote:', vote);
  // {
  //   id: "uuid",
  //   userId: "uuid",
  //   teamId: "uuid",
  //   isFinalVote: true,
  //   publicNote: "Great job!",
  //   submittedAt: "2024-01-15T10:30:00Z"
  // }
});
```

### leaderboard:update
Fired when the leaderboard changes (after final votes).

```javascript
socket.on('leaderboard:update', (leaderboard) => {
  console.log('Leaderboard updated:', leaderboard);
  // [
  //   { teamId: "uuid", teamName: "Alpha", voteCount: 5, rank: 1 },
  //   { teamId: "uuid", teamName: "Beta", voteCount: 3, rank: 2 }
  // ]
});
```

### team:update
Fired when teams are created, updated, or deleted.

```javascript
socket.on('team:update', ({ action, team }) => {
  console.log(`Team ${action}:`, team);
  // action: "created" | "updated" | "deleted"
  // team: { id: "uuid", name: "Team Name", ... }
});
```

### presentation:update
Fired when presentation status changes.

```javascript
socket.on('presentation:update', (data) => {
  console.log('Presentation update:', data);
  // {
  //   action: "initialized" | "started" | "advanced" | "reset",
  //   presentation: { ... } | presentations: [ ... ]
  // }
});
```

### timer:update
Fired when timer state changes.

```javascript
socket.on('timer:update', (timerState) => {
  console.log('Timer update:', timerState);
  // {
  //   isActive: true,
  //   durationSeconds: 300,
  //   elapsedSeconds: 45,
  //   startedAt: "datetime",
  //   presentationId: "uuid"
  // }
});
```

### timer:expired
Fired when timer reaches zero.

```javascript
socket.on('timer:expired', (data) => {
  console.log('Timer expired!', data.timestamp);
  // Play alert sound, show notification, etc.
});
```

---

## Complete React Example

```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

function VotingApp() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentPresentation, setCurrentPresentation] = useState(null);
  const [timerState, setTimerState] = useState(null);
  const [recentVotes, setRecentVotes] = useState([]);

  useEffect(() => {
    // Listen to real-time events
    socket.on('leaderboard:update', (data) => {
      setLeaderboard(data);
    });

    socket.on('vote:submitted', (vote) => {
      setRecentVotes(prev => [vote, ...prev].slice(0, 10));
    });

    socket.on('presentation:update', (data) => {
      if (data.presentation) {
        setCurrentPresentation(data.presentation);
      }
    });

    socket.on('timer:update', (state) => {
      setTimerState(state);
    });

    socket.on('timer:expired', () => {
      // Play sound or show alert
      alert('Time is up!');
    });

    // Cleanup on unmount
    return () => {
      socket.off('leaderboard:update');
      socket.off('vote:submitted');
      socket.off('presentation:update');
      socket.off('timer:update');
      socket.off('timer:expired');
    };
  }, []);

  return (
    <div>
      <h1>Hackathon Voting</h1>

      {/* Timer Display */}
      {timerState && (
        <div className="timer">
          Time Remaining: {timerState.durationSeconds - timerState.elapsedSeconds}s
        </div>
      )}

      {/* Current Presenter */}
      {currentPresentation && (
        <div className="presenter">
          Now Presenting: {currentPresentation.teamName}
        </div>
      )}

      {/* Leaderboard */}
      <h2>Leaderboard</h2>
      <ul>
        {leaderboard.map((entry) => (
          <li key={entry.teamId}>
            #{entry.rank} {entry.teamName} - {entry.voteCount} votes
          </li>
        ))}
      </ul>

      {/* Recent Votes */}
      <h2>Recent Activity</h2>
      <ul>
        {recentVotes.map((vote) => (
          <li key={vote.id}>
            Vote for team {vote.teamId}
            {vote.isFinalVote && ' (Final)'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default VotingApp;
```

---

## Event Summary Table

| Event | Trigger | Data |
|-------|---------|------|
| `vote:submitted` | Any vote submission | Vote object |
| `leaderboard:update` | Final vote changes rankings | Leaderboard array |
| `team:update` | Team CRUD operations | `{ action, team }` |
| `presentation:update` | Presentation flow changes | `{ action, presentation }` |
| `timer:update` | Timer start/pause/reset | Timer state object |
| `timer:expired` | Timer reaches zero | `{ timestamp }` |

---

## Tips

1. **Always clean up listeners** when components unmount to prevent memory leaks
2. **Use the leaderboard event** to keep rankings in sync without polling
3. **Timer events are frequent** - debounce UI updates if needed
4. **Combine with REST API** - fetch initial state via REST, then update via WebSocket
