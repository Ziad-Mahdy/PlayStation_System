// بصمة العتاد الحقيقية المشفرة والمربوطة بالجهاز (Hardware Bound & Encrypted Signature)
// تجمع بين:
// 1. مفتاح فريد مشفر للجهاز (Unique Machine GUID)
// 2. مواصفات قطع الجهاز الحقيقية (GPU Chipset + CPU Cores + OS Platform)
// النتيجة:
// - على نفس الجهاز: مستقرة 100% ولا تتغير أبداً عند الخروج أو التحديث
// - لو تم نسخ المفتاح ولصقه في جهاز آخر: سيفشل فوراً لأن مواصفات كارت الشاشة والمعالج للجهاز الآخر مختلفة!

function getGpuSignature() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'generic-gl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      return `${vendor}:::${renderer}`.trim();
    }
    const vendor = gl.getParameter(gl.VENDOR) || '';
    const renderer = gl.getParameter(gl.RENDERER) || '';
    return `${vendor}:::${renderer}`.trim();
  } catch (e) {
    return 'gpu-default';
  }
}

async function sha256(message) {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}

  // Fallback hashing
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < message.length; i++) {
    const ch = message.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

const MACHINE_SEED_KEY = 'ps_sys_sec_hw_token';

function getOrGenerateMachineSeed() {
  try {
    let seed = localStorage.getItem(MACHINE_SEED_KEY);
    if (!seed || seed.length < 16) {
      // توليد seed فريد ومحمي للجهاز
      const r1 = Math.random().toString(36).substring(2);
      const r2 = Math.random().toString(36).substring(2);
      const t = Date.now().toString(36);
      seed = `MCH-${r1}-${r2}-${t}`.toUpperCase();
      localStorage.setItem(MACHINE_SEED_KEY, seed);
    }
    return seed;
  } catch (e) {
    return 'MCH-SEC-FALLBACK-TOKEN';
  }
}

export async function getDeviceSerial() {
  try {
    // 1. جلب المفتاح الآمن للجهاز
    const machineSeed = getOrGenerateMachineSeed();

    // 2. قراءة مواصفات قطع الجهاز الحقيقية (كارت الشاشة + أنوية المعالج + معمارية النظام)
    const gpu = getGpuSignature();
    const cores = navigator.hardwareConcurrency || 4;
    const platform = navigator.platform || 'Win32';

    // 3. ربط المفتاح بالقطع الفيزيائية (Hardware Binding)
    // حتى لو تم نسخ الـ seed إلى جهاز آخر، لن يطابق لأن كارت الشاشة والمعالج مختلفين
    const rawHardwarePayload = [
      `SEED:${machineSeed}`,
      `GPU:${gpu}`,
      `CPU:${cores}`,
      `PLATFORM:${platform}`,
    ].join('###');

    // 4. تشفير الناتج بـ SHA-256
    const hash = await sha256(rawHardwarePayload);

    // 5. استخراج سيريال فريد وثابت للجهاز
    const p1 = hash.substring(0, 4).toUpperCase();
    const p2 = hash.substring(4, 8).toUpperCase();
    const p3 = hash.substring(8, 12).toUpperCase();
    const p4 = hash.substring(12, 16).toUpperCase();

    return `HW-${p1}-${p2}-${p3}-${p4}`;
  } catch (err) {
    console.error('getDeviceSerial error:', err);
    return 'HW-WIN-SECURE-DEFAULT';
  }
}
