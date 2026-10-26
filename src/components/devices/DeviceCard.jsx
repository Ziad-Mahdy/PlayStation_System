import { useState, useEffect, useRef } from 'react';
import useLanguageStore from '../../store/languageStore';
import toast from 'react-hot-toast';

// ── Format seconds as HH:MM:SS ───────────────────
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ── Compute cost from elapsed seconds ────────────
export function computeCosts(device, elapsedSeconds) {
  if (!device.session) return { timeCost: 0, ordersCost: 0, total: 0 };
  const hourlyRate =
    device.session.mode === 'single' ? device.singlePrice : device.multiPrice;
  const timeCost = parseFloat(((elapsedSeconds / 3600) * hourlyRate).toFixed(2));
  const ordersCost = parseFloat(
    device.session.orders.reduce((sum, o) => sum + o.price * o.qty, 0).toFixed(2)
  );
  return { timeCost, ordersCost, total: parseFloat((timeCost + ordersCost).toFixed(2)) };
}

// ── Helper: Choose icon based on device type & VIP ──
export function getDeviceIcon(type, isVIP) {
  if (isVIP) return 'stars';
  const t = (type || '').toLowerCase();
  if (t.includes('بلياردو') || t.includes('billiard')) return 'sports_tennis';
  if (t.includes('بنج') || t.includes('ping') || t.includes('تنس')) return 'sports_cricket';
  if (t.includes('pc') || t.includes('كمبيوتر') || t.includes('حاسوب')) return 'desktop_windows';
  if (t.includes('vr') || t.includes('واقع')) return 'view_in_ar';
  return 'sports_esports';
}

