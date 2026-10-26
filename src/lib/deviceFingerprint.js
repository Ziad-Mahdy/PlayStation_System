// توليد واسترجاع سيريال / بصمة فريدة للجهاز (Hardware Device ID)
// لمنع مشاركة كود الاشتراك على أكثر من جهاز كمبيوتر

const STORAGE_KEY = 'playstation_hardware_serial_v1';

export async function getDeviceSerial() {
  try {
    // 1. فحص وجود سيريال مسجل مسبقاً على هذا الجهاز
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.startsWith('DEV-')) {
      return existing;
    }

    // 2. تجميع مواصفات العتاد الفريدة للمتصفح والجهاز
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const cores = navigator.hardwareConcurrency || 4;
    const lang = navigator.language || 'en';
    const platform = navigator.platform || 'Win32';

    // بصمة Canvas سريعة لتمييز كارت الشاشة
    let canvasHash = 'c-0';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('PS-Hardware-ID-2026', 2, 2);
        canvasHash = canvas.toDataURL().slice(-16);
      }
    } catch (e) {}

    // توليد كود عشوائي مشفر
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timePart = Date.now().toString(36).substring(4).toUpperCase();

    // السيريال النهائي المميز للجهاز
    const deviceSerial = `DEV-${platform.substring(0, 3).toUpperCase()}-${cores}${screenInfo.split('x')[0]}-${randomPart}-${timePart}`;

    localStorage.setItem(STORAGE_KEY, deviceSerial);
    return deviceSerial;
  } catch (err) {
    // Fallback في حال تعذر التوليد
    const fallback = `DEV-PC-${Date.now().toString(36).toUpperCase()}`;
    try {
      localStorage.setItem(STORAGE_KEY, fallback);
    } catch (e) {}
    return fallback;
  }
}
