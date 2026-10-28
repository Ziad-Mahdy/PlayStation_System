import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSubscriptionStore from '../store/subscriptionStore';
import useLanguageStore from '../store/languageStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const loginClient = useSubscriptionStore((s) => s.loginClient);
  const loginDev = useSubscriptionStore((s) => s.loginDev);
  const isClientLoading = useSubscriptionStore((s) => s.isClientLoading);

  const language = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggleLanguage);
  const t = useLanguageStore((s) => s.t);

  // Client form
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const isEn = language === 'en';

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !code.trim()) {
      toast.error(isEn ? 'Please enter phone number and code' : 'يرجى إدخال رقم الهاتف وكود الاشتراك');
      return;
    }

    // 1. فحص دخول المطور أولاً برقم الهاتف والكود السري المخصص
    const isDev = loginDev(phone, code);
    if (isDev) {
      toast.success(isEn ? 'Welcome Developer to the Control Center 🛠️' : 'مرحباً بك يا مطور في لوحة التحكم المركزية 🛠️');
      navigate('/dev-panel');
      return;
    }

    // 2. تسجيل دخول الكلاينت العادي عبر اشتراكات Supabase
    const res = await loginClient(phone, code);
    if (res.success) {
      if (res.isNewActivation) {
        toast.success(isEn ? 'Subscription activated successfully! Welcome to the system 🎉' : 'تم تفعيل اشتراكك بنجاح! مرحباً بك في السيستم 🎉');
      } else {
        toast.success(isEn ? 'Signed in successfully! Welcome back' : 'تم تسجيل الدخول بنجاح! أهلاً بك مجدداً');
      }
      navigate('/');
    } else {
      toast.error(res.message || (isEn ? 'Login failed' : 'فشل تسجيل الدخول'));
    }
  };

  return (
    <div
      key={language}
      dir={isEn ? 'ltr' : 'rtl'}
      lang={language}
      className="min-h-screen bg-surface flex flex-col justify-center items-center p-3 sm:p-4 relative overflow-hidden"
    >
      {/* Top Language Switcher */}
      <div className="absolute top-3 end-3 sm:top-6 sm:end-6 z-20">
        <button
          type="button"
          onClick={toggleLanguage}
          title={isEn ? 'التحويل إلى العربية' : 'Switch to English'}
          className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-2xl bg-surface-container-high/90 hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-md cursor-pointer backdrop-blur-md"
        >
          <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-primary">translate</span>
          <span>{isEn ? 'العربية' : 'English'}</span>
        </button>
      </div>

      {/* Background ambient neon glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-surface-container-low border border-outline-variant/30 rounded-3xl p-5 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-lg mb-3 sm:mb-4 ring-1 ring-primary/30">
            <span
              className="material-symbols-outlined text-[30px] sm:text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sports_esports
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-primary tracking-tight">
            {t('login_title')}
          </h1>
          <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant mt-1">
            {t('login_subtitle')}
          </p>
        </div>

        {/* Client Login Form */}
        <form onSubmit={handleClientSubmit} className="flex flex-col gap-4 sm:gap-5">
          {/* Phone Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-xs sm:text-label-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-primary">phone_iphone</span>
              {t('login_phone_label')}
            </label>
            <input
              type="tel"
              placeholder="010xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary text-left dir-ltr placeholder:text-outline/50 transition-all font-mono text-sm sm:text-base"
              required
            />
          </div>

          {/* Subscription Code Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-xs sm:text-label-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-primary">key</span>
              {t('login_code_label')}
            </label>
            <input
              type="text"
              placeholder="PS-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary text-center tracking-widest placeholder:tracking-normal placeholder:text-outline/50 transition-all font-mono font-bold text-sm sm:text-base"
              required
            />
            <p className="text-[11px] sm:text-[12px] text-on-surface-variant/80 mt-0.5">
              {t('login_code_hint')}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isClientLoading}
            className="mt-1 sm:mt-2 h-11 sm:h-12 w-full rounded-xl bg-primary text-on-primary font-headline-sm text-sm sm:text-headline-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            {isClientLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
                <span>{t('login_loading')}</span>
              </>
            ) : (
              <>
                <span>{t('login_submit')}</span>
                <span className="material-symbols-outlined text-[20px] rtl:rotate-0 ltr:rotate-180">login</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
