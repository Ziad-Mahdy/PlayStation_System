import { useState, useEffect } from 'react';
import useDevicesStore from '../../store/devicesStore';
import useAdminStore from '../../store/adminStore';
import { formatTime, computeCosts } from './DeviceCard';
import InvoiceModal from './InvoiceModal';
import toast from 'react-hot-toast';

export default function SessionModal({ deviceId, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [closedInvoice, setClosedInvoice] = useState(null);

  const device = useDevicesStore((s) => s.devices.find((d) => d.id === deviceId));
  const endSession = useDevicesStore((s) => s.endSession);
  const extendSessionTime = useDevicesStore((s) => s.extendSessionTime);
  const addOrder = useDevicesStore((s) => s.addOrder);
  const removeOrder = useDevicesStore((s) => s.removeOrder);
  const products = useAdminStore((s) => s.products);

  // Live timer
  useEffect(() => {
    if (!device?.session) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - device.session.startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [device?.session?.startTime]);

  if (!device && !closedInvoice) return null;

  // If session just finished and invoice was generated, display invoice modal
  if (closedInvoice) {
    return (
      <InvoiceModal
        invoice={closedInvoice}
        onClose={() => {
          setClosedInvoice(null);
          onClose();
        }}
      />
    );
  }

  if (!device?.session) return null;

  const { timeCost, ordersCost, total } = computeCosts(device, elapsed);

  const isFixed = device.session.timeType === 'fixed';
  const targetSeconds = isFixed ? (device.session.targetMinutes || 0) * 60 : 0;
  const remainingSeconds = isFixed ? Math.max(0, targetSeconds - elapsed) : 0;
  const isExpired = isFixed && elapsed >= targetSeconds;
  const progressPercent = isFixed && targetSeconds > 0 ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;

  const handleEndSession = () => {
    const invoiceData = {
      id: Math.floor(1000 + Math.random() * 9000),
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      isVIP: device.isVIP,
      customerName: device.session.customerName || '',
      mode: device.session.mode,
      hourlyRate: device.session.mode === 'single' ? device.singlePrice : device.multiPrice,
      startTime: device.session.startTime,
      endTime: Date.now(),
      durationSeconds: elapsed,
      timeCost,
      ordersCost,
      total,
      orders: [...(device.session.orders || [])],
    };

    endSession(deviceId);
    setClosedInvoice(invoiceData);
    toast.success(`تم إنهاء الجلسة وإصدار الفاتورة (${total} ج.م) 🧾`);
  };

  const handleAddProduct = (product) => {
    addOrder(deviceId, product);
    toast.success(`تمت إضافة ${product.name} ✅`);
  };

  const handleExtend = (extraMinutes) => {
    extendSessionTime(deviceId, extraMinutes);
    toast.success(`تم تمديد الوقت بمقدار ${extraMinutes} دقيقة إضافية ⏱️`);
  };

  // Group products by category
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-surface-container-lowest/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-surface-container rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh] overflow-hidden border border-outline-variant/30">
        {/* ── Modal Header ── */}
        <div className="bg-surface-container-high px-space-xl py-space-md flex items-center justify-between shrink-0 shadow-sm border-b border-outline-variant/20">
          <div className="flex items-center gap-space-md">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExpired ? 'bg-error-container text-error' : 'bg-primary-container/20 text-primary'}`}>
              <span className="material-symbols-outlined text-[24px]">sports_esports</span>
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  {device.name} ({device.type}{device.isVIP ? ' VIP' : ''})
                </h2>
                {isExpired ? (
                  <span className="inline-flex items-center gap-1 bg-error-container/40 text-error px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-bold animate-pulse">
                    <span className="material-symbols-outlined text-[14px]">alarm</span>
                    <span>انتهى الوقت المحدد!</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-tertiary-container/20 text-tertiary px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                    <span>شغال</span>
                  </span>
                )}
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {device.session.mode === 'single' ? 'فردي' : 'جماعي'} •{' '}
                {isFixed ? `نظام محدد (${device.session.targetMinutes} دقيقة)` : 'نظام وقت مفتوح'} •{' '}
                {device.session.mode === 'single' ? device.singlePrice : device.multiPrice} ج.م/ساعة
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-highest hover:bg-error-container hover:text-on-error-container text-on-surface-variant flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="p-space-xl overflow-y-auto flex flex-col gap-space-lg">
          {/* Section 1: Timer & Progress */}
          <section className={`rounded-xl p-space-md shadow-sm border ${isExpired ? 'bg-error-container/10 border-error/40' : 'bg-surface-container-low border-outline-variant/20'}`}>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs text-primary font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined text-[22px]">
                  {isFixed ? 'timer' : 'all_inclusive'}
                </span>
                <span>{isFixed ? 'نظام الوقت المحدد' : 'الوقت والمدة المنقضية (وقت مفتوح)'}</span>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container-high px-space-sm py-0.5 rounded text-on-surface-variant">
                {device.session.mode === 'single' ? device.singlePrice : device.multiPrice}.00 ج.م / ساعة
              </span>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-space-sm">
              {/* Box 1: Timer */}
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {isFixed ? (isExpired ? 'وقت إضافي زائد:' : 'الوقت المتبقي:') : 'مدة التشغيل:'}
                </span>
                <span className={`font-label-timer-sm text-label-timer-sm mt-1 ${isExpired ? 'text-error font-black' : isFixed ? 'text-primary-fixed font-black' : 'text-on-surface'}`}>
                  {isFixed ? (isExpired ? `+${formatTime(elapsed - targetSeconds)}` : formatTime(remainingSeconds)) : formatTime(elapsed)}
                </span>
                {isFixed && (
                  <span className="text-[11px] text-outline mt-0.5">
                    المنقضي: {formatTime(elapsed)} من {device.session.targetMinutes} د
                  </span>
                )}
              </div>

              {/* Box 2: Start time */}
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">وقت البدء:</span>
                <span className="font-headline-sm text-headline-sm text-on-surface mt-1">
                  {new Date(device.session.startTime).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
                <span className="text-[11px] text-outline mt-0.5">
                  نوع اللعب: {device.session.mode === 'single' ? 'فردي' : 'جماعي'}
                </span>
              </div>

              {/* Box 3: Time cost */}
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">حساب الوقت:</span>
                <span className="font-headline-lg text-headline-lg text-primary font-bold mt-1">
                  {timeCost} ج.م
                </span>
                <span className="text-[11px] text-outline mt-0.5">
                  وفقاً لسعر الساعة الفعلي
                </span>
              </div>
            </div>

            {/* Progress bar if fixed */}
            {isFixed && (
              <div className="mt-space-md flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-on-surface-variant font-label-sm">
                  <span>التقدم من الوقت المحدد ({progressPercent.toFixed(0)}%)</span>
                  <span className={isExpired ? 'text-error font-bold' : ''}>
                    {isExpired ? 'انتهت المدة بالكامل' : `متبقي ${Math.ceil(remainingSeconds / 60)} دقيقة`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isExpired ? 'bg-error' : progressPercent > 80 ? 'bg-tertiary' : 'bg-secondary'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                {/* Extend time buttons */}
                <div className="mt-2 pt-2 border-t border-outline-variant/10 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-on-surface-variant font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">update</span>
                    <span>تمديد وقت الجلسة:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleExtend(30)}
                      className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-label-sm rounded-lg transition-colors"
                    >
                      + 30 دقيقة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtend(60)}
                      className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-label-sm rounded-lg transition-colors"
                    >
                      + ساعة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtend(120)}
                      className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-label-sm rounded-lg transition-colors"
                    >
                      + ساعتان
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Orders */}
          <section className="bg-surface-container-low rounded-xl p-space-md shadow-sm border border-outline-variant/20">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs text-primary font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined text-[22px]">local_cafe</span>
                <span>المشروبات والطلبات</span>
              </div>
              <span className="font-label-md text-label-md text-secondary font-bold">
                إجمالي: {ordersCost} ج.م
              </span>
            </div>

            {/* Orders list */}
            {device.session.orders.length === 0 ? (
              <div className="text-center py-4 text-on-surface-variant font-body-sm text-body-sm">
                لا توجد طلبات حتى الآن
              </div>
            ) : (
              <div className="flex flex-col gap-space-xs mb-space-md">
                {device.session.orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-surface-container-lowest p-space-sm rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center text-primary font-bold font-label-sm text-label-sm">
                        {order.qty}×
                      </span>
                      <span className="font-body-lg text-body-lg text-on-surface">{order.name}</span>
                    </div>
                    <div className="flex items-center gap-space-md">
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {(order.price * order.qty).toFixed(2)} ج.م
                      </span>
                      <button
                        onClick={() => removeOrder(deviceId, order.id)}
                        className="text-error hover:text-on-error-container p-1 rounded transition-colors"
                        title="حذف"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add order */}
            {!showAddOrder ? (
              <button
                onClick={() => setShowAddOrder(true)}
                className="w-full h-12 bg-surface-container-high hover:bg-surface-bright text-primary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-sm transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>+ إضافة مشروب أو طلب</span>
              </button>
            ) : (
              <div className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-lg text-label-lg text-on-surface">اختر المنتج:</span>
                  <button
                    onClick={() => setShowAddOrder(false)}
                    className="text-on-surface-variant hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
                {categories.map((cat) => (
                  <div key={cat}>
                    <p className="font-label-sm text-label-sm text-outline mb-space-xs">{cat}</p>
                    <div className="flex flex-wrap gap-space-xs">
                      {products
                        .filter((p) => p.category === cat)
                        .map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleAddProduct(product)}
                            className="px-space-sm py-1 bg-surface-container rounded-lg font-label-md text-label-md text-on-surface hover:bg-primary-container/20 hover:text-primary transition-all flex items-center gap-1"
                          >
                            <span>{product.name}</span>
                            <span className="text-secondary font-bold">{product.price}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Grand Total */}
          <section className="bg-surface-container-highest/90 rounded-2xl p-space-lg shadow-inner flex flex-col sm:flex-row items-center justify-between gap-space-md border border-outline-variant/30">
            <div className="flex flex-col text-center sm:text-right">
              <span className="font-label-lg text-label-lg text-on-surface-variant">المبلغ الإجمالي المستحق:</span>
              <span className="font-body-sm text-body-sm text-outline mt-0.5">
                الوقت: {timeCost} ج.م + الطلبات: {ordersCost} ج.م
              </span>
            </div>
            <div className="flex items-baseline gap-space-xs text-left">
              <span className="font-display-lg text-display-lg text-secondary font-extrabold tracking-tight">
                {total}
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface">جنيه</span>
            </div>
          </section>
        </div>

        {/* ── Footer Actions ── */}
        <div className="bg-surface-container-high p-space-md px-space-xl flex flex-col sm:flex-row items-center gap-space-sm shrink-0 border-t border-outline-variant/20">
          {confirmEnd ? (
            <>
              <p className="font-label-md text-label-md text-tertiary flex-1">
                هل متأكد من إنهاء الجلسة وتسجيل {total} ج.م؟
              </p>
              <button
                onClick={handleEndSession}
                className="w-full sm:w-auto px-space-lg h-14 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all transform active:scale-95 font-bold"
              >
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
                <span>تأكيد الإنهاء</span>
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="w-full sm:w-auto px-space-lg h-14 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-headline-sm text-headline-sm rounded-xl flex items-center justify-center transition-all"
              >
                إلغاء
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmEnd(true)}
                className="w-full sm:flex-1 h-14 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-sm transition-all transform active:scale-95 shadow-md font-bold"
              >
                <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
                <span>إنهاء الجلسة والحساب</span>
              </button>
              <button
                onClick={() => setShowAddOrder(true)}
                className="w-full sm:w-auto px-space-lg h-14 bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[20px]">local_bar</span>
                <span>أضف طلب</span>
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-space-lg h-14 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-headline-sm text-headline-sm rounded-xl flex items-center justify-center transition-all"
              >
                إغلاق
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
