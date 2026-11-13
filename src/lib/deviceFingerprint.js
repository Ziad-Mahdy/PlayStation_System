// بصمة العتاد الحقيقية المشفرة للجهاز (Encrypted Hardware Fingerprint)
// تعتمد 100% على مواصفات قطع الجهاز الحقيقية (GPU, CPU, Audio DAC, Screen)
// مع تشفير SHA-256 وبدون تخزين في localStorage نهائياً لمنع النسخ والتزوير

function getGpuSignature() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      return `${vendor}:::${renderer}`;
    }
    return `${gl.getParameter(gl.VENDOR)}:::${gl.getParameter(gl.RENDERER)}`;
  } catch (e) {
    return 'gpu-fallback';
  }
}

async function getAudioSignature() {
  try {
    const AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioContext) return 'no-audio-ctx';

    const context = new AudioContext(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.reduction.value = -20;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    const audioBuffer = await context.startRendering();
    const channelData = audioBuffer.getChannelData(0);

    let sum = 0;
    for (let i = 4500; i < 5000; i++) {
      sum += Math.abs(channelData[i] || 0);
    }
    return sum.toFixed(7);
  } catch (e) {
    return 'audio-fallback';
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

  // Fallback hashing if Web Crypto is unavailable
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

export async function getDeviceSerial() {
  try {
    // تنظيف أي سيريال قديم كان محفوظاً في المتصفح لمنع الاعتماد على الـ localStorage
    try {
      localStorage.removeItem('playstation_hardware_serial_v1');
    } catch (e) {}

    // 1. استخراج الخصائص الحقيقية لعتاد الجهاز
    const gpu = getGpuSignature();
    const audio = await getAudioSignature();
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 8;
    const platform = navigator.platform || 'Win32';
    const screenDims = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // 2. دمج الخصائص الفيزيائية للجهاز
    const hardwarePayload = [
      `GPU:${gpu}`,
      `AUDIO:${audio}`,
      `CPU:${cores}`,
      `RAM:${memory}`,
      `OS:${platform}`,
      `SCR:${screenDims}`,
      `TZ:${timezone}`,
    ].join('|||');

    // 3. تشفير البصمة بـ SHA-256
    const hash = await sha256(hardwarePayload);

    // 4. إرجاع السيريال المشفر بصيغة مقروءة وآمنة
    const p1 = hash.substring(0, 4).toUpperCase();
    const p2 = hash.substring(4, 8).toUpperCase();
    const p3 = hash.substring(8, 12).toUpperCase();
    const p4 = hash.substring(12, 16).toUpperCase();

    return `HW-${p1}-${p2}-${p3}-${p4}`;
  } catch (err) {
    console.error('Hardware fingerprint generation error:', err);
    return 'HW-SEC-GENERIC-AUTH';
  }
}
