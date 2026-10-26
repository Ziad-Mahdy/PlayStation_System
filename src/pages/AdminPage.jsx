import { useState, useMemo } from 'react';
import useDevicesStore from '../store/devicesStore';
import useAdminStore from '../store/adminStore';
import useAuthStore from '../store/authStore';
import useLanguageStore from '../store/languageStore';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../components/devices/DeviceCard';
import InvoiceModal from '../components/devices/InvoiceModal';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const navigate = useNavigate();
  const exitAdmin = useAuthStore((s) => s.exitAdmin);
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  // Stores
  const devices = useDevicesStore((s) => s.devices);
  const categories = useDevicesStore((s) => s.categories || []);
  const addCategory = useDevicesStore((s) => s.addCategory);
  const deleteCategory = useDevicesStore((s) => s.deleteCategory);
  const completedSessions = useDevicesStore((s) => s.completedSessions);
  const updateDevicePrice = useDevicesStore((s) => s.updateDevicePrice);
  const addDevice = useDevicesStore((s) => s.addDevice);
  const deleteDevice = useDevicesStore((s) => s.deleteDevice);
  const clearCompletedSessions = useDevicesStore((s) => s.clearCompletedSessions);

  const products = useAdminStore((s) => s.products);
  const addProduct = useAdminStore((s) => s.addProduct);
  const updateProduct = useAdminStore((s) => s.updateProduct);
  const deleteProduct = useAdminStore((s) => s.deleteProduct);

  // Active Tab
  const [activeTab, setActiveTab] = useState('finances'); // 'finances' | 'rates' | 'products'

  // Sessions Pagination State (Max 5 per page)
  const [adminSessionPage, setAdminSessionPage] = useState(1);
  const [adminPreviewInvoice, setAdminPreviewInvoice] = useState(null);
  const SESSIONS_PER_PAGE = 5;

  // Categories management state
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCatInput, setShowAddCatInput] = useState(false);

  // Device Form State (Add Device Modal)
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    name: '',
    type: 'PlayStation 5',
    isVIP: false,
    singlePrice: '45',
    multiPrice: '35',
  });

  // Product Form State (Add / Edit)
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', category: 'مشروبات' });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Rate Editing State
  const [editingRates, setEditingRates] = useState({}); // { [deviceId]: { single, multi } }

  // Search in completed sessions
  const [sessionSearch, setSessionSearch] = useState('');

  // ── Financial Calculations ──
  const finances = useMemo(() => {
    let totalRevenue = 0;
    let timeRevenue = 0;
    let ordersRevenue = 0;

    completedSessions.forEach((s) => {
      totalRevenue += s.total || 0;
      timeRevenue += s.timeCost || 0;
      ordersRevenue += s.ordersCost || 0;
    });

    return {
      totalRevenue: totalRevenue.toFixed(2),
      timeRevenue: timeRevenue.toFixed(2),
      ordersRevenue: ordersRevenue.toFixed(2),
      sessionsCount: completedSessions.length,
    };
  }, [completedSessions]);

  // Filtered completed sessions (newest first)
  const filteredSessions = useMemo(() => {
    const list = [...completedSessions].reverse();
    if (!sessionSearch.trim()) return list;
    const q = sessionSearch.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.deviceName?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.mode?.toLowerCase().includes(q)
    );
  }, [completedSessions, sessionSearch]);

  // Admin Pagination calculations
  const totalSessionPages = Math.max(1, Math.ceil(filteredSessions.length / SESSIONS_PER_PAGE));
  const validSessionPage = Math.min(adminSessionPage, totalSessionPages);
  const startSessionIdx = (validSessionPage - 1) * SESSIONS_PER_PAGE;
  const paginatedSessions = filteredSessions.slice(startSessionIdx, startSessionIdx + SESSIONS_PER_PAGE);

  // Handle product save
  const handleSaveProduct = (e) => {
    e.preventDefault();
    const trimmedName = productForm.name.trim();
    if (!trimmedName || !productForm.price) {
      toast.error('يرجى ملء جميع الحقول بشكل صحيح');
      return;
    }

    const priceNum = parseFloat(productForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('يرجى إدخال سعر صالح');
      return;
    }

    // Check if product with this name already exists
    const duplicateProduct = products.find(
      (p) =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (!editingProductId || p.id !== editingProductId)
    );

    if (duplicateProduct) {
      toast.error(`المشروب / المنتج "${trimmedName}" موجود بالفعل في القائمة!`);
      return;
    }

    if (editingProductId) {
      const ok = updateProduct(editingProductId, {
        name: trimmedName,
        price: priceNum,
        category: productForm.category,
      });
      if (ok === false) {
        toast.error(`المشروب / المنتج "${trimmedName}" موجود بالفعل!`);
        return;
      }
      toast.success('تم تحديث المنتج بنجاح');
    } else {
      const ok = addProduct({
        name: trimmedName,
        price: priceNum,
        category: productForm.category,
      });
      if (ok === false) {
        toast.error(`المشروب / المنتج "${trimmedName}" موجود بالفعل!`);
        return;
      }
      toast.success('تمت إضافة المنتج بنجاح');
    }

    setIsProductModalOpen(false);
    setEditingProductId(null);
    setProductForm({ name: '', price: '', category: 'مشروبات' });
  };

  const handleEditProductClick = (prod) => {
    setEditingProductId(prod.id);
    setProductForm({ name: prod.name, price: prod.price.toString(), category: prod.category });
    setIsProductModalOpen(true);
  };

  const handleDeleteProductClick = (id, name) => {
    if (window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) {
      deleteProduct(id);
      toast.success('تم حذف المنتج');
    }
  };

  // ── Handle Add Device ──
  const handleAddDeviceSubmit = (e) => {
    e.preventDefault();
    const trimmedName = newDeviceForm.name.trim();
    if (!trimmedName) {
      toast.error('يرجى كتابة اسم أو رقم الجهاز');
      return;
    }
    const single = parseFloat(newDeviceForm.singlePrice);
    const multi = parseFloat(newDeviceForm.multiPrice);
    if (isNaN(single) || single <= 0 || isNaN(multi) || multi <= 0) {
      toast.error('يرجى إدخال أسعار صحيحة للساعة');
      return;
    }

    // Check if device with this name already exists
    const duplicateDevice = devices.find(
      (d) => d.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateDevice) {
      toast.error(`الجهاز "${trimmedName}" موجود بالفعل في الصالة! يرجى اختيار اسم أو رقم آخر.`);
      return;
    }

    const ok = addDevice({
      name: trimmedName,
      type: newDeviceForm.type,
      isVIP: newDeviceForm.isVIP,
      singlePrice: single,
      multiPrice: multi,
    });

    if (ok === false) {
      toast.error(`الجهاز "${trimmedName}" موجود بالفعل في الصالة!`);
      return;
    }

    toast.success(`تمت إضافة ${trimmedName} بنجاح! 🎮`);
    setIsAddDeviceModalOpen(false);
    setNewDeviceForm({
      name: '',
      type: 'PS5',
      isVIP: false,
      singlePrice: '45',
      multiPrice: '35',
    });
  };

  // ── Handle Delete Device ──
  const handleDeleteDeviceClick = (device) => {
    if (device.status === 'busy') {
      const confirmBusy = window.confirm(
        `تنبيه: "${device.name}" يعمل حالياً ولديه وقت شغال! هل تريد بالرغم من ذلك حذفه وإلغاء جلسته؟`
      );
      if (!confirmBusy) return;
    } else {
      const confirmFree = window.confirm(`هل أنت متأكد من حذف "${device.name}" من النظام؟`);
      if (!confirmFree) return;
    }

    deleteDevice(device.id);
    toast.success(`تم حذف "${device.name}" من النظام`);
  };

  // ── Handle Categories (Add / Delete) ──
  const handleAddCategorySubmit = (e) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) return;
    const ok = addCategory(newCategoryInput.trim());
    if (ok) {
      toast.success(`تمت إضافة قسم "${newCategoryInput.trim()}" بنجاح! 🎉`);
      setNewCategoryInput('');
      setShowAddCatInput(false);
    } else {
      toast.error('هذا القسم موجود بالفعل');
    }
  };

  const handleDeleteCategoryClick = (catName) => {
    if (window.confirm(`هل أنت متأكد من حذف قسم "${catName}"؟`)) {
      deleteCategory(catName);
      toast.success(`تم حذف قسم "${catName}"`);
    }
  };

  // Handle Rate Change save
  const handleSaveDeviceRates = (deviceId) => {
    const changes = editingRates[deviceId];
    if (!changes) return;

    if (changes.single !== undefined) {
      updateDevicePrice(deviceId, 'single', changes.single);
    }
    if (changes.multi !== undefined) {
      updateDevicePrice(deviceId, 'multi', changes.multi);
    }

    setEditingRates((prev) => {
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });

    toast.success('تم حفظ تعديل الأسعار بنجاح');
  };

  const handleRateInputChange = (deviceId, type, value) => {
    setEditingRates((prev) => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        [type]: value,
      },
    }));
  };

  const handleClearSessions = () => {
    if (window.confirm('تحذير: هل أنت متأكد من مسح جميع سجلات وفواتير اليوم المقفلة؟')) {
      clearCompletedSessions();
      toast.success('تم تصفير حسابات اليوم');
    }
  };

  return (
    <div className="w-full px-2.5 sm:px-4 md:px-margin py-3 sm:py-space-lg flex flex-col gap-3 sm:gap-space-lg max-w-[1600px] mx-auto">
      {/* ── Top Header Banner ── */}
      <div className="bg-surface-container-low p-3.5 sm:p-space-lg rounded-2xl border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-space-md shadow-xl">
        <div className="flex items-center gap-2.5 sm:gap-space-md">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <span
              className="material-symbols-outlined text-[26px] sm:text-[34px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-space-xs">
              <h1 className="font-headline-xl text-xl sm:text-headline-xl text-on-surface">
                {t('admin_title')}
              </h1>
              <span className="bg-primary/20 text-primary-fixed border border-primary/30 font-label-sm text-xs sm:text-label-sm px-2 py-0.5 rounded-full">
                {t('admin_badge_full')}
              </span>
            </div>
            <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant mt-0.5 sm:mt-1">
              {t('admin_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-xs text-xs bg-surface-container px-3 py-1.5 rounded-xl border border-primary/30 text-primary-fixed self-stretch md:self-auto justify-center">
          <span className="material-symbols-outlined text-[16px]">lock_clock</span>
          <span>{t('admin_active_session')}</span>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 sm:gap-space-sm bg-surface-container-lowest p-1.5 sm:p-2 rounded-2xl border border-outline-variant/20 shadow-md overflow-x-auto scrollbar-none w-full">
        <button
          onClick={() => setActiveTab('finances')}
          className={`flex items-center gap-1 sm:gap-space-xs px-3 sm:px-space-lg py-2 sm:py-3 rounded-xl font-headline-sm text-xs sm:text-headline-sm transition-all shrink-0 ${
            activeTab === 'finances'
              ? 'bg-primary-container text-on-primary-container shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">account_balance_wallet</span>
          <span>{t('admin_tab_finances')}</span>
          <span className="bg-surface-container-highest/60 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
            {completedSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-1 sm:gap-space-xs px-3 sm:px-space-lg py-2 sm:py-3 rounded-xl font-headline-sm text-xs sm:text-headline-sm transition-all shrink-0 ${
            activeTab === 'rates'
              ? 'bg-primary-container text-on-primary-container shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">sports_esports</span>
          <span>{t('admin_tab_rates')}</span>
          <span className="bg-surface-container-highest/60 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
            {t('admin_devices_count', devices.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1 sm:gap-space-xs px-3 sm:px-space-lg py-2 sm:py-3 rounded-xl font-headline-sm text-xs sm:text-headline-sm transition-all shrink-0 ${
            activeTab === 'products'
              ? 'bg-primary-container text-on-primary-container shadow-md'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">restaurant_menu</span>
          <span>{t('admin_tab_products')}</span>
          <span className="bg-surface-container-highest/60 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
            {t('admin_products_count', products.length)}
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════
          TAB 1: FINANCES (حسابات وإيرادات اليوم)
         ═══════════════════════════════════════════════ */}
      {activeTab === 'finances' && (
        <div className="flex flex-col gap-3 sm:gap-space-lg">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-space-md">
            {/* Total Revenue */}
            <div className="bg-surface-container-low p-3 sm:p-space-lg rounded-2xl border border-secondary/30 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 left-0 h-1 bg-secondary"></div>
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs sm:text-label-lg text-on-surface-variant line-clamp-1">{t('admin_stat_total_rev')}</span>
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] sm:text-[24px]">payments</span>
                </span>
              </div>
              <div className="mt-2 sm:mt-space-sm flex items-baseline">
                <span className="font-display-lg text-lg sm:text-2xl lg:text-display-lg text-secondary font-black truncate">
                  {finances.totalRevenue}
                </span>
                <span className="font-headline-sm text-xs sm:text-headline-sm text-on-surface mr-1">{t('card_egp')}</span>
              </div>
              <p className="font-body-sm text-[11px] sm:text-body-sm text-outline mt-1 line-clamp-1 sm:line-clamp-none">{t('admin_stat_total_rev_sub')}</p>
            </div>

            {/* Time Revenue */}
            <div className="bg-surface-container-low p-3 sm:p-space-lg rounded-2xl border border-primary/30 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 left-0 h-1 bg-primary"></div>
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs sm:text-label-lg text-on-surface-variant line-clamp-1">{t('admin_stat_time_rev')}</span>
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] sm:text-[24px]">schedule</span>
                </span>
              </div>
              <div className="mt-2 sm:mt-space-sm flex items-baseline">
                <span className="font-display-lg text-lg sm:text-2xl lg:text-display-lg text-primary font-black truncate">
                  {finances.timeRevenue}
                </span>
                <span className="font-headline-sm text-xs sm:text-headline-sm text-on-surface mr-1">{t('card_egp')}</span>
              </div>
              <p className="font-body-sm text-[11px] sm:text-body-sm text-outline mt-1 line-clamp-1 sm:line-clamp-none">{t('admin_stat_time_rev_sub')}</p>
            </div>

            {/* Orders Revenue */}
            <div className="bg-surface-container-low p-3 sm:p-space-lg rounded-2xl border border-tertiary/30 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 left-0 h-1 bg-tertiary"></div>
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs sm:text-label-lg text-on-surface-variant line-clamp-1">{t('admin_stat_orders_rev')}</span>
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] sm:text-[24px]">local_cafe</span>
                </span>
              </div>
              <div className="mt-2 sm:mt-space-sm flex items-baseline">
                <span className="font-display-lg text-lg sm:text-2xl lg:text-display-lg text-tertiary font-black truncate">
                  {finances.ordersRevenue}
                </span>
                <span className="font-headline-sm text-xs sm:text-headline-sm text-on-surface mr-1">{t('card_egp')}</span>
              </div>
              <p className="font-body-sm text-[11px] sm:text-body-sm text-outline mt-1 line-clamp-1 sm:line-clamp-none">{t('admin_stat_orders_rev_sub')}</p>
            </div>

            {/* Sessions count */}
            <div className="bg-surface-container-low p-3 sm:p-space-lg rounded-2xl border border-outline-variant/30 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 left-0 h-1 bg-surface-variant"></div>
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-xs sm:text-label-lg text-on-surface-variant line-clamp-1">{t('admin_stat_completed')}</span>
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] sm:text-[24px]">done_all</span>
                </span>
              </div>
              <div className="mt-2 sm:mt-space-sm flex items-baseline">
                <span className="font-display-lg text-lg sm:text-2xl lg:text-display-lg text-on-surface font-black truncate">
                  {finances.sessionsCount}
                </span>
                <span className="font-headline-sm text-xs sm:text-headline-sm text-on-surface mr-1">{t('worker_invoices_unit')}</span>
              </div>
              <p className="font-body-sm text-[11px] sm:text-body-sm text-outline mt-1 line-clamp-1 sm:line-clamp-none">{t('admin_stat_completed_sub')}</p>
            </div>
          </div>

          {/* Sessions Detailed Table */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden shadow-lg">
            <div className="p-3.5 sm:p-space-lg border-b border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-space-md">
              <div>
                <h3 className="font-headline-md text-base sm:text-headline-md text-on-surface">
                  {t('admin_finances_history')}
                </h3>
                <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant mt-0.5">
                  {t('admin_finances_history_sub')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-space-sm w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <input
                    type="text"
                    value={sessionSearch}
                    onChange={(e) => {
                      setSessionSearch(e.target.value);
                      setAdminSessionPage(1);
                    }}
                    placeholder={t('admin_search_invoices')}
                    className="w-full h-10 bg-surface-container rounded-xl ps-8 pe-3 font-body-sm text-on-surface border border-outline-variant/30 outline-none focus:border-primary text-xs sm:text-sm"
                  />
                  <span className="material-symbols-outlined absolute start-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                    search
                  </span>
                </div>

                {completedSessions.length > 0 && (
                  <button
                    onClick={handleClearSessions}
                    className="h-10 px-3 sm:px-space-md bg-error-container/20 hover:bg-error-container text-error hover:text-on-error-container font-label-md text-xs sm:text-sm rounded-xl transition-all border border-error/30 flex items-center justify-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    <span>{t('admin_clear_today')}</span>
                  </button>
                )}
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="p-space-xl text-center py-12 sm:py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] text-outline mb-2">
                  receipt_long
                </span>
                <p className="font-headline-sm text-headline-sm">{t('worker_no_invoices')}</p>
                <p className="font-body-sm text-body-sm text-outline mt-1">
                  {t('worker_no_invoices_hint')}
                </p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-start border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-surface-container border-b border-outline-variant/20 text-on-surface-variant font-label-md text-xs sm:text-label-md">
                        <th className="p-2.5 sm:p-space-md">{t('worker_th_num')}</th>
                        <th className="p-2.5 sm:p-space-md">{t('worker_th_device')}</th>
                        <th className="p-2.5 sm:p-space-md">{t('worker_th_datetime')}</th>
                        <th className="p-2.5 sm:p-space-md">{t('invoice_type')}</th>
                        <th className="p-2.5 sm:p-space-md">{t('worker_th_duration')}</th>
                        <th className="p-2.5 sm:p-space-md">{t('worker_th_time')}</th>
                        <th className="p-2.5 sm:p-space-md">{t('worker_th_orders')}</th>
                        <th className="p-2.5 sm:p-space-md">{t('worker_th_total')}</th>
                        <th className="p-2.5 sm:p-space-md text-center">{t('worker_th_action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 font-body-md text-xs sm:text-body-md">
                      {paginatedSessions.map((session, idx) => {
                        const endTime = new Date(session.endTime || Date.now());
                        const timeStr = endTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        });
                        const dateStr = endTime.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <tr
                            key={session.id || idx}
                            className="hover:bg-surface-container/50 transition-colors"
                          >
                            <td className="p-2.5 sm:p-space-md text-outline font-label-sm font-mono text-xs">
                              #{session.id || startSessionIdx + idx + 1}
                            </td>
                            <td className="p-2.5 sm:p-space-md font-bold text-on-surface">
                              <div className="flex items-center gap-1.5">
                                <span>{session.deviceName}</span>
                                {session.isVIP && (
                                  <span className="text-[10px] bg-primary/20 text-primary-fixed px-1.5 py-0.5 rounded">
                                    VIP ⭐
                                  </span>
                                )}
                              </div>
                              {session.customerName && (
                                <div className="text-xs text-primary font-normal flex items-center gap-1 mt-0.5">
                                  <span className="material-symbols-outlined text-[14px]">person</span>
                                  <span>{session.customerName}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 sm:p-space-md text-on-surface text-xs">
                              <span className="font-bold block text-primary-fixed">{timeStr}</span>
                              <span className="text-outline">{dateStr}</span>
                            </td>
                            <td className="p-2.5 sm:p-space-md">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  session.mode === 'single'
                                    ? 'bg-primary-container/20 text-primary'
                                    : 'bg-secondary-container/20 text-secondary'
                                }`}
                              >
                                {session.mode === 'single' ? t('worker_single') : t('worker_multi')}
                              </span>
                            </td>
                            <td className="p-2.5 sm:p-space-md text-on-surface-variant font-mono text-xs sm:text-sm">
                              {formatTime(session.durationSeconds || 0)}
                            </td>
                            <td className="p-2.5 sm:p-space-md text-primary font-bold">
                              {session.timeCost?.toFixed(2)} {t('card_egp')}
                            </td>
                            <td className="p-2.5 sm:p-space-md text-tertiary font-bold">
                              {session.ordersCost?.toFixed(2)} {t('card_egp')}
                            </td>
                            <td className="p-2.5 sm:p-space-md text-secondary font-extrabold text-sm sm:text-headline-sm">
                              {session.total?.toFixed(2)} {t('card_egp')}
                            </td>
                            <td className="p-2.5 sm:p-space-md text-center">
                              <button
                                type="button"
                                onClick={() => setAdminPreviewInvoice(session)}
                                className="h-8 px-2.5 bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs rounded-lg transition-colors inline-flex items-center gap-1 border border-outline-variant/30"
                              >
                                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                <span>{t('worker_view')}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer (Max 5 per page) */}
                {totalSessionPages > 1 && (
                  <div className="bg-surface-container px-3 sm:px-space-md py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20">
                    <span className="text-xs text-on-surface-variant font-label-sm">
                      {t('worker_page_of', validSessionPage, totalSessionPages, filteredSessions.length)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={validSessionPage === 1}
                        onClick={() => setAdminSessionPage((p) => Math.max(1, p - 1))}
                        className="h-8 px-2.5 sm:px-3 rounded-lg text-xs bg-surface-container-high text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-highest flex items-center gap-1"
                      >
                        <span>{t('worker_prev')}</span>
                      </button>

                      {Array.from({ length: totalSessionPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          type="button"
                          onClick={() => setAdminSessionPage(i + 1)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all ${
                            validSessionPage === i + 1
                              ? 'bg-primary-container text-on-primary-container shadow-sm'
                              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={validSessionPage === totalSessionPages}
                        onClick={() => setAdminSessionPage((p) => Math.min(totalSessionPages, p + 1))}
                        className="h-8 px-2.5 sm:px-3 rounded-lg text-xs bg-surface-container-high text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-highest flex items-center gap-1"
                      >
                        <span>{t('worker_next')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TAB 2: DEVICES & RATES (إدارة الأجهزة والأسعار)
         ═══════════════════════════════════════════════ */}
      {activeTab === 'rates' && (
        <div className="flex flex-col gap-3 sm:gap-space-lg">
          {/* Header */}
          <div className="bg-surface-container-low p-3.5 sm:p-space-lg rounded-2xl border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-space-md">
            <div>
              <h3 className="font-headline-md text-base sm:text-headline-md text-on-surface">
                {isEn ? 'Devices & Hourly Rates Control' : 'التحكم في الأجهزة وتسعير الساعات'}
              </h3>
              <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant mt-0.5">
                {isEn ? 'Add new stations, manage categories, and set hourly rates' : 'إضافة أجهزة جديدة، إدارة فئات الصالة (بلياردو، بنج، PC، بلايستيشن)، وتحديد أسعار الساعات'}
              </p>
            </div>

            <div className="flex items-center gap-space-sm w-full sm:w-auto">
              <button
                onClick={() => {
                  setNewDeviceForm({
                    name: `جهاز ${devices.length + 1}`,
                    type: categories[0] || 'PlayStation 5',
                    isVIP: false,
                    singlePrice: '45',
                    multiPrice: '35',
                  });
                  setIsAddDeviceModalOpen(true);
                }}
                className="w-full sm:w-auto h-10 sm:h-11 px-3 sm:px-space-lg bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-xs sm:text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all shadow-md transform active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add_circle</span>
                <span>{t('admin_add_device')}</span>
              </button>
            </div>
          </div>

          {/* ── Categories Management Bar ── */}
          <div className="bg-surface-container-low p-3 sm:p-space-md rounded-2xl border border-outline-variant/30 flex flex-col gap-2 sm:gap-space-sm shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-space-xs">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] sm:text-[20px]">category</span>
                <span className="font-label-lg text-xs sm:text-label-lg text-on-surface">
                  {isEn ? 'Registered Categories:' : 'فئات وأقسام الصالة المسجلة:'}
                </span>
                <span className="text-[11px] sm:text-xs text-on-surface-variant">
                  {isEn ? '(Filters in worker view and device setup)' : '(تظهر كفلاتر في شاشة العامل وعند إضافة جهاز)'}
                </span>
              </div>

              {!showAddCatInput ? (
                <button
                  onClick={() => setShowAddCatInput(true)}
                  className="h-8 px-2.5 sm:px-3 bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1 self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>{isEn ? '+ Add Category' : '+ إضافة قسم جديد'}</span>
                </button>
              ) : (
                <form
                  onSubmit={handleAddCategorySubmit}
                  className="flex items-center gap-2 self-stretch sm:self-auto"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder={isEn ? 'Category name' : 'اسم القسم (مثال: بلياردو، VR...)'}
                    className="h-8 bg-surface-container rounded-lg px-2.5 font-body-sm text-xs sm:text-sm text-on-surface border border-primary outline-none flex-1 sm:flex-initial"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 bg-secondary-container text-on-secondary-container font-label-md text-xs sm:text-sm rounded-lg font-bold"
                  >
                    {isEn ? 'Save' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCatInput(false);
                      setNewCategoryInput('');
                    }}
                    className="h-8 px-2 bg-surface-container text-on-surface-variant rounded-lg text-xs"
                  >
                    {isEn ? 'Cancel' : 'إلغاء'}
                  </button>
                </form>
              )}
            </div>

            {/* Category pills list */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="bg-surface-container-high border border-outline-variant/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-sm text-on-surface font-label-md text-xs sm:text-label-md"
                >
                  <span>{cat}</span>
                  {categories.length > 1 && (
                    <button
                      onClick={() => handleDeleteCategoryClick(cat)}
                      className="text-outline hover:text-error transition-colors flex items-center"
                      title={`حذف فئة ${cat}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-space-md">
            {devices.map((device) => {
              const pendingChanges = editingRates[device.id];
              const singleVal =
                pendingChanges?.single !== undefined ? pendingChanges.single : device.singlePrice;
              const multiVal =
                pendingChanges?.multi !== undefined ? pendingChanges.multi : device.multiPrice;
              const hasChanges = pendingChanges !== undefined;

              return (
                <div
                  key={device.id}
                  className="bg-surface-container-low p-3 sm:p-space-lg rounded-2xl border border-outline-variant/30 shadow-md flex flex-col justify-between gap-3 sm:gap-space-md relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 sm:gap-space-sm">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
                          {device.isVIP ? 'stars' : 'sports_esports'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-headline-sm text-sm sm:text-headline-sm text-on-surface">
                          {device.name}
                        </h4>
                        <span className="text-[11px] sm:text-xs text-on-surface-variant">
                          {device.type} {device.isVIP ? '• VIP' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-bold ${
                          device.status === 'busy'
                            ? 'bg-tertiary-container/20 text-tertiary'
                            : 'bg-secondary-container/20 text-secondary'
                        }`}
                      >
                        {device.status === 'busy' ? (isEn ? 'Busy' : 'مشغول') : (isEn ? 'Available' : 'متاح')}
                      </span>

                      {/* Delete device button */}
                      <button
                        onClick={() => handleDeleteDeviceClick(device)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-container hover:bg-error-container/30 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
                        title={isEn ? 'Delete device' : 'حذف هذا الجهاز من النظام'}
                      >
                        <span className="material-symbols-outlined text-[16px] sm:text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Inputs for Single & Multi */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-space-sm bg-surface-container-lowest p-2.5 sm:p-space-md rounded-xl">
                    {/* Single Price */}
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-[11px] sm:text-label-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] sm:text-[14px]">person</span>
                        <span>{isEn ? 'Single ($/hr):' : 'فردي (ج.م/ساعة):'}</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={singleVal}
                        onChange={(e) =>
                          handleRateInputChange(device.id, 'single', e.target.value)
                        }
                        className="h-9 sm:h-10 bg-surface-container rounded-lg px-2 text-center font-bold text-on-surface border border-outline-variant/40 focus:border-primary outline-none text-xs sm:text-sm"
                      />
                    </div>

                    {/* Multi Price */}
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-[11px] sm:text-label-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] sm:text-[14px]">group</span>
                        <span>{isEn ? 'Multi ($/hr):' : 'جماعي (ج.م/ساعة):'}</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={multiVal}
                        onChange={(e) =>
                          handleRateInputChange(device.id, 'multi', e.target.value)
                        }
                        className="h-9 sm:h-10 bg-surface-container rounded-lg px-2 text-center font-bold text-on-surface border border-outline-variant/40 focus:border-primary outline-none text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Save button if changed */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs text-outline">
                      {hasChanges ? (isEn ? 'Pending changes' : 'توجد تعديلات') : (isEn ? 'Saved' : 'السعر محفوظ')}
                    </span>
                    <button
                      onClick={() => handleSaveDeviceRates(device.id)}
                      disabled={!hasChanges}
                      className="px-2.5 sm:px-space-md h-8 sm:h-9 bg-primary-container disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary text-on-primary-container hover:text-on-primary font-label-md text-xs sm:text-sm rounded-lg transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px] sm:text-[16px]">save</span>
                      <span>{isEn ? 'Save' : 'حفظ السعر'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TAB 3: PRODUCTS (قائمة المنتجات والمشاريب)
         ═══════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="flex flex-col gap-3 sm:gap-space-lg">
          <div className="bg-surface-container-low p-3.5 sm:p-space-lg rounded-2xl border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-space-md">
            <div>
              <h3 className="font-headline-md text-base sm:text-headline-md text-on-surface">
                {isEn ? 'Buffet & Products Menu' : 'إدارة قائمة المنتجات والمشاريب'}
              </h3>
              <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant mt-0.5">
                {isEn ? 'Add, edit, and delete cafe items and snacks' : 'إضافة وتعديل وحذف مشروبات ومأكولات البوفيه التي يطلبها الزبائن'}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingProductId(null);
                setProductForm({ name: '', price: '', category: 'مشروبات' });
                setIsProductModalOpen(true);
              }}
              className="w-full sm:w-auto h-10 sm:h-11 px-4 sm:px-space-lg bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-xs sm:text-headline-sm rounded-xl flex items-center justify-center gap-space-xs transition-all shadow-md transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add</span>
              <span>{isEn ? 'Add Item' : 'إضافة صنف جديد'}</span>
            </button>
          </div>

          {/* Products Grid by Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-space-md">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-surface-container-low p-3 sm:p-space-md rounded-2xl border border-outline-variant/20 hover:border-outline-variant/50 transition-all flex flex-col justify-between gap-2.5 sm:gap-space-md shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] sm:text-xs bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">
                      {product.category}
                    </span>
                    <h4 className="font-headline-sm text-sm sm:text-headline-sm text-on-surface mt-1 sm:mt-1.5">
                      {product.name}
                    </h4>
                  </div>
                  <span className="font-label-price text-sm sm:text-label-price text-secondary font-bold">
                    {product.price} {isEn ? '$' : 'ج.م'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 sm:gap-space-xs border-t border-outline-variant/10 pt-2 sm:pt-space-xs">
                  <button
                    onClick={() => handleEditProductClick(product)}
                    className="h-8 sm:h-9 px-2.5 sm:px-3 bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">edit</span>
                    <span>{isEn ? 'Edit' : 'تعديل'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProductClick(product.id, product.name)}
                    className="h-8 sm:h-9 px-2.5 sm:px-3 bg-error-container/20 hover:bg-error-container text-error hover:text-on-error-container font-label-md text-xs rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">delete</span>
                    <span>{isEn ? 'Delete' : 'حذف'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Product Add/Edit Modal ── */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-space-md bg-surface-container-lowest/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProductModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-surface-container rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="h-1 w-full bg-secondary-container shrink-0"></div>
            <div className="p-4 sm:p-space-xl overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sm:mb-space-md">
                <h3 className="font-headline-md text-base sm:text-headline-md text-on-surface">
                  {editingProductId ? (isEn ? 'Edit Product' : 'تعديل منتج') : (isEn ? 'Add New Product' : 'إضافة منتج جديد للبوفيه')}
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="flex flex-col gap-3 sm:gap-space-md">
                <div>
                  <label className="block font-label-md text-xs sm:text-label-md text-on-surface-variant mb-1">
                    {isEn ? 'Product / Drink Name:' : 'اسم المنتج / المشروب:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={isEn ? 'e.g. Pepsi, Coffee...' : 'مثال: كانز بيبسي، قهوة تركي...'}
                    className="w-full h-10 sm:h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-xs sm:text-sm text-on-surface border border-outline-variant/40 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-xs sm:text-label-md text-on-surface-variant mb-1">
                    {isEn ? 'Price ($):' : 'السعر (بالجنيه):'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="15"
                    className="w-full h-10 sm:h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-xs sm:text-sm text-on-surface border border-outline-variant/40 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-xs sm:text-label-md text-on-surface-variant mb-1">
                    {isEn ? 'Category:' : 'التصنيف:'}
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full h-10 sm:h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-xs sm:text-sm text-on-surface border border-outline-variant/40 focus:border-primary outline-none"
                  >
                    <option value="مشروبات">{isEn ? 'Drinks' : 'مشروبات'}</option>
                    <option value="أكل">{isEn ? 'Food' : 'أكل'}</option>
                    <option value="سناكس">{isEn ? 'Snacks' : 'سناكس'}</option>
                    <option value="حلويات">{isEn ? 'Desserts' : 'حلويات'}</option>
                  </select>
                </div>

                <div className="flex gap-2 sm:gap-space-sm mt-2 sm:mt-space-sm">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="flex-1 h-10 sm:h-11 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-xs sm:text-sm rounded-xl"
                  >
                    {isEn ? 'Cancel' : 'إلغاء'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 sm:h-11 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-xs sm:text-sm rounded-xl font-bold"
                  >
                    {editingProductId ? (isEn ? 'Save' : 'حفظ التعديل') : (isEn ? 'Add' : 'إضافة المنتج')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Device Modal ── */}
      {isAddDeviceModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-space-md bg-surface-container-lowest/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddDeviceModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-surface-container rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/30 max-h-[92vh] flex flex-col">
            <div className="h-1.5 w-full bg-secondary-container shrink-0"></div>
            <div className="p-4 sm:p-space-xl overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sm:mb-space-md">
                <div className="flex items-center gap-2 sm:gap-space-sm">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] sm:text-[24px]">sports_esports</span>
                  </div>
                  <h3 className="font-headline-md text-base sm:text-headline-md text-on-surface">
                    {isEn ? 'Add New Device' : 'إضافة جهاز جديد للصالة'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddDeviceModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleAddDeviceSubmit} className="flex flex-col gap-3 sm:gap-space-md">
                <div>
                  <label className="block font-label-md text-xs sm:text-label-md text-on-surface-variant mb-1">
                    {isEn ? 'Device Name or Table #:' : 'اسم الجهاز أو الطاولة:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeviceForm.name}
                    onChange={(e) =>
                      setNewDeviceForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={isEn ? 'e.g. Device 13, Table 5...' : 'مثال: جهاز 13، ترابيزة 5، شاشة VIP...'}
                    className="w-full h-10 sm:h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-xs sm:text-sm text-on-surface border border-outline-variant/40 focus:border-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-space-sm">
                  <div>
                    <label className="block font-label-md text-xs sm:text-label-md text-on-surface-variant mb-1">
                      {isEn ? 'Category:' : 'نوع / قسم الجهاز:'}
                    </label>
                    <select
                      value={newDeviceForm.type}
                      onChange={(e) =>
                        setNewDeviceForm((prev) => ({ ...prev, type: e.target.value }))
                      }
                      className="w-full h-10 sm:h-11 bg-surface-container-low rounded-xl px-2 sm:px-3 font-body-md text-xs sm:text-sm text-on-surface border border-outline-variant/40 focus:border-primary outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-label-md text-xs sm:text-label-md text-on-surface-variant mb-1">
                      {isEn ? 'VIP Tier:' : 'مستوى VIP:'}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewDeviceForm((prev) => ({ ...prev, isVIP: !prev.isVIP }))
                      }
                      className={`w-full h-10 sm:h-11 rounded-xl px-2 sm:px-3 font-label-md text-xs sm:text-sm transition-all flex items-center justify-center gap-1 border ${
                        newDeviceForm.isVIP
                          ? 'bg-primary/20 border-primary text-primary-fixed font-bold'
                          : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                        {newDeviceForm.isVIP ? 'stars' : 'star_border'}
                      </span>
                      <span>{newDeviceForm.isVIP ? (isEn ? 'VIP ⭐' : 'غرفة VIP ⭐') : (isEn ? 'Standard' : 'عادي')}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-space-sm">
                  <div>
                    <label className="block font-label-sm text-xs sm:text-label-sm text-on-surface-variant mb-1">
                      {isEn ? 'Single Rate/hr:' : 'سعر الفردي (ساعة):'}
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={newDeviceForm.singlePrice}
                      onChange={(e) =>
                        setNewDeviceForm((prev) => ({ ...prev, singlePrice: e.target.value }))
                      }
                      className="w-full h-10 sm:h-11 bg-surface-container-low rounded-xl px-2 sm:px-3 text-center font-bold text-on-surface border border-outline-variant/40 focus:border-primary outline-none text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-xs sm:text-label-sm text-on-surface-variant mb-1">
                      {isEn ? 'Multi Rate/hr:' : 'سعر الجماعي (ساعة):'}
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={newDeviceForm.multiPrice}
                      onChange={(e) =>
                        setNewDeviceForm((prev) => ({ ...prev, multiPrice: e.target.value }))
                      }
                      className="w-full h-10 sm:h-11 bg-surface-container-low rounded-xl px-2 sm:px-3 text-center font-bold text-on-surface border border-outline-variant/40 focus:border-primary outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-space-sm mt-2 sm:mt-space-sm">
                  <button
                    type="button"
                    onClick={() => setIsAddDeviceModalOpen(false)}
                    className="flex-1 h-10 sm:h-11 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-xs sm:text-sm rounded-xl"
                  >
                    {isEn ? 'Cancel' : 'إلغاء'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 sm:h-11 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-xs sm:text-sm rounded-xl font-bold flex items-center justify-center gap-1 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add</span>
                    <span>{isEn ? 'Add Device' : 'إضافة الجهاز'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Preview Invoice Modal ── */}
      {adminPreviewInvoice && (
        <InvoiceModal
          invoice={adminPreviewInvoice}
          onClose={() => setAdminPreviewInvoice(null)}
        />
      )}
    </div>
  );
}
