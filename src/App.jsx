import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DevicesPage from './pages/DevicesPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import DeveloperPanel from './pages/DeveloperPanel';
import useAuthStore from './store/authStore';
import useDevicesStore from './store/devicesStore';
import useAdminStore from './store/adminStore';
import useSubscriptionStore from './store/subscriptionStore';
import { supabaseService } from './services/supabaseService';
import { subscriptionService } from './services/subscriptionService';

// ── Guard: حماية مسار الأدمن ──────────
function AdminGuard({ children }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

// ── Guard: حماية مسار الكلاينت (يلزم تسجيل الدخول بكود اشتراك أو كمطور) ──────────
function ClientGuard({ children }) {
  const isClientLoggedIn = useSubscriptionStore((s) => s.isClientLoggedIn);
  const isDevLoggedIn = useSubscriptionStore((s) => s.isDevLoggedIn);
  if (!isClientLoggedIn && !isDevLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

// ── Guard: حماية مسار لوحة المطور ──────────
function DevGuard({ children }) {
  const isDevLoggedIn = useSubscriptionStore((s) => s.isDevLoggedIn);
  if (!isDevLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const currentClient = useSubscriptionStore((s) => s.currentClient);
  const isClientLoggedIn = useSubscriptionStore((s) => s.isClientLoggedIn);
  const checkAndUpdateCurrentClient = useSubscriptionStore((s) => s.checkAndUpdateCurrentClient);

  // Sync data when client logs in or changes
  useEffect(() => {
    if (isClientLoggedIn) {
      useDevicesStore.getState().initSync();
      useAdminStore.getState().initSync();
    }
  }, [isClientLoggedIn, currentClient?.phone]);

  // Realtime listeners & periodic subscription check
  useEffect(() => {
    // Realtime changes for devices & products
    const unsubscribeSync = supabaseService.subscribeToChanges((table) => {
      if (['devices', 'categories', 'completed_sessions'].includes(table)) {
        useDevicesStore.getState().initSync();
      }
      if (table === 'products') {
        useAdminStore.getState().initSync();
      }
    });

    // Realtime changes for subscriptions (if developer extends or suspends a client)
    const unsubscribeSub = subscriptionService.subscribeToSubscriptions((payload) => {
      checkAndUpdateCurrentClient();
      useSubscriptionStore.getState().fetchSubscribers();
    });

    // فحص دوري كل دقيقة لانتهاء صلاحية الكود
    const timer = setInterval(() => {
      if (useSubscriptionStore.getState().isClientLoggedIn) {
        checkAndUpdateCurrentClient();
      }
    }, 60000);

    return () => {
      unsubscribeSync();
      unsubscribeSub();
      clearInterval(timer);
    };
  }, [checkAndUpdateCurrentClient]);

  return (
    <Routes>
      {/* صفحة تسجيل الدخول (كلاينت + مطور) */}
      <Route path="/login" element={<LoginPage />} />

      {/* لوحة تحكم المطور المركزية */}
      <Route
        path="/dev-panel"
        element={
          <DevGuard>
            <DeveloperPanel />
          </DevGuard>
        }
      />

      {/* شاشة الأجهزة (للكلاينت المشترك) */}
      <Route
        path="/"
        element={
          <ClientGuard>
            <MainLayout />
          </ClientGuard>
        }
      >
        <Route index element={<DevicesPage />} />
      </Route>

      {/* لوحة الأدمن الخاصة بالكلاينت */}
      <Route
        path="/admin"
        element={
          <ClientGuard>
            <AdminGuard>
              <MainLayout />
            </AdminGuard>
          </ClientGuard>
        }
      >
        <Route index element={<AdminPage />} />
      </Route>

      {/* تحويل أي رابط آخر */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
