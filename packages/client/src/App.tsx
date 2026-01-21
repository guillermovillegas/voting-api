/**
 * Main App Component
 *
 * OWNERSHIP: PROTECTED (requires coordination)
 * Route additions require LOCKS.md claim
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// [AGENT_UI] UI Components
import { Button, Card, CardHeader, CardBody, Input, Modal } from './components/ui';

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
      <Card variant="elevated" padding="lg" className="max-w-md">
        <CardHeader title="Hackathon Voting" subtitle="Real-time voting for hackathon presentations" />
        <CardBody>
          <p className="text-gray-600 mb-6">
            Welcome to the hackathon voting platform. Login to cast your votes or view the leaderboard.
          </p>
          <div className="space-y-3">
            <Button variant="primary" fullWidth>
              <a href="/login">Login</a>
            </Button>
            <Button variant="outline" fullWidth>
              <a href="/leaderboard">View Leaderboard</a>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card variant="default" padding="lg" className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="mt-4 text-gray-600">Page not found</p>
        <div className="mt-4">
          <Button variant="ghost">
            <a href="/">Go home</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Re-export UI components for convenience
export { Button, Card, CardHeader, CardBody, Input, Modal };
