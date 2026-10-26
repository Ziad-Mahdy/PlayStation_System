import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useLanguageStore from '../store/languageStore';
import toast from 'react-hot-toast';

export default function AdminPasswordModal({ isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [error, setError] = useState('');
  const verifyAndEnterAdmin = useAuthStore((s) => s.verifyAndEnterAdmin);
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';
  const t = useLanguageStore((s) => s.t);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = verifyAndEnterAdmin(password);
    if (success) {
      toast.success(t('admin_modal_welcome'));
      onClose();
      onSuccess();
    } else {
      setError(t('admin_modal_wrong'));
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setPassword('');
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-space-md bg-surface-container-lowest/80 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir={isEn ? 'ltr' : 'rtl'}
        className={`relative w-full max-w-sm bg-surface-container rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] overflow-hidden border border-outline-variant/30 ${shaking ? 'animate-shake' : ''}`}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-primary-container"></div>

        {/* Header */}
        <div className="px-space-xl pt-space-xl pb-space-md flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {t('admin_modal_title')}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {t('admin_modal_subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-space-md end-space-md w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-space-xl pb-space-xl flex flex-col gap-space-md">
          {/* Password field */}
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={t('admin_modal_placeholder')}
              className={`w-full h-14 bg-surface-container-low rounded-xl ps-4 pe-12 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant border transition-all outline-none ${
                error
                  ? 'border-error focus:border-error'
                  : 'border-outline-variant focus:border-primary'
              }`}
              dir={isEn ? 'ltr' : 'rtl'}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-space-xs text-error font-label-md text-label-md">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-space-sm mt-space-xs">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-headline-sm text-headline-sm rounded-xl transition-all cursor-pointer"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              type="submit"
              disabled={!password}
              className="flex-1 h-12 bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary font-headline-sm text-headline-sm rounded-xl transition-all transform active:scale-95 shadow-lg shadow-primary-container/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-space-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isEn ? 'login' : 'lock_open'}
              </span>
              <span>{t('admin_modal_submit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
