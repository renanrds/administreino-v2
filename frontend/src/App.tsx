import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppsPage from './pages/AppsPage';
import DashboardPage from './pages/DashboardPage';
import WorkoutsPage from './pages/WorkoutsPage';
import WorkoutFormPage from './pages/WorkoutFormPage';
import PromptGeneratorPage from './pages/PromptGeneratorPage';
import ImportWorkoutPage from './pages/ImportWorkoutPage';
import ActiveSessionPage from './pages/ActiveSessionPage';
import HistoryPage from './pages/HistoryPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ProfilePage from './pages/ProfilePage';
import AdminisgranaPage from './pages/AdminisgranaPage';
import AdminUsersPage from './pages/AdminUsersPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user?.is_staff ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<AppsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="workouts/new" element={<WorkoutFormPage />} />
          <Route path="workouts/:id/edit" element={<WorkoutFormPage />} />
          <Route path="workouts/gerar-prompt" element={<PromptGeneratorPage />} />
          <Route path="workouts/importar" element={<ImportWorkoutPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<SessionDetailPage />} />
          <Route path="grana" element={<AdminisgranaPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        </Route>
        <Route path="/session/:id" element={<PrivateRoute><ActiveSessionPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
