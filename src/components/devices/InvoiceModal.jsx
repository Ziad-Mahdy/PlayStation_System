import { formatTime } from './DeviceCard';

export default function InvoiceModal({ invoice, onClose }) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const startTimeFormatted = new Date(invoice.startTime).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const endTimeFormatted = new Date(invoice.endTime).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateFormatted = new Date(invoice.endTime).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Convert duration to human readable Arabic format
  const hours = Math.floor((invoice.durationSeconds || 0) / 3600);
  const minutes = Math.floor(((invoice.durationSeconds || 0) % 3600) / 60);
  const durationText =
    hours > 0
      ? `${hours} ساعة و ${minutes} دقيقة`
      : `${minutes} دقيقة`;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-space-md bg-surface-container-lowest/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-surface-container rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden my-auto border border-outline-variant/40 flex flex-col">
        {/* Receipt Top Header */}
        <div className="bg-surface-container-high p-space-lg text-center border-b border-dashed border-outline-variant/40 relative">
          {/* Close button top corner */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary-container/20 text-secondary flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-[28px]">receipt_long</span>
          </div>

          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            فاتورة حساب - بلايستيشن كافيه
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            إيصال دفع رسمي للزبون
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-outline font-mono">
            <span>رقم الإيصال: #{invoice.id || Math.floor(1000 + Math.random() * 9000)}</span>
            <span>•</span>
            <span>{dateFormatted}</span>
          </div>
        </div>

        {/* Receipt Printable Card Area */}
        <div id="printable-receipt" className="p-space-lg flex flex-col gap-space-md overflow-y-auto max-h-[60vh]">
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

            <div className="text-left">
              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-container-high text-primary-fixed">
                لعب {invoice.mode === 'single' ? 'فردي (Single)' : 'جماعي (Multi)'}
              </span>
              <p className="text-[11px] text-outline mt-0.5">
                {invoice.hourlyRate || (invoice.mode === 'single' ? invoice.singlePrice : invoice.multiPrice)} ج.م/ساعة
              </p>
            </div>
          </div>

          {/* Customer / Note if provided */}
          {invoice.customerName && (
            <div className="bg-surface-container-low px-space-md py-2.5 rounded-xl flex items-center justify-between text-xs border border-outline-variant/30">
              <span className="text-on-surface-variant flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[16px] text-secondary">person</span>
                <span>الزبون / ملحوظة الحجز:</span>
              </span>
              <span className="font-bold text-secondary text-sm">{invoice.customerName}</span>
            </div>
          )}

          {/* Time Breakdown Card */}
          <div className="bg-surface-container-low p-space-md rounded-2xl border border-outline-variant/20 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
              <span className="font-label-md text-label-md text-primary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">timer</span>
                <span>تفاصيل مدة اللعب:</span>
              </span>
              <span className="font-label-md text-label-md text-on-surface font-extrabold font-mono">
                {formatTime(invoice.durationSeconds)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-1 text-on-surface-variant">
              <div>
                <span className="text-outline block">بدأ في:</span>
                <span className="font-bold text-on-surface">{startTimeFormatted}</span>
              </div>
              <div>
                <span className="text-outline block">انتهى في:</span>
                <span className="font-bold text-on-surface">{endTimeFormatted}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10 text-xs">
              <span className="text-on-surface-variant">الوقت الفعلي المحسوب:</span>
              <span className="font-bold text-on-surface">{durationText}</span>
            </div>

            <div className="flex items-center justify-between pt-1 text-body-md font-bold text-primary">
              <span>حساب الوقت المستحق:</span>
              <span>{invoice.timeCost?.toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Orders / Drinks Breakdown (if any) */}
          {invoice.orders && invoice.orders.length > 0 && (
            <div className="bg-surface-container-low p-space-md rounded-2xl border border-outline-variant/20 flex flex-col gap-space-xs">
              <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                <span className="font-label-md text-label-md text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">local_cafe</span>
                  <span>المشروبات والطلبات ({invoice.orders.length}):</span>
                </span>
                <span className="font-label-md text-label-md text-tertiary font-bold">
                  {invoice.ordersCost?.toFixed(2)} ج.م
                </span>
              </div>

              <div className="flex flex-col divide-y divide-outline-variant/10">
                {invoice.orders.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-surface-container-high flex items-center justify-center font-bold text-primary">
                        {item.qty}
                      </span>
                      <span className="text-on-surface font-medium">{item.name}</span>
                    </div>
                    <span className="text-on-surface-variant font-bold">
                      {(item.price * item.qty).toFixed(2)} ج.م
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grand Total Box (Prominent for Customer View) */}
          <div className="bg-surface-container-highest/90 p-space-lg rounded-2xl border-2 border-secondary/40 shadow-inner flex flex-col items-center justify-center text-center">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
              المبلغ الإجمالي المطلوب تحصيله
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-display-lg text-display-lg text-secondary font-black tracking-tight">
                {invoice.total?.toFixed(2)}
              </span>
              <span className="font-headline-md text-headline-md text-on-surface font-bold">
                جنيه مصري
              </span>
            </div>
            <p className="text-xs text-outline">
              الوقت: {invoice.timeCost?.toFixed(2)} ج.م {invoice.ordersCost > 0 ? `+ الطلبات: ${invoice.ordersCost?.toFixed(2)} ج.م` : ''}
            </p>
          </div>
        </div>

        {/* Footer Actions for Worker */}
        <div className="bg-surface-container-high p-space-md px-space-lg flex gap-space-sm border-t border-outline-variant/20">
          <button
            type="button"
            onClick={handlePrint}
            className="h-12 px-space-md bg-surface-container hover:bg-surface-container-highest text-on-surface font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-1.5 transition-all border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            <span>طباعة</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 font-bold shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>تم التحصيل والإنهاء</span>
          </button>
        </div>
      </div>
    </div>
  );
}
