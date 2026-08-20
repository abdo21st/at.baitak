/**
 * Generates a stable hardware and browser fingerprint hash on client
 */
export async function getClientDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server_render';

  try {
    const components: string[] = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth ? String(screen.colorDepth) : '24',
      `${screen.width}x${screen.height}`,
      String(new Date().getTimezoneOffset()),
      navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : 'unknown',
      (navigator as any).deviceMemory ? String((navigator as any).deviceMemory) : 'unknown'
    ];

    // Attempt canvas fingerprinting
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('HodoorK_FP_2026', 2, 15);
        components.push(canvas.toDataURL());
      }
    } catch {
      // Ignore canvas errors
    }

    const rawString = components.join('|||');
    const msgUint8 = new TextEncoder().encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (e) {
    return 'fallback_fp_' + Math.random().toString(36).substring(2);
  }
}
