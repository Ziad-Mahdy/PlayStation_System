import { useState, useMemo } from 'react';
import useDevicesStore from '../../store/devicesStore';
import useLanguageStore from '../../store/languageStore';
import { formatTime } from './DeviceCard';
import InvoiceModal from './InvoiceModal';

export default function WorkerAccountsModal({ isOpen, onClose }) {
  const completedSessions = useDevicesStore((s) => s.completedSessions);
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

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
                  {t('worker_title')}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('worker_subtitle')}
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
                <span className="text-xs text-on-surface-variant block">{t('worker_stat_total')}</span>
                <span className="font-headline-lg text-headline-lg text-secondary font-black">
                  {totals.total} <span className="text-xs font-normal">{t('card_egp')}</span>
                </span>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl border border-primary/30">
                <span className="text-xs text-on-surface-variant block">{t('worker_stat_time')}</span>
                <span className="font-headline-lg text-headline-lg text-primary font-bold">
                  {totals.time} <span className="text-xs font-normal">{t('card_egp')}</span>
                </span>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl border border-tertiary/30">
                <span className="text-xs text-on-surface-variant block">{t('worker_stat_orders')}</span>
                <span className="font-headline-lg text-headline-lg text-tertiary font-bold">
                  {totals.orders} <span className="text-xs font-normal">{t('card_egp')}</span>
                </span>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl border border-outline-variant/30">
                <span className="text-xs text-on-surface-variant block">{t('worker_stat_count')}</span>
                <span className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  {totals.count} <span className="text-xs font-normal">{t('worker_invoices_unit')}</span>
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
                  placeholder={t('worker_search_placeholder')}
                  className="w-full h-10 bg-surface-container-low rounded-xl ps-9 pe-3 text-xs font-body-sm text-on-surface border border-outline-variant/30 outline-none focus:border-primary"
                />
                <span className="material-symbols-outlined absolute start-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
              </div>
              <span className="text-xs text-outline shrink-0">
                {t('worker_page_hint')}
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
                <p className="font-headline-sm text-headline-sm">{t('worker_no_invoices')}</p>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  {t('worker_no_invoices_hint')}
                </p>
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
                <table className="w-full text-start border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant/20 text-on-surface-variant font-label-md">
                      <th className="p-3">{t('worker_th_num')}</th>
                      <th className="p-3">{t('worker_th_device')}</th>
                      <th className="p-3">{t('worker_th_datetime')}</th>
                      <th className="p-3">{t('worker_th_duration')}</th>
                      <th className="p-3">{t('worker_th_time')}</th>
                      <th className="p-3">{t('worker_th_orders')}</th>
                      <th className="p-3">{t('worker_th_total')}</th>
                      <th className="p-3 text-center">{t('worker_th_action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 font-body-sm">
                    {paginatedInvoices.map((inv, idx) => {
                      const endTime = new Date(inv.endTime || Date.now());
                      const timeStr = endTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const dateStr = endTime.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
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
                              {inv.mode === 'single' ? t('worker_single') : t('worker_multi')}
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
                            {inv.timeCost?.toFixed(2)} {t('card_egp')}
                          </td>
                          <td className="p-3 text-tertiary font-bold">
                            {inv.ordersCost?.toFixed(2)} {t('card_egp')}
                          </td>
                          <td className="p-3 text-secondary font-black font-headline-sm">
                            {inv.total?.toFixed(2)} {t('card_egp')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPreviewInvoice(inv)}
                              className="h-8 px-2.5 bg-surface-container hover:bg-surface-container-high text-primary font-label-sm rounded-lg transition-colors inline-flex items-center gap-1"
                              title={t('worker_view_title')}
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                              <span>{t('worker_view')}</span>
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
                {t('worker_page_of', validPage, totalPages, filteredInvoices.length)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={validPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 rounded-lg text-xs bg-surface-container text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-highest flex items-center gap-1"
                >
                  <span>{t('worker_prev')}</span>
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
                  <span>{t('worker_next')}</span>
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
