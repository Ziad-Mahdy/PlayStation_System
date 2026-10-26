import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useSubscriptionStore from '../store/subscriptionStore';
import useLanguageStore from '../store/languageStore';
import AdminPasswordModal from './AdminPasswordModal';
import { isSupabaseConfigured } from '../lib/supabase';

// ── Subscription Countdown Timer Component ─────────
function SubscriptionCountdown({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [statusColor, setStatusColor] = useState('text-emerald-400 bg-emerald-500/10 border-emerald-500/30');
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(t('header_sub_inactive'));
      return;
    }

    const calculate = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft(t('header_sub_expired'));
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

      setTimeLeft(t('header_sub_remaining', days, hours, minutes));
    };

    calculate();
    const interval = setInterval(calculate, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, [expiresAt, t, language]);

  return (
    <div
      title={language === 'ar' ? 'مدة الاشتراك السحابي المتبقية' : 'Remaining Cloud Subscription Duration'}
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
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const timeStr = time.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateStr = time.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
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

  const language = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggleLanguage);
  const t = useLanguageStore((s) => s.t);

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
    if (window.confirm(t('header_logout_confirm'))) {
      logoutClient();
      navigate('/login');
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)] border-b border-outline-variant/15">
        <div className="h-16 sm:h-20 w-full px-2.5 sm:px-4 md:px-margin flex items-center justify-between gap-1.5 sm:gap-space-md">

          {/* ── Logo & Title ── */}
          <div className="flex items-center gap-2 sm:gap-space-md min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-on-primary-container text-[20px] sm:text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                sports_esports
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-headline-sm text-sm sm:text-headline-sm text-primary tracking-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[220px] md:max-w-none">
                  {currentClient ? currentClient.shop_name : t('header_title_default')}
                </span>
                {/* Cloud Sync Status Badge */}
                <span
                  title={isSupabaseConfigured ? t('header_cloud_tooltip') : t('header_local_tooltip')}
                  className={`hidden xs:inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium shrink-0 ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  {isSupabaseConfigured ? t('header_cloud') : t('header_local')}
                </span>
              </div>
              <span className="font-label-sm text-[11px] sm:text-label-sm text-on-surface-variant hidden sm:flex items-center gap-1 truncate max-w-[200px]">
                {currentClient ? (
                  <>
                    <span>{t('header_client')}</span>
                    <strong className="text-on-surface truncate">{currentClient.client_name}</strong>
                  </>
                ) : (
                  t('header_subtitle')
                )}
              </span>
            </div>
          </div>

          {/* ── Center: Subscription Countdown & Live Clock ── */}
          <div className="hidden lg:flex items-center gap-3">
            {currentClient && (
              <SubscriptionCountdown expiresAt={currentClient.expires_at} />
            )}
            <LiveClock />
          </div>

          {/* ── Navigation Actions & Controls ── */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* If Developer is logged in, show quick Dev Panel button */}
            {isDevLoggedIn && (
              <button
                type="button"
                onClick={() => navigate('/dev-panel')}
                className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">terminal</span>
                <span className="hidden md:inline">{t('header_dev_panel')}</span>
              </button>
            )}

            {/* Language Switcher Button (عربي / English) */}
            <button
              type="button"
              onClick={toggleLanguage}
              title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
              className="h-9 sm:h-11 px-2 sm:px-3 rounded-xl sm:rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 flex items-center justify-center gap-1 sm:gap-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-primary">translate</span>
              <span className="hidden xs:inline text-xs">{t('header_switch_lang')}</span>
              <span className="xs:hidden text-[11px] font-bold">{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <nav className="flex items-center gap-0.5 sm:gap-space-xs bg-surface-container-low p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-outline-variant/20 shadow-sm">
              {/* Devices Tab */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `h-9 sm:h-11 px-2.5 sm:px-space-md flex items-center justify-center rounded-lg sm:rounded-xl transition-all select-none text-xs sm:text-headline-sm font-semibold ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                {t('header_devices')}
              </NavLink>

              {/* Admin Panel Button */}
              <button
                type="button"
                onClick={handleAdminClick}
                className={`h-9 sm:h-11 px-2.5 sm:px-space-md flex items-center justify-center rounded-lg sm:rounded-xl transition-all select-none text-xs sm:text-headline-sm font-semibold cursor-pointer ${
                  onAdminPage
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                    {onAdminPage && isAdmin ? 'shield_person' : 'lock'}
                  </span>
                  <span>{t('header_admin')}</span>
                </span>
              </button>
            </nav>

            {/* Client Logout Button */}
            {currentClient && (
              <button
                type="button"
                onClick={handleLogout}
                title={language === 'ar' ? 'تسجيل الخروج من الحساب' : 'Logout from account'}
                className="h-9 sm:h-11 px-2 sm:px-3 rounded-xl sm:rounded-2xl bg-error/10 text-error hover:bg-error/20 border border-error/20 flex items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">logout</span>
                <span className="hidden md:inline">{t('header_logout')}</span>
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
