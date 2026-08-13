// PWA and Background Geofence Notification Manager for Android
import { calculateGpsDistanceMeters } from './utils';

export interface GeoFenceSettings {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

let watchId: number | null = null;
let lastInsideState: boolean | null = null;

// Register Service Worker for PWA
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
}

// Request Notification Permissions
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

// Send Notification via Service Worker or Web Notification API
export async function sendGeofenceNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined') return;

  const permGranted = await requestNotificationPermission();
  if (!permGranted) return;

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({
        type: 'SHOW_GEOFENCE_NOTIFICATION',
        title,
        body,
        tag,
        url: '/dashboard/employee'
      });
      return;
    }
  }

  // Fallback to direct Notification API
  new Notification(title, {
    body,
    tag,
    icon: '/icon-192.png',
    dir: 'rtl',
    lang: 'ar'
  });
}

// Start Geolocation Background Watcher for Check-in / Check-out Alerts
export function startGeofenceWatcher(
  settings: GeoFenceSettings,
  isCheckedIn: boolean,
  onEnterHQ?: () => void,
  onExitHQ?: () => void
) {
  if (typeof window === 'undefined' || !('geolocation' in navigator) || !settings.enabled) {
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const dist = calculateGpsDistanceMeters(latitude, longitude, settings.latitude, settings.longitude);
      const isInside = dist <= settings.radiusMeters;

      if (lastInsideState === null) {
        lastInsideState = isInside;
        return;
      }

      // Transition: Outside ➔ Entered HQ Radius (Trigger Check-in alert if not checked in)
      if (!lastInsideState && isInside) {
        lastInsideState = true;
        if (!isCheckedIn) {
          sendGeofenceNotification(
            '📍 تنبيه الحضور: أهلاً بك في مقر العمل!',
            'لقد وصلت الآن لإحداثيات مقر العمل. انقر هنا لتسجيل حضورك فوراً.',
            'geofence-checkin'
          );
          if (onEnterHQ) onEnterHQ();
        }
      }

      // Transition: Inside ➔ Exited HQ Radius (Trigger Check-out alert if checked in)
      if (lastInsideState && !isInside) {
        lastInsideState = false;
        if (isCheckedIn) {
          sendGeofenceNotification(
            '🚶‍♂️ تنبيه الانصراف: لقد غادرت مقر العمل!',
            'تنبيه: أنت الآن خارج نطاق مقر العمل. انقر هنا لتسجيل انصرافك الآن.',
            'geofence-checkout'
          );
          if (onExitHQ) onExitHQ();
        }
      }
    },
    (err) => {
      console.warn('Geofence Watcher Warning:', err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000
    }
  );
}
