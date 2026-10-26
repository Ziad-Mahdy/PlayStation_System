import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useDevicesStore from '../store/devicesStore';
import DeviceCard from '../components/devices/DeviceCard';
import StartSessionModal from '../components/devices/StartSessionModal';
import SessionModal from '../components/devices/SessionModal';
import WorkerAccountsModal from '../components/devices/WorkerAccountsModal';
import AdminPasswordModal from '../components/AdminPasswordModal';

export default function DevicesPage() {
  const navigate = useNavigate();
  const devices = useDevicesStore((s) => s.devices);
  const categories = useDevicesStore((s) => s.categories || []);
  const isLoading = useDevicesStore((s) => s.isLoading);

  // States
  const [filterType, setFilterType] = useState('all'); // 'all' | 'vip' | categoryName
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'busy' | 'free'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeSessionDeviceId, setActiveSessionDeviceId] = useState(null);
  const [startSessionDeviceId, setStartSessionDeviceId] = useState(null);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const total = devices.length;
    const busy = devices.filter((d) => d.status === 'busy').length;
    const free = devices.filter((d) => d.status === 'free').length;
    return { total, busy, free };
  }, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Type / Category filter
      if (filterType === 'vip') {
        if (!device.isVIP) return false;
      } else if (filterType !== 'all') {
        if (device.type !== filterType) return false;
      }

      // Status filter
      if (filterStatus === 'busy' && device.status !== 'busy') return false;
      if (filterStatus === 'free' && device.status !== 'free') return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = device.name.toLowerCase().includes(query);
        const matchesType = device.type.toLowerCase().includes(query);
        if (!matchesName && !matchesType) return false;
      }

      return true;
    });
  }, [devices, filterType, filterStatus, searchQuery]);

  return (
    <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto">
      {/* ── Top Bar: Title & Stats ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-low p-space-lg rounded-2xl border border-outline-variant/30">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">
            إدارة أجهزة الصالة
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            متابعة حالة الأجهزة، تشغيل العدادات، وإضافة طلبات ومشاريب الزبائن
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="flex items-center gap-space-xs bg-surface-container-high px-space-md py-space-sm rounded-xl border border-outline-variant/30">
            <span className="font-label-md text-label-md text-on-surface-variant">إجمالي الأجهزة:</span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-space-xs bg-tertiary-container/20 text-tertiary px-space-md py-space-sm rounded-xl border border-tertiary-container/30">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-label-md text-label-md">مشغول:</span>
            <span className="font-headline-sm text-headline-sm font-bold">{stats.busy}</span>
          </div>
          <div className="flex items-center gap-space-xs bg-secondary-container/20 text-secondary px-space-md py-space-sm rounded-xl border border-secondary-container/30">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            <span className="font-label-md text-label-md">متاح:</span>
            <span className="font-headline-sm text-headline-sm font-bold">{stats.free}</span>
          </div>

          {/* Quick Trigger to Worker Accounts */}
          <button
            type="button"
            onClick={() => setShowAccountsModal(true)}
            className="h-11 px-space-md bg-surface-container-high hover:bg-surface-container-highest text-secondary border border-secondary/30 rounded-xl font-label-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>فواتير وحسابات الشيفت</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/20 shadow-md">
        {/* Device Categories / Type Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-space-md py-2.5 rounded-xl font-label-lg text-label-lg transition-all shrink-0 ${
              filterType === 'all'
                ? 'bg-primary-container text-on-primary-container shadow-md'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            كل الأجهزة
          </button>

          {/* Dynamic categories from store */}
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`px-space-md py-2.5 rounded-xl font-label-lg text-label-lg transition-all shrink-0 ${
                filterType === cat
                  ? 'bg-primary-container text-on-primary-container shadow-md'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {cat}
            </button>
          ))}

          <button
            onClick={() => setFilterType('vip')}
            className={`px-space-md py-2.5 rounded-xl font-label-lg text-label-lg transition-all shrink-0 ${
              filterType === 'vip'
                ? 'bg-primary-container text-on-primary-container shadow-md'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            غرف VIP ⭐
          </button>
        </div>

        {/* Right side: Status Filter & Search input */}
        <div className="flex flex-col sm:flex-row items-center gap-space-sm">
          {/* Status selector */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex-1 sm:flex-initial text-center ${
                filterStatus === 'all'
                  ? 'bg-surface-container-highest text-on-surface font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterStatus('busy')}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex-1 sm:flex-initial text-center ${
                filterStatus === 'busy'
                  ? 'bg-tertiary-container/30 text-tertiary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              شغال
            </button>
            <button
              onClick={() => setFilterStatus('free')}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex-1 sm:flex-initial text-center ${
                filterStatus === 'free'
                  ? 'bg-secondary-container/30 text-secondary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              فاضي
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم أو اسم الجهاز..."
              className="w-full h-11 bg-surface-container rounded-xl pl-10 pr-space-md font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant border border-outline-variant/40 focus:border-primary outline-none transition-all"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-auto left-9 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Devices Grid ── */}
      {isLoading ? (
        <div className="bg-surface-container-low rounded-2xl p-space-xl flex flex-col items-center justify-center text-center py-24 border border-outline-variant/20">
          <span className="material-symbols-outlined text-[48px] text-primary animate-spin mb-space-sm">
            progress_activity
          </span>
          <p className="font-headline-sm text-headline-sm text-on-surface">
            جاري مزامنة الأجهزة مع قاعدة البيانات...
          </p>
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-space-xl flex flex-col items-center justify-center text-center py-24 border border-outline-variant/25 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center text-on-primary-container shadow-md mb-4">
            <span className="material-symbols-outlined text-[36px]">sports_esports</span>
          </div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">
            أهلاً بك في نظام الكافيه الخاص بك! 🎮
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-2">
            لم تقم بإضافة أي أجهزة حتى الآن. توجه إلى لوحة الأدمن للبدء في إضافة أجهزة الصالة وتحديد أسعار السنجل والمالتي.
          </p>
          <button
            type="button"
            onClick={() => setShowAdminPasswordModal(true)}
            className="mt-6 px-6 h-12 bg-primary text-on-primary font-headline-sm rounded-xl hover:brightness-110 shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>إضافة أجهزة من لوحة الأدمن</span>
          </button>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-space-xl flex flex-col items-center justify-center text-center py-20 border border-outline-variant/20">
          <span className="material-symbols-outlined text-[56px] text-outline mb-space-sm">
            search_off
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            لا توجد أجهزة مطابقة للبحث أو الفلتر
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            جرب تغيير معايير البحث أو اختيار "كل الأجهزة"
          </p>
          <button
            onClick={() => {
              setFilterType('all');
              setFilterStatus('all');
              setSearchQuery('');
            }}
            className="mt-space-md px-space-lg h-11 bg-primary-container text-on-primary-container font-label-lg rounded-xl hover:bg-primary hover:text-on-primary transition-all"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-lg">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onOpenSession={(id) => setActiveSessionDeviceId(id)}
              onStartSession={(id) => setStartSessionDeviceId(id)}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {startSessionDeviceId && (
        <StartSessionModal
          deviceId={startSessionDeviceId}
          onClose={() => setStartSessionDeviceId(null)}
        />
      )}

      {activeSessionDeviceId && (
        <SessionModal
          deviceId={activeSessionDeviceId}
          onClose={() => setActiveSessionDeviceId(null)}
        />
      )}

      {/* ── Admin Password Modal (للدخول المباشر للوحة الأدمن) ── */}
      <AdminPasswordModal
        isOpen={showAdminPasswordModal}
        onClose={() => setShowAdminPasswordModal(false)}
        onSuccess={() => navigate('/admin')}
      />

      {/* ── Worker Accounts Modal ── */}
      <WorkerAccountsModal
        isOpen={showAccountsModal}
        onClose={() => setShowAccountsModal(false)}
      />
    </div>
  );
}