// ─────────────────────────────────────────────────
export default function DeviceCard({ device, onOpenSession, onStartSession }) {
  const [elapsed, setElapsed] = useState(0);
  const notifiedRef = useRef(false);
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  // Live timer for busy devices
  useEffect(() => {
    if (device.status !== 'busy' || !device.session) {
      setElapsed(0);
      notifiedRef.current = false;
      return;
    }
    const tick = () => {
      const sec = Math.floor((Date.now() - device.session.startTime) / 1000);
      setElapsed(sec);

      // Check if fixed session expired
      if (device.session.timeType === 'fixed' && device.session.targetMinutes) {
        const targetSec = device.session.targetMinutes * 60;
        if (sec >= targetSec && !notifiedRef.current) {
          notifiedRef.current = true;
          const msg = isEn
            ? `⏰ Notice! Time finished for ${device.name}! Please notify customer.`
            : `⏰ انتبه! انتهى وقت ${device.name}! يرجى مراجعة الزبون`;
          toast.error(msg, {
            duration: 8000,
            icon: '⏰',
          });
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [device.status, device.session?.startTime, device.session?.targetMinutes, device.session?.timeType, device.name, isEn]);

  const { timeCost, ordersCost, total } = computeCosts(device, elapsed);
  const deviceIcon = getDeviceIcon(device.type, device.isVIP);

  const currencyStr = isEn ? '$' : 'ج.م';
  const singleLabel = isEn ? 'Single' : 'فردي';
  const multiLabel = isEn ? 'Multi' : 'جماعي';
  const perHourStr = isEn ? 'hr' : 'ساعة';

  // ── Free device card ──────────────────────────
  if (device.status === 'free') {
    return (
      <div className="device-card bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg relative overflow-hidden">
        {/* Status bar */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-secondary-container"></div>

        <div className="flex flex-col gap-space-md">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[28px]">{deviceIcon}</span>
              </div>
              <div>
                <div className="flex items-center gap-space-xs">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface">{device.name}</h3>
                  <span className="bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-space-xs py-0.5 rounded">
                    {device.type}{device.isVIP ? ' VIP' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  <span>
                    {singleLabel}: {device.singlePrice} {currencyStr} | {multiLabel}: {device.multiPrice} {currencyStr} / {perHourStr}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-space-xs bg-secondary-container/20 text-secondary px-space-md py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-label-lg text-label-lg font-bold">
                {isEn ? 'Available' : 'فاضي'}
              </span>
            </div>
          </div>

          {/* Empty state */}
          <div className="bg-surface-container-lowest/50 rounded-xl p-space-lg flex flex-col items-center justify-center my-space-xs text-center py-8">
            <span className="material-symbols-outlined text-[42px] text-outline-variant mb-space-xs">
              lock_open_right
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface-variant">
              {isEn ? 'Station is currently free' : 'الجهاز متاح حالياً'}
            </span>
            <span className="font-body-sm text-body-sm text-outline mt-1">
              {singleLabel}: {device.singlePrice} {currencyStr} • {multiLabel}: {device.multiPrice} {currencyStr} / {perHourStr}
            </span>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStartSession(device.id)}
          className="w-full h-14 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-sm transition-all transform active:scale-95 shadow-md mt-space-md cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}>
            play_arrow
          </span>
          <span>{isEn ? 'Start Time' : 'ابدأ الوقت'}</span>
        </button>
      </div>
    );
  }

  // ── Busy device card ──────────────────────────
  const isVIP = device.isVIP;
  const isFixed = device.session?.timeType === 'fixed';
  const targetSeconds = isFixed ? (device.session.targetMinutes || 0) * 60 : 0;
  const remainingSeconds = isFixed ? Math.max(0, targetSeconds - elapsed) : 0;
  const isExpired = isFixed && elapsed >= targetSeconds;

  const startTimeStr = new Date(device.session.startTime).toLocaleTimeString(
    isEn ? 'en-US' : 'ar-EG',
    { hour: '2-digit', minute: '2-digit', hour12: true }
  );

  return (
    <div
      className={`device-card cursor-pointer group bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-2xl relative overflow-hidden ring-1 ${
        isExpired
          ? 'ring-2 ring-error animate-pulse shadow-error/20'
          : isVIP
          ? 'ring-primary/30'
          : 'ring-tertiary-container/40'
      }`}
      onClick={() => onOpenSession(device.id)}
    >
      {/* Status bar */}
      <div
        className={`absolute top-0 right-0 left-0 h-1.5 ${
          isExpired
            ? 'bg-error'
            : isVIP
            ? 'bg-primary-container'
            : 'bg-tertiary-container'
        }`}
      ></div>

      <div className="flex flex-col gap-space-md">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-space-sm">
            <div className={`w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shadow-inner ${isExpired ? 'text-error' : isVIP ? 'text-primary-fixed' : 'text-primary'}`}>
              <span className="material-symbols-outlined text-[28px]">
                {deviceIcon}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs">
                <h3 className="font-headline-lg text-headline-lg text-on-surface">{device.name}</h3>
                <span className={`font-label-sm text-label-sm px-space-xs py-0.5 rounded ${isVIP ? 'bg-primary/20 text-primary-fixed' : 'bg-surface-variant text-on-surface-variant'}`}>
                  {device.type}{isVIP ? ' VIP' : ''}
                </span>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                <span>
                  {isEn ? 'Started: ' : 'بدأ: '}{startTimeStr}
                </span>
                <span className="text-outline">•</span>
                <span>{device.session.mode === 'single' ? singleLabel : multiLabel}</span>
              </div>
              {device.session.customerName && (
                <div className="flex items-center gap-1 text-xs text-secondary mt-1 font-medium">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  <span>{isEn ? 'Guest: ' : 'الزبون: '}{device.session.customerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {isExpired ? (
            <div className="flex items-center gap-space-xs bg-error-container/40 text-error px-space-md py-1 rounded-full shadow-sm animate-bounce">
              <span className="material-symbols-outlined text-[16px]">alarm</span>
              <span className="font-label-md text-label-md font-black">
                {isEn ? 'Time Up!' : 'انتهى الوقت!'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-space-xs bg-tertiary-container/20 text-tertiary px-space-md py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-ping"></span>
              <span className="font-label-lg text-label-lg font-bold">
                {isEn ? 'Busy' : 'شغال'}
              </span>
            </div>
          )}
        </div>

        {/* Timer display */}
        <div className={`bg-surface-container-lowest rounded-xl p-space-md flex flex-col items-center justify-center my-space-xs shadow-inner border ${isExpired ? 'border-error/40' : 'border-outline-variant/10'}`}>
          <div className="flex items-center gap-1 text-on-surface-variant uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[14px]">
              {isFixed ? 'timer' : 'all_inclusive'}
            </span>
            <span className="font-label-sm text-label-sm font-bold">
              {isFixed
                ? (isEn ? `Fixed (${device.session.targetMinutes} min)` : `وقت محدد (${device.session.targetMinutes} دقيقة)`)
                : (isEn ? 'Open Time' : 'وقت مفتوح')}
            </span>
          </div>

          {/* If fixed and not expired: show remaining, otherwise show elapsed */}
          {isFixed ? (
            <div className="flex flex-col items-center">
              <div className={`font-label-timer text-label-timer tracking-wider font-extrabold text-center drop-shadow-md ${isExpired ? 'text-error animate-pulse' : 'text-primary-fixed'}`}>
                {isExpired ? `+${formatTime(elapsed - targetSeconds)}` : formatTime(remainingSeconds)}
              </div>
              <span className={`text-xs font-bold mt-0.5 ${isExpired ? 'text-error' : 'text-secondary'}`}>
                {isExpired
                  ? (isEn ? 'Overtime (Time Expired!)' : 'انتهى الوقت المحدد! (وقت إضافي)')
                  : (isEn ? `Remaining (Elapsed: ${formatTime(elapsed)})` : `متبقي من المدة (منقضي ${formatTime(elapsed)})`)}
              </span>
            </div>
          ) : (
            <div className={`font-label-timer text-label-timer tracking-wider font-extrabold text-center drop-shadow-md ${isVIP ? 'text-primary-fixed' : 'text-on-surface'}`}>
              {formatTime(elapsed)}
            </div>
          )}

          <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm mt-1">
            <span className="material-symbols-outlined text-[14px]">videogame_asset</span>
            <span>
              {device.session.mode === 'single' ? singleLabel : multiLabel} •{' '}
              {device.session.orders.length > 0
                ? (isEn
                    ? `${device.session.orders.reduce((s, o) => s + o.qty, 0)} orders`
                    : `${device.session.orders.reduce((s, o) => s + o.qty, 0)} طلبات`)
                : (isEn ? 'No orders' : 'بدون طلبات')}
            </span>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {isEn ? 'Current Total:' : 'الحساب التراكمي:'}
            </span>
            <span className="font-label-sm text-label-sm text-outline">
              {isEn
                ? `Time: ${timeCost} + Orders: ${ordersCost} ${currencyStr}`
                : `الوقت ${timeCost} + الطلبات ${ordersCost} ${currencyStr}`}
            </span>
          </div>
          <div className="text-left dir-ltr">
            <span className="font-label-price text-label-price text-secondary font-bold">
              {total} {currencyStr}
            </span>
          </div>
        </div>
      </div>

      {/* Click hint */}
      <div className={`mt-space-md pt-space-sm flex items-center justify-between font-label-md text-label-md px-space-md py-space-xs rounded-lg ${isExpired ? 'bg-error-container/30 text-error' : 'bg-surface-container text-primary'}`}>
        <span className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px]">touch_app</span>
          <span>
            {isExpired
              ? (isEn ? 'Click to checkout or extend' : 'انقر لإنهاء الجلسة أو تمديدها')
              : (isEn ? 'Click for session details & orders' : 'انقر للتفاصيل والحساب')}
          </span>
        </span>
        <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform rtl:rotate-0 ltr:rotate-180">
          arrow_back
        </span>
      </div>
    </div>
  );
}
