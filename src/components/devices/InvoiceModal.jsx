import useLanguageStore from '../../store/languageStore';

export default function InvoiceModal({ invoice, onClose }) {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';
  const currencyStr = isEn ? '$' : 'ج.م';

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const locale = isEn ? 'en-US' : 'ar-EG';

  const startTimeFormatted = new Date(invoice.startTime).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const endTimeFormatted = new Date(invoice.endTime).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateFormatted = new Date(invoice.endTime).toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Convert duration to human readable format
  const hours = Math.floor((invoice.durationSeconds || 0) / 3600);
  const minutes = Math.floor(((invoice.durationSeconds || 0) % 3600) / 60);
  const durationText = isEn
    ? (hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`)
    : (hours > 0 ? `${hours} ساعة و ${minutes} دقيقة` : `${minutes} دقيقة`);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-space-md bg-surface-container-lowest/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-surface-container rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden my-auto border border-outline-variant/40 flex flex-col">
        {/* Receipt Top Header */}
        <div className="bg-surface-container-high p-4 sm:p-space-lg text-center border-b border-dashed border-outline-variant/40 relative">
          {/* Close button top corner */}
          <button
            onClick={onClose}
            className="absolute top-3.5 start-3.5 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-2xl bg-secondary-container/20 text-secondary flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-[24px] sm:text-[28px]">receipt_long</span>
          </div>

          <h2 className="font-headline-lg text-base sm:text-headline-lg text-on-surface">
            {isEn ? 'Receipt - PlayStation Cafe' : 'فاتورة حساب - بلايستيشن كافيه'}
          </h2>
          <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant mt-0.5">
            {isEn ? 'Official Customer Receipt' : 'إيصال دفع رسمي للزبون'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-outline font-mono">
            <span>{isEn ? 'Invoice #' : 'رقم الإيصال: #'}{invoice.id || Math.floor(1000 + Math.random() * 9000)}</span>
            <span>•</span>
            <span>{dateFormatted}</span>
          </div>
        </div>

        {/* Receipt Printable Card Area */}
        <div id="printable-receipt" className="p-3.5 sm:p-space-lg flex flex-col gap-3 sm:gap-space-md overflow-y-auto max-h-[60vh]">
          {/* Device & Mode Information */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">sports_esports</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {invoice.deviceName}
                </h3>
                <span className="text-xs text-on-surface-variant">
                  {invoice.deviceType} {invoice.isVIP ? '• VIP ⭐' : ''}
                </span>
              </div>
            </div>

            <div className="text-end">
              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-container-high text-primary-fixed">
                {invoice.mode === 'single' ? (isEn ? 'Single Play' : 'لعب فردي (Single)') : (isEn ? 'Multiplayer' : 'لعب جماعي (Multi)')}
              </span>
              <p className="text-[11px] text-outline mt-0.5 dir-ltr">
                {invoice.hourlyRate || (invoice.mode === 'single' ? invoice.singlePrice : invoice.multiPrice)} {currencyStr}/{isEn ? 'hr' : 'ساعة'}
              </p>
            </div>
          </div>

          {/* Customer / Note if provided */}
          {invoice.customerName && (
            <div className="bg-surface-container-low px-space-md py-2 rounded-xl border border-outline-variant/15 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">{isEn ? 'Customer Name:' : 'اسم الزبون:'}</span>
              <span className="font-bold text-secondary">👤 {invoice.customerName}</span>
            </div>
          )}

          {/* Time Calculation Details */}
          <div className="bg-surface-container-low p-space-md rounded-2xl border border-outline-variant/20 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant pb-2 border-b border-outline-variant/10">
              <span>{isEn ? 'Start Time:' : 'وقت البدء:'}</span>
              <span className="font-mono text-on-surface">{startTimeFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant pb-2 border-b border-outline-variant/10">
              <span>{isEn ? 'End Time:' : 'وقت الانتهاء:'}</span>
              <span className="font-mono text-on-surface">{endTimeFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant pb-2 border-b border-outline-variant/10">
              <span>{isEn ? 'Total Duration:' : 'المدة الإجمالية:'}</span>
              <span className="font-bold text-primary font-mono">{durationText}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="font-bold text-on-surface">{isEn ? 'Time Charge:' : 'تكلفة الوقت:'}</span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold dir-ltr">
                {invoice.timeCost} {currencyStr}
              </span>
            </div>
          </div>

          {/* Orders / Drinks Breakdown if any */}
          {invoice.orders && invoice.orders.length > 0 && (
            <div className="bg-surface-container-low p-space-md rounded-2xl border border-outline-variant/20 flex flex-col gap-2">
              <span className="text-xs text-on-surface-variant font-bold mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">local_cafe</span>
                <span>{isEn ? 'Buffet & Drinks Details:' : 'تفاصيل المشروبات والطلبات:'}</span>
              </span>

              <div className="flex flex-col gap-1.5 divide-y divide-outline-variant/10">
                {invoice.orders.map((order, i) => (
                  <div key={i} className="flex items-center justify-between text-xs pt-1.5">
                    <span className="text-on-surface">
                      {order.name} <span className="text-outline font-mono">({order.qty} × {order.price})</span>
                    </span>
                    <span className="font-bold text-on-surface dir-ltr">
                      {(order.qty * order.price).toFixed(2)} {currencyStr}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm pt-2 mt-1 border-t border-outline-variant/20">
                <span className="font-bold text-on-surface">{isEn ? 'Orders Total:' : 'إجمالي الطلبات:'}</span>
                <span className="font-headline-sm text-headline-sm text-secondary font-bold dir-ltr">
                  {invoice.ordersCost} {currencyStr}
                </span>
              </div>
            </div>
          )}

          {/* Grand Total Big Display */}
          <div className="bg-primary-container/20 p-space-lg rounded-2xl border border-primary/30 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-extrabold">
                {isEn ? 'Total Amount Due:' : 'المبلغ المطلوب سداده:'}
              </span>
              <span className="text-[11px] text-outline-variant mt-0.5">
                {isEn ? 'Includes time and buffet orders' : 'شامل الوقت والمشروبات بالكامل'}
              </span>
            </div>
            <div className="text-end dir-ltr">
              <span className="font-display-lg text-display-lg text-primary font-black">
                {invoice.total}
              </span>
              <span className="text-sm font-bold text-on-surface ms-1">
                {currencyStr}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions for Worker */}
        <div className="bg-surface-container-high p-space-md px-space-lg flex gap-space-sm border-t border-outline-variant/20">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-12 bg-surface-container hover:bg-surface-container-highest text-on-surface font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all shadow-sm border border-outline-variant/30 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            <span>{isEn ? 'Print Invoice' : 'طباعة الفاتورة'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 bg-primary text-on-primary hover:brightness-110 font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all shadow-lg shadow-primary/20 font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{isEn ? 'Done & Close' : 'تم وقفل الحساب'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
