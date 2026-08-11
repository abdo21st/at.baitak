// Haversine formula distance calculation in meters
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function getCurrentDateFormatted(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTimeFormatted(): string {
  const d = new Date();
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

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

export function calculateLateMinutes(checkInTimeStr: string, shiftStartTimeStr: string, gracePeriod: number = 15): number {
  try {
    const [cHours, cMins] = checkInTimeStr.split(':').map(Number);
    const [sHours, sMins] = shiftStartTimeStr.split(':').map(Number);

    const checkInTotalMins = cHours * 60 + cMins;
    const shiftStartTotalMins = sHours * 60 + sMins + gracePeriod;

    if (checkInTotalMins > shiftStartTotalMins) {
      return checkInTotalMins - (sHours * 60 + sMins);
    }
    return 0;
  } catch {
    return 0;
  }
}
