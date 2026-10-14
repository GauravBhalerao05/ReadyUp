import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import AppLayout from './components/common/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import PracticeTopicsPage from './pages/PracticeTopicsPage';
import PracticeSessionPage from './pages/PracticeSessionPage';
import CompanyDirectoryPage from './pages/CompanyDirectoryPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import MockTestsPage from './pages/MockTestsPage';
import ActiveMockTestPage from './pages/ActiveMockTestPage';
import TestResultPage from './pages/TestResultPage';
import RevisionCentrePage from './pages/RevisionCentrePage';
import StudentProfilePage from './pages/StudentProfilePage';

// Coordinator Pages
import CoordinatorDashboardPage from './pages/CoordinatorDashboardPage';
import CoordinatorImportPage from './pages/CoordinatorImportPage';
import CoordinatorQuestionsPage from './pages/CoordinatorQuestionsPage';
import CoordinatorHistoryPage from './pages/CoordinatorHistoryPage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If coordinator tries student dashboard or vice-versa, route to their natural dashboard
    if (role === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />;
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Smart Root Redirect based on Authentication and Verified Role
function RootRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (role === 'coordinator') {
    return <Navigate to="/coordinator/dashboard" replace />;
  }
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

// Modular SSO Redirect Callback Handler (Per Section 7 of API Contract)
function SSOCallbackHandler() {
  const { switchRoleDev } = useAuth();
  // Read params if present, e.g. ?ticket=... or ?role=...
  const params = new URLSearchParams(window.location.search);
  const externalRole = params.get('role') || 'student';
  switchRoleDev(externalRole);

  if (externalRole === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />;
  if (externalRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/sso/callback" element={<SSOCallbackHandler />} />

              {/* Authenticated Application Layout */}
              <Route element={<AppLayout />}>
                {/* Student Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/practice"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <PracticeTopicsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/practice/session/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <PracticeSessionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/companies"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <CompanyDirectoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/companies/:slug"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <CompanyDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tests"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <MockTestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tests/take/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <ActiveMockTestPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tests/review/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <TestResultPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/revision"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <RevisionCentrePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <StudentProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* T&P Coordinator Routes */}
                <Route
                  path="/coordinator/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/import"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorImportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/questions"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorQuestionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/history"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorHistoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Administrator Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminUsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminAuditLogsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
