import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Layout from './components/layout/Layout';
import LoginPage from './pages/Login';
import { clearAuthToken, getAuthToken } from './lib/api';
import { isTokenExpired } from './lib/utils';
import { SkeletonCard } from './components/ui/Skeleton';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ClientsPage = lazy(() => import('./pages/Clients'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetail'));
const ProjectsPage = lazy(() => import('./pages/Projects'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetail'));
const TasksPage = lazy(() => import('./pages/Tasks'));
const FinancePage = lazy(() => import('./pages/Finance'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const IntegrationsPage = lazy(() => import('./pages/Integrations'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

function ProtectedLayout() {
  const location = useLocation();
  const token = getAuthToken();

  if (!token || isTokenExpired(token)) {
    clearAuthToken();
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Layout />;
}

function RouteFallback() {
  return (
    <div className="space-y-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<ProtectedLayout />}>
          <Route element={<DashboardPage />} path="/" />
          <Route element={<ClientsPage />} path="/clients" />
          <Route element={<ClientDetailPage />} path="/clients/:clientId" />
          <Route element={<ProjectsPage />} path="/projects" />
          <Route element={<ProjectDetailPage />} path="/projects/:projectId" />
          <Route element={<TasksPage />} path="/tasks" />
          <Route element={<FinancePage />} path="/finance" />
          <Route element={<ReportsPage />} path="/reports" />
          <Route element={<IntegrationsPage />} path="/integrations" />
          <Route element={<SettingsPage />} path="/settings" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </Suspense>
  );
}
