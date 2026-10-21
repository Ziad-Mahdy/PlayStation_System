import { useState, useMemo } from 'react';
import useDevicesStore from '../../store/devicesStore';
import { formatTime } from './DeviceCard';
import InvoiceModal from './InvoiceModal';

export default function WorkerAccountsModal({ isOpen, onClose }) {
  const completedSessions = useDevicesStore((s) => s.completedSessions);

  // Pagination state (max 5 invoices per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Selected invoice to view/reprint
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Total finances
  const totals = useMemo(() => {
    let revenue = 0;
    let time = 0;
    let orders = 0;
    completedSessions.forEach((s) => {
      revenue += s.total || 0;
      time += s.timeCost || 0;
      orders += s.ordersCost || 0;
    });
    return {
      total: revenue.toFixed(2),
      time: time.toFixed(2),
      orders: orders.toFixed(2),
      count: completedSessions.length,
    };
  }, [completedSessions]);

  // Filtered invoices (sorted newest first)
  const filteredInvoices = useMemo(() => {
    const list = [...completedSessions].reverse();
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((inv) =>
      inv.deviceName?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.deviceType?.toLowerCase().includes(q)
    );
  }, [completedSessions, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-space-md bg-surface-container-lowest/80 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative w-full max-w-4xl bg-surface-container rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden my-auto border border-outline-variant/30 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-surface-container-high px-space-xl py-space-md flex items-center justify-between border-b border-outline-variant/20 shrink-0">
            <div className="flex items-center gap-space-sm">
              <div className="w-11 h-11 rounded-2xl bg-secondary-container/20 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  حسابات وفواتير الشيفت
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  مراجعة الفواتير المحصلة وإجمالي الدخل
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Quick Summary Badges */}
          <div className="p-space-lg pb-0 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
              <div className="bg-surface-container-low p-space-md rounded-2xl border border-secondary/30">
                <span className="text-xs text-on-surface-variant block">إجمالي المحصل:</span>
                <span className="font-headline-lg text-headline-lg text-secondary font-black">
                  {totals.total} <span className="text-xs font-normal">ج.م</span>
                </span>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl border border-primary/30">
                <span className="text-xs text-on-surface-variant block">دخل الوقت:</span>
                <span className="font-headline-lg text-headline-lg text-primary font-bold">
                  {totals.time} <span className="text-xs font-normal">ج.م</span>
                </span>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl border border-tertiary/30">
                <span className="text-xs text-on-surface-variant block">دخل الطلبات:</span>
                <span className="font-headline-lg text-headline-lg text-tertiary font-bold">
                  {totals.orders} <span className="text-xs font-normal">ج.م</span>
                </span>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block">عدد الفواتير:</span>
                <span className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  {totals.count} <span className="text-xs font-normal">فاتورة</span>
                </span>
              </div>
            </div>

            {/* Search Box */}
            <div className="mt-space-md flex items-center justify-between gap-space-sm">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="بحث باسم الجهاز أو اسم الزبون..."
                  className="w-full h-10 bg-surface-container-low rounded-xl pl-9 pr-3 text-xs font-body-sm text-on-surface border border-outline-variant/30 outline-none focus:border-primary"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
              </div>
              <span className="text-xs text-outline shrink-0">
                (يتم عرض 5 فواتير في كل صفحة)
              </span>
            </div>
          </div>

          {/* Invoices List / Table */}
          <div className="p-space-lg flex-1 overflow-y-auto">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant bg-surface-container-low rounded-2xl border border-outline-variant/20">
                <span className="material-symbols-outlined text-[44px] text-outline mb-1">
                  receipt
                </span>
                <p className="font-headline-sm text-headline-sm">لا توجد فواتير مسجلة</p>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  عند إنهاء أي جلسة ستظهر الفاتورة هنا فوراً
                </p>
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant/20 text-on-surface-variant font-label-md">
                      <th className="p-3">#</th>
                      <th className="p-3">الجهاز</th>
                      <th className="p-3">الوقت والتاريخ</th>
                      <th className="p-3">المدة</th>
                      <th className="p-3">الوقت</th>
                      <th className="p-3">الطلبات</th>
                      <th className="p-3">الإجمالي</th>
                      <th className="p-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 font-body-sm">
                    {paginatedInvoices.map((inv, idx) => {
                      const endTime = new Date(inv.endTime || Date.now());
                      const timeStr = endTime.toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const dateStr = endTime.toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                      });

                      return (
                        <tr key={inv.id || idx} className="hover:bg-surface-container/60 transition-colors">
                          <td className="p-3 text-outline font-mono">{inv.id ? `#${inv.id}` : startIndex + idx + 1}</td>
                          <td className="p-3 font-bold text-on-surface">
                            {inv.deviceName}
                            {inv.customerName && (
                              <span className="block text-[11px] text-secondary font-medium">
                                👤 {inv.customerName}
                              </span>
                            )}
                            <span className="block text-[11px] text-on-surface-variant font-normal">
                              {inv.mode === 'single' ? 'فردي' : 'جماعي'}
                            </span>
                          </td>
                          <td className="p-3 text-on-surface">
                            <span className="font-bold block">{timeStr}</span>
                            <span className="text-[11px] text-outline">{dateStr}</span>
                          </td>
                          <td className="p-3 font-mono text-outline font-medium">
                            {formatTime(inv.durationSeconds || 0)}
                          </td>
                          <td className="p-3 text-primary font-bold">
                            {inv.timeCost?.toFixed(2)} ج.م
                          </td>
                          <td className="p-3 text-tertiary font-bold">
                            {inv.ordersCost?.toFixed(2)} ج.م
                          </td>
                          <td className="p-3 text-secondary font-black font-headline-sm">
                            {inv.total?.toFixed(2)} ج.م
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPreviewInvoice(inv)}
                              className="h-8 px-2.5 bg-surface-container hover:bg-surface-container-high text-primary font-label-sm rounded-lg transition-colors inline-flex items-center gap-1"
                              title="معاينة وطباعة الفاتورة"
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                              <span>عرض</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-surface-container-high px-space-lg py-3 flex items-center justify-between border-t border-outline-variant/20 shrink-0">
              <span className="text-xs text-on-surface-variant font-label-sm">
                صفحة <span className="font-bold text-on-surface">{validPage}</span> من{' '}
                <span className="font-bold text-on-surface">{totalPages}</span> (إجمالي {filteredInvoices.length} فاتورة)
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={validPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 rounded-lg text-xs bg-surface-container text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-highest flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  <span>السابق</span>
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      validPage === i + 1
                        ? 'bg-primary-container text-on-primary-container shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={validPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 rounded-lg text-xs bg-surface-container text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-highest flex items-center gap-1"
                >
                  <span>التالي</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Invoice Modal */}
      {previewInvoice && (
        <InvoiceModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </>
  );
}
