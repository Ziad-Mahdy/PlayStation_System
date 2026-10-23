import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DevicesPage from './pages/DevicesPage';
import AdminPage from './pages/AdminPage';
import useAuthStore from './store/authStore';
import useDevicesStore from './store/devicesStore';
import useAdminStore from './store/adminStore';
import { supabaseService } from './services/supabaseService';

// ── Guard: only admins can access /admin ──────────
function AdminGuard({ children }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  useEffect(() => {
    // Initial fetch from Supabase
    useDevicesStore.getState().initSync();
    useAdminStore.getState().initSync();

    // Subscribe to realtime changes
    const unsubscribe = supabaseService.subscribeToChanges((table) => {
      if (['devices', 'categories', 'completed_sessions'].includes(table)) {
        useDevicesStore.getState().initSync();
      }
      if (table === 'products') {
        useAdminStore.getState().initSync();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
