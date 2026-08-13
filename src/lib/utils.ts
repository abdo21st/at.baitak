export function getCurrentDateFormatted(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeFormatted(): string {
  const d = new Date();
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

// Arabic date string using strictly Western English digits (0-9)
export function formatArabicDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-LY-u-nu-latn', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Formats 24h time ("16:00:00" or "08:30") to 12-hour Arabic string ("04:00 مساءً" or "08:30 صباحاً")
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr || timeStr === '--:--' || timeStr === '--') return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;

  const period = hours >= 12 ? 'مساءً' : 'صباحاً';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedHours = String(hours).padStart(2, '0');
  return `${formattedHours}:${minutes} ${period}`;
}

// Convert 12h selector values to 24h ISO time string ("HH:MM:00")
export function convert12to24(hour12: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour12, 10);
  if (isNaN(h)) h = 12;
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}:00`;
}

// Convert 24h time string ("HH:MM") to 12h selector state ({ hour: "08", minute: "00", period: "AM" })
export function convert24to12(time24: string) {
  if (!time24) return { hour: '08', minute: '00', period: 'AM' as const };
  const parts = time24.split(':');
  let h = parseInt(parts[0] || '08', 10);
  const m = parts[1] || '00';
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return {
    hour: String(h).padStart(2, '0'),
    minute: m,
    period
  };
}

// Calculate distance in meters between two GPS coordinates using Haversine formula
export function calculateGpsDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
