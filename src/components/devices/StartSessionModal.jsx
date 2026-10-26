import { useState } from 'react';
import useDevicesStore from '../../store/devicesStore';
import useLanguageStore from '../../store/languageStore';
import toast from 'react-hot-toast';

export default function StartSessionModal({ deviceId, onClose }) {
  const [mode, setMode] = useState('single'); // 'single' | 'multi'
  const [timeType, setTimeType] = useState('open'); // 'open' | 'fixed'
  const [targetMinutes, setTargetMinutes] = useState(120); // default 2 hours
  const [customerName, setCustomerName] = useState('');

  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';
  const t = useLanguageStore((s) => s.t);

  const device = useDevicesStore((s) => s.devices.find((d) => d.id === deviceId));
  const startSession = useDevicesStore((s) => s.startSession);

  if (!device) return null;

  const hourlyRate = mode === 'single' ? device.singlePrice : device.multiPrice;
  const estimatedCost = timeType === 'fixed' ? ((targetMinutes / 60) * hourlyRate).toFixed(2) : null;

  const handleStart = () => {
    startSession(deviceId, mode, timeType, targetMinutes, customerName);
    const clientNote = customerName.trim()
      ? (isEn ? ` for (${customerName.trim()})` : ` للزبون (${customerName.trim()})`)
      : '';
    if (timeType === 'fixed') {
      const hours = (targetMinutes / 60).toFixed(1).replace('.0', '');
      toast.success(
        isEn
          ? `Fixed session (${hours} hr) started${clientNote} on ${device.name} ⏱️`
          : `تم بدء جلسة محددة (${hours} ساعة)${clientNote} على ${device.name} ⏱️`
      );
    } else {
      toast.success(
        isEn
          ? `Open session started${clientNote} on ${device.name} 🎮`
          : `تم بدء جلسة وقت مفتوح${clientNote} على ${device.name} 🎮`
      );
    }
    onClose();
  };

  const presetTimes = [
    { label: isEn ? '30 Min' : 'نصف ساعة', minutes: 30 },
    { label: isEn ? '1 Hour' : 'ساعة', minutes: 60 },
    { label: isEn ? '2 Hours' : 'ساعتان', minutes: 120 },
    { label: isEn ? '3 Hours' : '3 ساعات', minutes: 180 },
    { label: isEn ? '4 Hours' : '4 ساعات', minutes: 240 },
  ];

  const currencyStr = isEn ? '$' : 'ج.م';
  const singleLabel = isEn ? 'Single' : 'فردي';
  const multiLabel = isEn ? 'Multi' : 'جماعي';
  const perHourStr = isEn ? 'hr' : 'ساعة';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-space-md bg-surface-container-lowest/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-surface-container rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] overflow-hidden my-auto border border-outline-variant/30">
        <div className="h-1.5 w-full bg-secondary-container"></div>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 sm:px-space-xl sm:pt-space-xl sm:pb-space-md flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-2 sm:gap-space-md min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0">
              <span
                className="material-symbols-outlined text-[24px] sm:text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_circle
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-md text-base sm:text-headline-md text-on-surface truncate">
                {isEn ? 'Start New Session' : 'بدء جلسة جديدة'}
              </h2>
              <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant mt-0.5 truncate">
                {device.name} • {device.type}{device.isVIP ? ' VIP' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-3.5 sm:p-space-xl flex flex-col gap-3 sm:gap-space-lg max-h-[75vh] overflow-y-auto">
          {/* 1. Mode Selection (Single vs Multi) */}
          <div className="flex flex-col gap-space-xs">
            <p className="font-label-lg text-label-lg text-on-surface">
              {isEn ? '1. Play Mode:' : '1. نوع اللعب:'}
            </p>
            <div className="grid grid-cols-2 gap-space-sm">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
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
                <span className="font-label-lg text-label-lg font-bold">
                  {singleLabel} (1 Controller)
                </span>
                <span className="font-label-price text-label-price font-extrabold">
                  {device.singlePrice} {currencyStr}/{perHourStr}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('multi')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
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
                <span className="font-label-lg text-label-lg font-bold">
                  {multiLabel} (2+ Controllers)
                </span>
                <span className="font-label-price text-label-price font-extrabold">
                  {device.multiPrice} {currencyStr}/{perHourStr}
                </span>
              </button>
            </div>
          </div>

          {/* 2. Time System (Open vs Fixed) */}
          <div className="flex flex-col gap-space-xs">
            <p className="font-label-lg text-label-lg text-on-surface">
              {isEn ? '2. Time System:' : '2. نظام الوقت:'}
            </p>
            <div className="grid grid-cols-2 gap-space-sm">
              {/* Open Time */}
              <button
                type="button"
                onClick={() => setTimeType('open')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  timeType === 'open'
                    ? 'border-primary bg-primary/10 text-primary-fixed shadow-md'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[32px]">all_inclusive</span>
                <div>
                  <p className="font-label-lg text-label-lg font-bold text-on-surface">
                    {isEn ? 'Open Time' : 'وقت مفتوح (Open)'}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {isEn ? 'Timer runs until ended manually' : 'العداد يعد تصاعدياً حتى تنهي الجلسة بنفسك'}
                  </p>
                </div>
              </button>

              {/* Fixed Time */}
              <button
                type="button"
                onClick={() => setTimeType('fixed')}
                className={`p-space-md rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  timeType === 'fixed'
                    ? 'border-primary bg-primary/10 text-primary-fixed shadow-md'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[32px]">timer</span>
                <div>
                  <p className="font-label-lg text-label-lg font-bold text-on-surface">
                    {isEn ? 'Fixed Duration' : 'وقت محدد (Limit)'}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {isEn ? 'Alerts automatically when time runs out' : 'تحديد مدة بالدقائق/الساعات وتنبيه عند الانتهاء'}
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
                <span>{isEn ? 'Choose or type duration:' : 'اختر أو حدد مدة اللعب:'}</span>
              </span>

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {presetTimes.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => setTargetMinutes(preset.minutes)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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
                <span className="text-xs text-on-surface-variant shrink-0">
                  {isEn ? 'Or custom minutes:' : 'أو مدة مخصصة:'}
                </span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Math.max(1, Number(e.target.value)))}
                  className="w-24 h-9 bg-surface-container rounded-lg px-2 text-center font-bold text-on-surface border border-outline-variant/40 focus:border-primary outline-none"
                />
                <span className="text-xs text-on-surface-variant">
                  {isEn
                    ? `minutes (${(targetMinutes / 60).toFixed(1).replace('.0', '')} hours)`
                    : `دقيقة (${(targetMinutes / 60).toFixed(1).replace('.0', '')} ساعة)`}
                </span>
              </div>
            </div>
          )}

          {/* Cost Summary Box */}
          <div className="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between border border-outline-variant/20">
            <div>
              <span className="font-body-md text-body-md text-on-surface-variant block">
                {timeType === 'fixed'
                  ? (isEn ? 'Estimated Time Cost:' : 'تكلفة الوقت المحددة مسبقاً:')
                  : (isEn ? 'Current Hourly Rate:' : 'سعر الساعة الحالي:')}
              </span>
              <span className="text-xs text-outline">
                {mode === 'single' ? singleLabel : multiLabel} • {hourlyRate} {currencyStr} / {perHourStr}
              </span>
            </div>
            <div className="text-left dir-ltr">
              <span className="font-label-price text-label-price text-secondary font-black">
                {timeType === 'fixed' ? `${estimatedCost} ${currencyStr}` : `${hourlyRate} ${currencyStr}/${perHourStr}`}
              </span>
            </div>
          </div>

          {/* 3. Optional Customer Name / Note */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                <span>{isEn ? 'Customer Name (optional):' : 'اسم الزبون أو ملحوظة الحجز:'}</span>
              </label>
              <span className="text-[11px] text-outline bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/20">
                {isEn ? 'Optional' : 'اختياري (مش إجباري)'}
              </span>
            </div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={isEn ? 'e.g. John, VIP Table 1...' : 'مثال: أحمد، كابتن محمود، طاولة الشباب...'}
              className="w-full h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-on-surface placeholder:text-on-surface-variant/50 border border-outline-variant/40 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-surface-container-high p-3 px-4 sm:p-space-md sm:px-space-xl flex gap-space-sm border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant font-headline-sm text-headline-sm rounded-xl transition-all cursor-pointer"
          >
            {isEn ? 'Cancel' : 'إلغاء'}
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 h-12 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all transform active:scale-95 shadow-lg font-bold cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
            <span>{isEn ? 'Start Time' : 'ابدأ الوقت'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
