import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { TimerProvider } from './context/TimerContext';
import { Navbar } from './components/Navbar';

// Participant Pages
import { TeamLogin } from './pages/TeamLogin';
import { TeamDashboard } from './pages/TeamDashboard';
import { FrequencyChallenge } from './pages/challenges/FrequencyChallenge';
import { StaticChallenge } from './pages/challenges/StaticChallenge';
import { ScriptChallenge } from './pages/challenges/ScriptChallenge';
import { FrameChallenge } from './pages/challenges/FrameChallenge';
import { EchoChallenge } from './pages/challenges/EchoChallenge';
import { EvidenceRoom } from './pages/EvidenceRoom';
import { TimelineModule } from './pages/TimelineModule';
import { FinalSubmission } from './pages/FinalSubmission';

// Admin & Venue Pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CoordinatorView } from './pages/admin/CoordinatorView';
import { Leaderboard } from './pages/admin/Leaderboard';
import { FinaleConsole } from './pages/admin/FinaleConsole';
import { ProjectorView } from './pages/ProjectorView';

// Protected Route Guards
function TeamRoute() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== 'team') return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen flex flex-col bg-deadair-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function AdminRoute() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!role || (!role.includes('admin') && role !== 'room_coordinator')) {
    return <Navigate to="/admin/login" replace />;
  }
  return (
    <div className="min-h-screen flex flex-col bg-deadair-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function RootRedirect() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === 'team') return <Navigate to="/dashboard" replace />;
  if (role === 'room_coordinator') return <Navigate to="/admin/coordinator" replace />;
  if (role?.includes('admin')) return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <TimerProvider>
          <BrowserRouter>
            <Routes>
              {/* Root */}
              <Route path="/" element={<RootRedirect />} />

              {/* Public & Login Routes */}
              <Route path="/login" element={<TeamLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/projector" element={<ProjectorView />} />

              {/* Participant Routes */}
              <Route element={<TeamRoute />}>
                <Route path="/dashboard" element={<TeamDashboard />} />
                <Route path="/challenges/frequency" element={<FrequencyChallenge />} />
                <Route path="/challenges/static" element={<StaticChallenge />} />
                <Route path="/challenges/script" element={<ScriptChallenge />} />
                <Route path="/challenges/frame" element={<FrameChallenge />} />
                <Route path="/challenges/echo" element={<EchoChallenge />} />
                <Route path="/evidence" element={<EvidenceRoom />} />
                <Route path="/timeline" element={<TimelineModule />} />
                <Route path="/final-submission" element={<FinalSubmission />} />
              </Route>

              {/* Admin & Coordinator Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/coordinator" element={<CoordinatorView />} />
                <Route path="/admin/finale" element={<FinaleConsole />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </TimerProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
