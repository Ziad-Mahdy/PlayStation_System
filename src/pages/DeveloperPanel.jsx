import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSubscriptionStore from '../store/subscriptionStore';
import toast from 'react-hot-toast';

// Helper to generate a clean random license code
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PS-${part1}-${part2}`;
};

export default function DeveloperPanel() {
  const navigate = useNavigate();
  const logoutDev = useSubscriptionStore((s) => s.logoutDev);
  const subscribers = useSubscriptionStore((s) => s.subscribers);
  const isLoading = useSubscriptionStore((s) => s.isLoadingSubscribers);
  const fetchSubscribers = useSubscriptionStore((s) => s.fetchSubscribers);
  const addSubscriber = useSubscriptionStore((s) => s.addSubscriber);
  const extendSubscriber = useSubscriptionStore((s) => s.extendSubscriber);
  const toggleSuspend = useSubscriptionStore((s) => s.toggleSuspend);
  const updateAdminPassword = useSubscriptionStore((s) => s.updateAdminPassword);
  const deleteSubscriber = useSubscriptionStore((s) => s.deleteSubscriber);
  const resetDeviceBinding = useSubscriptionStore((s) => s.resetDeviceBinding);

  // Filters & search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'pending' | 'expired' | 'suspended'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(null); // subscriber object
  const [extendDaysInput, setExtendDaysInput] = useState(30);

  const [showPasswordModal, setShowPasswordModal] = useState(null); // subscriber object
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Add form
  const [newClient, setNewClient] = useState({
    client_name: '',
    shop_name: '',
    phone: '',
    code: generateCode(),
    duration_days: 30,
    admin_password: 'Admin@123',
    notes: '',
  });

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Statistics
  const stats = useMemo(() => {
    const total = subscribers.length;
    let active = 0;
    let pending = 0;
    let expired = 0;
    let suspended = 0;

    const now = new Date();

    subscribers.forEach((s) => {
      if (s.is_suspended) {
        suspended++;
      } else if (!s.is_active || !s.expires_at) {
        pending++;
      } else if (new Date(s.expires_at) > now) {
        active++;
      } else {
        expired++;
      }
    });

    return { total, active, pending, expired, suspended };
  }, [subscribers]);

  // Filtered subscribers
  const filteredSubscribers = useMemo(() => {
    const now = new Date();
    return subscribers.filter((s) => {
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = (s.client_name || '').toLowerCase().includes(q);
        const matchesShop = (s.shop_name || '').toLowerCase().includes(q);
        const matchesPhone = (s.phone || '').includes(q);
        const matchesCode = (s.code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesShop && !matchesPhone && !matchesCode) return false;
      }

      // Status
      if (statusFilter === 'active') {
        return s.is_active && !s.is_suspended && s.expires_at && new Date(s.expires_at) > now;
      }
      if (statusFilter === 'pending') {
        return !s.is_active && !s.is_suspended;
      }
      if (statusFilter === 'expired') {
        return s.is_active && !s.is_suspended && s.expires_at && new Date(s.expires_at) <= now;
      }
      if (statusFilter === 'suspended') {
        return s.is_suspended;
      }

      return true;
    });
  }, [subscribers, search, statusFilter]);

  // Handle Add Subscriber
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newClient.client_name || !newClient.shop_name || !newClient.phone || !newClient.code) {
      toast.error('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    const res = await addSubscriber(newClient);
    if (res.success) {
      toast.success('تمت إضافة المشترك بنجاح وتوليد الكود! 🚀');
      setShowAddModal(false);
      setNewClient({
        client_name: '',
        shop_name: '',
        phone: '',
        code: generateCode(),
        duration_days: 30,
        admin_password: 'Admin@123',
        notes: '',
      });
    } else {
      toast.error(res.message || 'حدث خطأ أثناء الإضافة');
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code, client) => {
    navigator.clipboard.writeText(code);
    toast.success(`تم نسخ كود المشترك (${client.client_name}) للمشاركة على الواتساب 📋`);
  };

  // Handle Extend
  const handleConfirmExtend = async () => {
    if (!showExtendModal) return;
    const ok = await extendSubscriber(showExtendModal.id, Number(extendDaysInput));
    if (ok) {
      toast.success(`تم تعديل مدة الاشتراك بمقدار (${extendDaysInput} يوم) بنجاح!`);
      setShowExtendModal(null);
    } else {
      toast.error('فشل تعديل المدة');
    }
  };

  // Handle Password Update
  const handleConfirmPassword = async () => {
    if (!showPasswordModal || !newPasswordInput.trim()) return;
    const ok = await updateAdminPassword(showPasswordModal.id, newPasswordInput);
    if (ok) {
      toast.success('تم تحديث باسوورد الأدمن للعميل بنجاح');
      setShowPasswordModal(null);
      setNewPasswordInput('');
    } else {
      toast.error('فشل تحديث كلمة المرور');
    }
  };

  // Handle Delete
  const handleDelete = async (sub) => {
    if (window.confirm(`هل أنت متأكد من حذف المشترك (${sub.client_name} - ${sub.shop_name})؟ سيتم إيقاف الكود وطرده فوراً.`)) {
      const ok = await deleteSubscriber(sub.id);
      if (ok) {
        toast.success('تم حذف المشترك بنجاح');
      } else {
        toast.error('فشل حذف المشترك');
      }
    }
  };

  // Handle Reset Device Binding
  const handleResetDevice = async (sub) => {
    if (window.confirm(`هل تريد فك ربط الكود بجهاز (${sub.client_name})؟ سيتمكن من تسجيل الدخول من جهاز كمبيوتر جديد.`)) {
      const ok = await resetDeviceBinding(sub.id);
      if (ok) {
        toast.success('تم فك ربط الجهاز بنجاح! يمكن للعميل الآن الدخول من جهاز جديد 🔓');
      } else {
        toast.error('فشل فك ربط الجهاز');
      }
    }
  };

  // Calculate remaining time string
  const getRemainingTimeText = (sub) => {
    if (sub.is_suspended) {
      return { text: 'موقوف مؤقتاً', color: 'text-error bg-error/10 border-error/30' };
    }
    if (!sub.is_active || !sub.expires_at) {
      return { text: `جديد لم يُفعل (${sub.duration_days} يوم)`, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
    }

    const now = new Date();
    const expiry = new Date(sub.expires_at);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      return { text: 'منتهي الصلاحية', color: 'text-error bg-error/15 border-error/30' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 7) {
      return { text: `متبقي ${days} يوم و ${hours} س`, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
    }
    return { text: `متبقي ${days} يوم و ${hours} س (قارب على الانتهاء)`, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface p-6 max-w-[1600px] mx-auto flex flex-col gap-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-3xl border border-outline-variant/30 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-md">
            <span className="material-symbols-outlined text-[28px]">terminal</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-headline-lg text-primary">
                لوحة تحكم المطور المركزية
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/30">
                Developer Panel
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              إدارة المشتركين، توليد وتفعيل الأكواد، وتمديد وإيقاف الاشتراكات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="h-11 px-4 rounded-xl bg-surface-container text-on-surface font-label-md flex items-center gap-2 hover:bg-surface-container-highest transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">storefront</span>
            <span>معاينة السيستم</span>
          </button>

          <button
            onClick={() => {
              logoutDev();
              navigate('/login');
            }}
            className="h-11 px-4 rounded-xl bg-error/15 text-error font-label-md flex items-center gap-2 hover:bg-error/25 border border-error/30 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>خروج المطور</span>
          </button>
        </div>
      </div>

      {/* ── Statistics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 flex flex-col gap-1">
          <span className="text-xs text-on-surface-variant font-medium">إجمالي المشتركين</span>
          <span className="text-3xl font-extrabold text-on-surface font-mono">{stats.total}</span>
        </div>

        <div className="bg-surface-container-low p-5 rounded-2xl border border-emerald-500/20 flex flex-col gap-1">
          <span className="text-xs text-emerald-400 font-medium">نشط وشغال</span>
          <span className="text-3xl font-extrabold text-emerald-400 font-mono">{stats.active}</span>
        </div>

        <div className="bg-surface-container-low p-5 rounded-2xl border border-amber-500/20 flex flex-col gap-1">
          <span className="text-xs text-amber-400 font-medium">جديد في انتظار التفعيل</span>
          <span className="text-3xl font-extrabold text-amber-400 font-mono">{stats.pending}</span>
        </div>

        <div className="bg-surface-container-low p-5 rounded-2xl border border-rose-500/20 flex flex-col gap-1">
          <span className="text-xs text-rose-400 font-medium">منتهي الصلاحية</span>
          <span className="text-3xl font-extrabold text-rose-400 font-mono">{stats.expired}</span>
        </div>

        <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 flex flex-col gap-1">
          <span className="text-xs text-on-surface-variant font-medium">موقوف مؤقتاً</span>
          <span className="text-3xl font-extrabold text-zinc-400 font-mono">{stats.suspended}</span>
        </div>
      </div>

      {/* ── Action Bar: Search, Filters & Add Button ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="بحث بالاسم، المحل، التليفون أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pr-10 pl-4 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'active', label: 'النشط' },
              { id: 'pending', label: 'الجديد' },
              { id: 'expired', label: 'المنتهي' },
              { id: 'suspended', label: 'الموقوف' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-label-md transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add Subscriber Button */}
        <button
          onClick={() => {
            setNewClient((prev) => ({ ...prev, code: generateCode() }));
            setShowAddModal(true);
          }}
          className="h-11 px-5 rounded-xl bg-primary text-on-primary font-headline-sm text-sm flex items-center gap-2 shadow-lg hover:shadow-primary/20 hover:brightness-110 active:scale-95 transition-all w-full md:w-auto justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>إضافة مشترك جديد</span>
        </button>
      </div>

      {/* ── Subscribers Table ── */}
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[40px] text-primary">
              progress_activity
            </span>
            <span>جاري تحميل بيانات المشتركين...</span>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[56px] text-outline">group_off</span>
            <p className="font-headline-sm">لا يوجد مشتركين مطابقين للبحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-surface-container/60 border-b border-outline-variant/20 text-xs text-on-surface-variant font-label-lg">
                  <th className="py-4 px-5">العميل والمحل</th>
                  <th className="py-4 px-5">رقم الهاتف</th>
                  <th className="py-4 px-5">كود التفعيل</th>
                  <th className="py-4 px-5">حالة الاشتراك والمدة</th>
                  <th className="py-4 px-5">سيريال الجهاز المربوط</th>
                  <th className="py-4 px-5">باسوورد الأدمن</th>
                  <th className="py-4 px-5 text-center">إجراءات التحكم السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-sm">
                {filteredSubscribers.map((sub) => {
                  const statusInfo = getRemainingTimeText(sub);
                  return (
                    <tr key={sub.id} className="hover:bg-surface-container-high/40 transition-colors">
                      {/* Name & Shop */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">{sub.client_name}</span>
                          <span className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">store</span>
                            {sub.shop_name}
                          </span>
                          {sub.notes && (
                            <span className="text-[11px] text-on-surface-variant mt-1">
                              📝 {sub.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-5 font-mono text-on-surface dir-ltr text-right">
                        {sub.phone}
                      </td>

                      {/* Code */}
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/30">
                          <span className="font-mono font-bold tracking-wider text-primary">
                            {sub.code}
                          </span>
                          <button
                            title="نسخ الكود"
                            onClick={() => handleCopyCode(sub.code, sub)}
                            className="text-on-surface-variant hover:text-primary p-0.5 rounded transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>
                        </div>
                      </td>

                      {/* Status & Time */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}
                          >
                            {statusInfo.text}
                          </span>
                          {sub.activated_at && (
                            <span className="text-[11px] text-on-surface-variant">
                              بدأ: {new Date(sub.activated_at).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Device Serial Binding */}
                      <td className="py-4 px-5">
                        {sub.device_serial ? (
                          <div className="flex items-center gap-2">
                            <span
                              title={sub.device_serial}
                              className="font-mono text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/25 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                              <span>{sub.device_serial.slice(0, 14)}...</span>
                            </span>
                            <button
                              title="فك ربط الجهاز (للسماح بالدخول من جهاز جديد)"
                              onClick={() => handleResetDevice(sub)}
                              className="text-xs text-on-surface-variant hover:text-amber-400 p-1 rounded transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">lock_open</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined text-[14px]">lock_open</span>
                            <span>غير مربوط بعد</span>
                          </span>
                        )}
                      </td>

                      {/* Admin Password */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded-lg border border-outline-variant/30">
                            {sub.admin_password}
                          </span>
                          <button
                            title="تعديل كلمة مرور الأدمن"
                            onClick={() => {
                              setShowPasswordModal(sub);
                              setNewPasswordInput(sub.admin_password || 'Admin@123');
                            }}
                            className="text-on-surface-variant hover:text-primary p-1 rounded transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Extend Duration */}
                          <button
                            title="تمديد / إنقاص الأيام"
                            onClick={() => {
                              setShowExtendModal(sub);
                              setExtendDaysInput(30);
                            }}
                            className="h-8 px-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">more_time</span>
                            <span>تمديد</span>
                          </button>

                          {/* Toggle Suspend */}
                          <button
                            title={sub.is_suspended ? 'استئناف وتفعيل' : 'إيقاف مؤقت'}
                            onClick={() => toggleSuspend(sub.id, sub.is_suspended)}
                            className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                              sub.is_suspended
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {sub.is_suspended ? 'play_arrow' : 'pause'}
                            </span>
                          </button>

                          {/* Delete */}
                          <button
                            title="حذف المشترك"
                            onClick={() => handleDelete(sub)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Subscriber Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-high border border-outline-variant/40 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5 text-primary">
                <span className="material-symbols-outlined text-[28px]">person_add</span>
                <h3 className="font-headline-md text-headline-md">إضافة مشترك جديد</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-on-surface font-medium">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: محمد أحمد"
                    value={newClient.client_name}
                    onChange={(e) => setNewClient({ ...newClient, client_name: e.target.value })}
                    className="h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                {/* Shop Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-on-surface font-medium">اسم الكافيه / المحل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ستيشن برو كافيه"
                    value={newClient.shop_name}
                    onChange={(e) => setNewClient({ ...newClient, shop_name: e.target.value })}
                    className="h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-medium">رقم الهاتف (سيسجل به) *</label>
                <input
                  type="tel"
                  required
                  placeholder="010xxxxxxxx"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary text-sm font-mono dir-ltr text-right"
                />
              </div>

              {/* Subscription Code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-medium flex items-center justify-between">
                  <span>كود الاشتراك الفريد *</span>
                  <button
                    type="button"
                    onClick={() => setNewClient({ ...newClient, code: generateCode() })}
                    className="text-primary text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    توليد كود جديد
                  </button>
                </label>
                <input
                  type="text"
                  required
                  value={newClient.code}
                  onChange={(e) => setNewClient({ ...newClient, code: e.target.value.toUpperCase() })}
                  className="h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant/40 text-primary font-mono font-bold tracking-widest text-center text-base focus:outline-none focus:border-primary"
                />
              </div>

              {/* Duration Presets */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-on-surface font-medium">مدة الاشتراك (بالأيام)</label>
                <div className="flex items-center gap-2">
                  {[
                    { days: 30, label: 'شهر (30)' },
                    { days: 90, label: '3 شهور (90)' },
                    { days: 180, label: '6 شهور (180)' },
                    { days: 365, label: 'سنة (365)' },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setNewClient({ ...newClient, duration_days: p.days })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-label-md border transition-all cursor-pointer ${
                        newClient.duration_days === p.days
                          ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                          : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  value={newClient.duration_days}
                  onChange={(e) => setNewClient({ ...newClient, duration_days: Number(e.target.value) })}
                  className="h-10 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-mono text-sm focus:outline-none focus:border-primary text-center"
                />
              </div>

              {/* Admin Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-medium">
                  كلمة مرور لوحة الأدمن الخاصة به *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Admin@123"
                  value={newClient.admin_password}
                  onChange={(e) => setNewClient({ ...newClient, admin_password: e.target.value })}
                  className="h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary text-sm font-mono"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface font-medium">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  placeholder="عنوان المحل أو تفاصيل الاتفاق..."
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary text-sm"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-label-md hover:bg-surface-container-highest transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-headline-sm text-sm hover:brightness-110 shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
                >
                  حفظ وتوليد الكود
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Extend Modal ── */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-high border border-outline-variant/40 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
              تمديد مدة المشترك
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              العميل: <strong className="text-on-surface">{showExtendModal.client_name}</strong> ({showExtendModal.shop_name})
            </p>

            <div className="flex flex-col gap-3">
              <label className="text-xs text-on-surface">عدد الأيام المراد إضافتها (أو خصمها بسالب):</label>
              <div className="flex items-center gap-2">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDaysInput(d)}
                    className="flex-1 py-1.5 rounded-lg bg-surface-container text-xs font-mono border border-outline-variant/20 hover:border-primary cursor-pointer"
                  >
                    +{d} يوم
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={extendDaysInput}
                onChange={(e) => setExtendDaysInput(Number(e.target.value))}
                className="h-11 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-mono text-center text-lg focus:outline-none focus:border-primary"
              />

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(null)}
                  className="flex-1 h-10 rounded-xl bg-surface-container text-on-surface-variant text-xs hover:bg-surface-container-highest"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExtend}
                  className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110"
                >
                  تأكيد التمديد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Admin Password Modal ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-high border border-outline-variant/40 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
              تعديل باسوورد الأدمن للعميل
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              العميل: <strong className="text-on-surface">{showPasswordModal.client_name}</strong>
            </p>

            <div className="flex flex-col gap-3">
              <label className="text-xs text-on-surface">كلمة المرور الجديدة:</label>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="h-11 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-mono text-center text-base focus:outline-none focus:border-primary"
              />

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="flex-1 h-10 rounded-xl bg-surface-container text-on-surface-variant text-xs hover:bg-surface-container-highest"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPassword}
                  className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110"
                >
                  تحديث الباسوورد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
