/**
 * Device Fingerprint — stable hash for anti-fraud vote deduplication
 * Uses canvas rendering + screen + timezone to generate a unique-ish device ID
 * Not cryptographically secure, but sufficient for preventing casual double-voting
 */

const STORAGE_KEY = 'nepalrepublic_device_id';

function generateFingerprint(): string {
  const components: string[] = [];

  // Screen properties
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);
  components.push(`${screen.pixelDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  components.push(`${new Date().getTimezoneOffset()}`);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('NepalRepublic 🏔', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('NepalRepublic 🏔', 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch {
    components.push('canvas-unavailable');
  }

  // WebGL renderer (if available)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch {
    components.push('webgl-unavailable');
  }

  // Hash all components
  const raw = components.join('|||');
  return hashString(raw);
}

/**
 * Simple string hash (djb2 variant) — produces a hex string
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  // Convert to positive hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Get or generate the device fingerprint.
 * Cached in localStorage so it stays stable across sessions.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const fingerprint = generateFingerprint();
  localStorage.setItem(STORAGE_KEY, fingerprint);
  return fingerprint;
}
