import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useSubscriptionStore from '../store/subscriptionStore';
import AdminPasswordModal from './AdminPasswordModal';
import { isSupabaseConfigured } from '../lib/supabase';

// ── Subscription Countdown Timer Component ─────────
function SubscriptionCountdown({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [statusColor, setStatusColor] = useState('text-emerald-400 bg-emerald-500/10 border-emerald-500/30');

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('اشتراك غير مفعل');
      return;
    }

    const calculate = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('انتهى الاشتراك');
        setStatusColor('text-rose-400 bg-rose-500/15 border-rose-500/30 animate-pulse');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 7) {
        setStatusColor('text-emerald-400 bg-emerald-500/10 border-emerald-500/30');
      } else if (days > 2) {
        setStatusColor('text-amber-400 bg-amber-500/15 border-amber-500/30');
      } else {
        setStatusColor('text-rose-400 bg-rose-500/15 border-rose-500/30 animate-pulse');
      }

      setTimeLeft(`متبقي ${days} ي و ${hours} س و ${minutes} د`);
    };

    calculate();
    const interval = setInterval(calculate, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div
      title="مدة الاشتراك السحابي المتبقية"
      className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${statusColor}`}
    >
      <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
      <span>{timeLeft}</span>
    </div>
  );
}

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

  const currentClient = useSubscriptionStore((s) => s.currentClient);
  const logoutClient = useSubscriptionStore((s) => s.logoutClient);
  const isDevLoggedIn = useSubscriptionStore((s) => s.isDevLoggedIn);

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

  const handleLogout = () => {
    if (window.confirm('هل تريد تسجيل الخروج من السيستم؟ يمكنك الدخول مجدداً بنفس الكود في أي وقت.')) {
      logoutClient();
      navigate('/login');
    }
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
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                  {currentClient ? currentClient.shop_name : 'بلايستيشن كافيه'}
                </span>
                {/* Cloud Sync Status Badge */}
                <span
                  title={isSupabaseConfigured ? 'متصل بقاعدة بيانات Supabase السحابية' : 'الوضع المحلي (Offline)'}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  {isSupabaseConfigured ? 'سحابي' : 'محلي'}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                {currentClient ? (
                  <>
                    <span>العميل:</span>
                    <strong className="text-on-surface">{currentClient.client_name}</strong>
                  </>
                ) : (
                  'نظام إدارة الصالة والحسابات'
                )}
              </span>
            </div>
          </div>

          {/* ── Center: Subscription Countdown & Live Clock ── */}
          <div className="hidden md:flex items-center gap-3">
            {currentClient && (
              <SubscriptionCountdown expiresAt={currentClient.expires_at} />
            )}
            <LiveClock />
          </div>

          {/* ── Navigation Actions ── */}
          <div className="flex items-center gap-space-sm">
            {/* If Developer is logged in, show quick Dev Panel button */}
            {isDevLoggedIn && (
              <button
                type="button"
                onClick={() => navigate('/dev-panel')}
                className="h-10 px-3 rounded-xl bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                <span className="hidden sm:inline">لوحة المطور</span>
              </button>
            )}

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

              {/* Admin Panel Button */}
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

            {/* Client Logout Button */}
            {currentClient && (
              <button
                type="button"
                onClick={handleLogout}
                title="تسجيل الخروج من الحساب"
                className="h-11 px-3 rounded-2xl bg-error/10 text-error hover:bg-error/20 border border-error/20 flex items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden sm:inline">خروج</span>
              </button>
            )}
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
