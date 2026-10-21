import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import AdminPasswordModal from './AdminPasswordModal';

// ── Live Clock & Date Component ───────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateStr = time.toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-2xl border border-outline-variant/30 shadow-inner">
      <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
        <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
        <span className="font-label-md font-medium">{dateStr}</span>
      </div>
      <span className="text-outline-variant">•</span>
      <div className="flex items-center gap-1.5 text-primary-fixed">
        <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
        <span className="font-label-price text-label-price font-extrabold tracking-wider">{timeStr}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
export default function Header() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const isAdmin = useAuthStore((s) => s.isAdmin);
  const exitAdmin = useAuthStore((s) => s.exitAdmin);
  const navigate = useNavigate();
  const location = useLocation();
  const onAdminPage = location.pathname === '/admin';

  // Whenever user navigates away from /admin (e.g. to Devices), revoke admin state immediately
  useEffect(() => {
    if (location.pathname !== '/admin') {
      exitAdmin();
    }
  }, [location.pathname, exitAdmin]);

  const handleAdminClick = (e) => {
    e.preventDefault();
    if (onAdminPage && isAdmin) {
      return;
    }
    // Always prompt for password when navigating into admin panel
    setShowPasswordModal(true);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)] border-b border-outline-variant/15">
        <div className="h-20 w-full px-margin flex items-center justify-between gap-space-md">

          {/* ── Logo & Title ── */}
          <div className="flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-on-primary-container text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                sports_esports
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                بلايستيشن كافيه
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                نظام إدارة الصالة والحسابات
              </span>
            </div>
          </div>

          {/* ── Center: Clock & Date ── */}
          <div className="hidden md:flex items-center">
            <LiveClock />
          </div>

          {/* ── Navigation Actions ── */}
          <div className="flex items-center gap-space-sm">
            <nav className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-2xl border border-outline-variant/20 shadow-sm">
              {/* Devices Tab */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `h-11 px-space-md flex items-center justify-center rounded-xl transition-all select-none font-headline-sm text-headline-sm ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                الأجهزة
              </NavLink>

              {/* Admin Panel Button - password-gated whenever returning to admin */}
              <button
                type="button"
                onClick={handleAdminClick}
                className={`h-11 px-space-md flex items-center justify-center rounded-xl transition-all select-none font-headline-sm text-headline-sm cursor-pointer ${
                  onAdminPage
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    {onAdminPage && isAdmin ? 'shield_person' : 'lock'}
                  </span>
                  <span>لوحة الأدمن</span>
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Admin Password Modal */}
      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => navigate('/admin')}
      />
    </>
  );
}
