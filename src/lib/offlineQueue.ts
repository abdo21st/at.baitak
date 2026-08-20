/**
 * Client-side offline request queue to guarantee zero lost check-ins during network outages
 */

export interface OfflineAction {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = 'hodoork_offline_queue_v1';

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): OfflineAction {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    ...action,
    id: 'offline_' + Math.random().toString(36).substring(2) + Date.now(),
    timestamp: Date.now(),
    retries: 0
  };

  queue.push(newAction);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to store offline action:', e);
  }
  return newAction;
}

export function removeOfflineAction(id: string) {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to update offline queue:', e);
  }
}

/**
 * Replay stored offline actions once network connection is restored
 */
export async function syncOfflineQueue(): Promise<{ syncedCount: number; errors: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, errors: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, errors: 0 };

  let syncedCount = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: {
          ...item.headers,
          'x-offline-synced': 'true',
          'x-offline-timestamp': String(item.timestamp)
        },
        body: JSON.stringify(item.body)
      });

      if (res.ok) {
        removeOfflineAction(item.id);
        syncedCount++;
      } else {
        errors++;
      }
    } catch (e) {
      errors++;
    }
  }

  return { syncedCount, errors };
}
