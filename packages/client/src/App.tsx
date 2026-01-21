/**
 * Main App Component
 *
 * OWNERSHIP: PROTECTED (requires coordination)
 * Route additions require LOCKS.md claim
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* ============================================================
              ROUTE REGISTRATION
              Each agent adds their routes in their designated section
              Format: {/* [AGENT_<ID>] <feature> routes */}
          {/* ============================================================ */}

          {/* Root route */}
          <Route path="/" element={<HomePage />} />

          {/* [AGENT_AUTH] Auth routes */}
          {/* <Route path="/login" element={<LoginPage />} /> */}
          {/* <Route path="/register" element={<RegisterPage />} /> */}

          {/* [AGENT_VOTING] Voting routes */}
          {/* <Route path="/vote" element={<VotingPage />} /> */}

          {/* [AGENT_LEADER] Leaderboard routes */}
          {/* <Route path="/leaderboard" element={<LeaderboardPage />} /> */}

          {/* [AGENT_PRESENT] Presentation routes */}
          {/* <Route path="/presentations" element={<PresentationsPage />} /> */}

          {/* [AGENT_ADMIN] Admin routes */}
          {/* <Route path="/admin/*" element={<AdminLayout />} /> */}

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Placeholder components - each agent will replace these with real implementations
function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Hackathon Voting</h1>
        <p className="mt-4 text-gray-600">Real-time voting for hackathon presentations</p>
        <div className="mt-8 space-x-4">
          <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Login
          </a>
          <a href="/leaderboard" className="px-4 py-2 border border-gray-300 rounded-lg">
            View Leaderboard
          </a>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="mt-4 text-gray-600">Page not found</p>
        <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}
