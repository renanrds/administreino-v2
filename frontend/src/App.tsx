import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WorkoutsPage from './pages/WorkoutsPage';
import WorkoutFormPage from './pages/WorkoutFormPage';
import PromptGeneratorPage from './pages/PromptGeneratorPage';
import ImportWorkoutPage from './pages/ImportWorkoutPage';
import ActiveSessionPage from './pages/ActiveSessionPage';
import HistoryPage from './pages/HistoryPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ProfilePage from './pages/ProfilePage';
import MoneygerLayout, { MoneygerRoute } from './moneyger/MoneygerLayout';
import MoneygerDashboardPage from './moneyger/pages/DashboardPage';
import MoneygerTransactionsPage from './moneyger/pages/TransactionsPage';
import MoneygerCapturePage from './moneyger/pages/CapturePage';
import MoneygerBudgetsPage from './moneyger/pages/BudgetsPage';
import MoneygerAccountsPage from './moneyger/pages/AccountsPage';
import MoneygerMorePage from './moneyger/pages/MorePage';
import MoneygerActivityPage from './moneyger/pages/ActivityPage';
import MoneygerPlanningPage from './moneyger/pages/PlanningPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="workouts/new" element={<WorkoutFormPage />} />
          <Route path="workouts/:id/edit" element={<WorkoutFormPage />} />
          <Route path="workouts/gerar-prompt" element={<PromptGeneratorPage />} />
          <Route path="workouts/importar" element={<ImportWorkoutPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<SessionDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="/session/:id" element={<PrivateRoute><ActiveSessionPage /></PrivateRoute>} />
        <Route path="/moneyger" element={<MoneygerRoute><MoneygerLayout /></MoneygerRoute>}>
          <Route index element={<MoneygerDashboardPage />} />
          <Route path="transactions" element={<MoneygerTransactionsPage />} />
          <Route path="capture" element={<MoneygerCapturePage />} />
          <Route path="planning" element={<MoneygerPlanningPage />} />
          <Route path="budgets" element={<MoneygerBudgetsPage />} />
          <Route path="accounts" element={<MoneygerAccountsPage />} />
          <Route path="more" element={<MoneygerMorePage />} />
          <Route path="activity" element={<MoneygerActivityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
