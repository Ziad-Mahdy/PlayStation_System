import { useState } from 'react';
import useDevicesStore from '../../store/devicesStore';
import toast from 'react-hot-toast';

export default function StartSessionModal({ deviceId, onClose }) {
  const [mode, setMode] = useState('single'); // 'single' | 'multi'
  const [timeType, setTimeType] = useState('open'); // 'open' | 'fixed'
  const [targetMinutes, setTargetMinutes] = useState(120); // default 2 hours
  const [customerName, setCustomerName] = useState('');

  const device = useDevicesStore((s) => s.devices.find((d) => d.id === deviceId));
  const startSession = useDevicesStore((s) => s.startSession);

  if (!device) return null;

  const hourlyRate = mode === 'single' ? device.singlePrice : device.multiPrice;
  const estimatedCost = timeType === 'fixed' ? ((targetMinutes / 60) * hourlyRate).toFixed(2) : null;

  const handleStart = () => {
    startSession(deviceId, mode, timeType, targetMinutes, customerName);
    const clientNote = customerName.trim() ? ` للزبون (${customerName.trim()})` : '';
    if (timeType === 'fixed') {
      const hours = (targetMinutes / 60).toFixed(1).replace('.0', '');
      toast.success(`تم بدء جلسة محددة (${hours} ساعة)${clientNote} على ${device.name} ⏱️`);
    } else {
      toast.success(`تم بدء جلسة وقت مفتوح${clientNote} على ${device.name} 🎮`);
    }
    onClose();
  };

  const presetTimes = [
    { label: 'نصف ساعة', minutes: 30 },
    { label: 'ساعة', minutes: 60 },
    { label: 'ساعتان', minutes: 120 },
    { label: '3 ساعات', minutes: 180 },
    { label: '4 ساعات', minutes: 240 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-surface-container-lowest/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-surface-container rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] overflow-hidden my-auto border border-outline-variant/30">
        <div className="h-1.5 w-full bg-secondary-container"></div>

        {/* Header */}
        <div className="px-space-xl pt-space-xl pb-space-md flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_circle
              </span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                بدء جلسة جديدة
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {device.name} • {device.type}{device.isVIP ? ' VIP' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-space-xl flex flex-col gap-space-lg max-h-[75vh] overflow-y-auto">
          {/* 1. Mode Selection (Single vs Multi) */}
          <div className="flex flex-col gap-space-xs">
            <p className="font-label-lg text-label-lg text-on-surface">1. نوع اللعب:</p>
            <div className="grid grid-cols-2 gap-space-sm">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  mode === 'single'
                    ? 'border-secondary-container bg-secondary-container/15 text-secondary shadow-md'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ fontVariationSettings: `'FILL' ${mode === 'single' ? 1 : 0}` }}
                >
                  person
                </span>
                <span className="font-label-lg text-label-lg font-bold">فردي (Single)</span>
                <span className="font-label-price text-label-price font-extrabold">
                  {device.singlePrice} ج.م/س
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('multi')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  mode === 'multi'
                    ? 'border-secondary-container bg-secondary-container/15 text-secondary shadow-md'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ fontVariationSettings: `'FILL' ${mode === 'multi' ? 1 : 0}` }}
                >
                  group
                </span>
                <span className="font-label-lg text-label-lg font-bold">جماعي (Multi)</span>
                <span className="font-label-price text-label-price font-extrabold">
                  {device.multiPrice} ج.م/س
                </span>
              </button>
            </div>
          </div>

          {/* 2. Time System (Open vs Fixed) */}
          <div className="flex flex-col gap-space-xs">
            <p className="font-label-lg text-label-lg text-on-surface">2. نظام الوقت:</p>
            <div className="grid grid-cols-2 gap-space-sm">
              {/* Open Time */}
              <button
                type="button"
                onClick={() => setTimeType('open')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                  timeType === 'open'
                    ? 'border-primary bg-primary/10 text-primary-fixed shadow-md'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[32px]">all_inclusive</span>
                <div>
                  <p className="font-label-lg text-label-lg font-bold text-on-surface">وقت مفتوح (Open)</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    العداد يعد تصاعدياً حتى تنهي الجلسة بنفسك
                  </p>
                </div>
              </button>

              {/* Fixed Time */}
              <button
                type="button"
                onClick={() => setTimeType('fixed')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                  timeType === 'fixed'
                    ? 'border-primary bg-primary/10 text-primary-fixed shadow-md'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[32px]">timer</span>
                <div>
                  <p className="font-label-lg text-label-lg font-bold text-on-surface">وقت محدد (Limit)</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    تحديد مدة بالدقائق/الساعات وتنبيه عند الانتهاء
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Duration Selector (Only if timeType === 'fixed') */}
          {timeType === 'fixed' && (
            <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-primary/30 flex flex-col gap-space-sm">
              <span className="font-label-md text-label-md text-primary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>اختر أو حدد مدة اللعب:</span>
              </span>

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {presetTimes.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => setTargetMinutes(preset.minutes)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                      targetMinutes === preset.minutes
                        ? 'bg-primary-container text-on-primary-container border-primary shadow-sm'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-on-surface-variant shrink-0">أو مدة مخصصة:</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Math.max(1, Number(e.target.value)))}
                  className="w-24 h-9 bg-surface-container rounded-lg px-2 text-center font-bold text-on-surface border border-outline-variant/40 focus:border-primary outline-none"
                />
                <span className="text-xs text-on-surface-variant">دقيقة ({ (targetMinutes / 60).toFixed(1).replace('.0', '') } ساعة)</span>
              </div>
            </div>
          )}

          {/* Cost Summary Box */}
          <div className="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between border border-outline-variant/20">
            <div>
              <span className="font-body-md text-body-md text-on-surface-variant block">
                {timeType === 'fixed' ? 'تكلفة الوقت المحددة مسبقاً:' : 'سعر الساعة الحالي:'}
              </span>
              <span className="text-xs text-outline">
                {mode === 'single' ? 'فردي' : 'جماعي'} • {hourlyRate} ج.م / ساعة
              </span>
            </div>
            <div className="text-left">
              <span className="font-label-price text-label-price text-secondary font-black">
                {timeType === 'fixed' ? `${estimatedCost} ج.م` : `${hourlyRate} ج.م/س`}
              </span>
            </div>
          </div>

          {/* 3. Optional Customer Name / Note */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                <span>اسم الزبون أو ملحوظة الحجز:</span>
              </label>
              <span className="text-[11px] text-outline bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/20">
                اختياري (مش إجباري)
              </span>
            </div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="مثال: أحمد، كابتن محمود، طاولة الشباب... (للبحث في الفواتير)"
              className="w-full h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-on-surface placeholder:text-on-surface-variant/50 border border-outline-variant/40 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-surface-container-high p-space-md px-space-xl flex gap-space-sm border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant font-headline-sm text-headline-sm rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 h-12 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all transform active:scale-95 shadow-lg font-bold"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
            <span>ابدأ الوقت</span>
          </button>
        </div>
      </div>
    </div>
  );
}
