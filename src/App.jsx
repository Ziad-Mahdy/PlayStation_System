import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DevicesPage from './pages/DevicesPage';
import AdminPage from './pages/AdminPage';
import useAuthStore from './store/authStore';

// ── Guard: only admins can access /admin ──────────
function AdminGuard({ children }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public route - Devices page (worker) */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DevicesPage />} />
      </Route>

      {/* Protected route - Admin panel */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <MainLayout />
          </AdminGuard>
        }
      >
        <Route index element={<AdminPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
