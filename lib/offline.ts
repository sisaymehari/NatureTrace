import { OfflineReport } from '@/types';

const QUEUE_KEY = 'bioguard_offline_queue';

export function saveToOfflineQueue(report: OfflineReport): void {
  const queue = getOfflineQueue();
  queue.push(report);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue(): OfflineReport[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export async function flushOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const results = await Promise.allSettled(
    queue.map(async (report) => {
      let photo_url: string | null = null;

      if (report.photo_base64) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: report.photo_base64 }),
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          photo_url = data.url;
        }
      }

      return fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: report.category,
          species_name: report.species_name,
          description: report.description,
          photo_url,
          latitude: report.latitude,
          longitude: report.longitude,
          location_name: report.location_name,
        }),
      });
    })
  );

  const allOk = results.every((r) => r.status === 'fulfilled');
  if (allOk) {
    clearOfflineQueue();
  }
}
