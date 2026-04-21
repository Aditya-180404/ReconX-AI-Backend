import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MatrixRain from './components/MatrixRain';
import CopilotWidget from './components/CopilotWidget';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import LandingPage        from './pages/LandingPage';
import AuthPage           from './pages/AuthPage';

// Protected Pages
import Dashboard          from './pages/Dashboard';
import ScanPage           from './pages/ScanPage';
import VulnerabilitiesPage from './pages/VulnerabilitiesPage';
import ReportsPage        from './pages/ReportsPage';
import TerminalPage       from './pages/TerminalPage';
import SettingsPage       from './pages/SettingsPage';
import DocumentationPage  from './pages/DocumentationPage';

/* Protected route wrapper */
function Protected({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-base)]">
      <div className="text-[var(--color-neon-cyan)] font-mono animate-pulse text-sm">INITIALIZING CORE ENGINE…</div>
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <MatrixRain />
      <div className="relative z-10">
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<AuthPage type="login" />} />
            <Route path="/register" element={<AuthPage type="register" />} />

            {/* Private — all share DashboardLayout */}
            <Route
              element={
                <Protected>
                  <DashboardLayout />
                </Protected>
              }
            >
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/scan"           element={<ScanPage />} />
              <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
              <Route path="/reports"        element={<ReportsPage />} />
              <Route path="/terminal"       element={<TerminalPage />} />
              <Route path="/settings"       element={<SettingsPage />} />
              <Route path="/documentation"  element={<DocumentationPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CopilotWidget />
        </Router>
      </div>
    </AuthProvider>
  );
}
