const STORAGE_KEY = 'doormeen-recent-queues';
const MAX_RECENT_QUEUES = 10;

export type RecentQueue = {
  id: string;
  name: string;
  visitedAt: number;
};

export function getRecentQueues(): RecentQueue[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is RecentQueue =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.visitedAt === 'number'
    ).slice(0, MAX_RECENT_QUEUES);
  } catch {
    return [];
  }
}

export function saveRecentQueue(id: string, name: string) {
  try {
    const queueId = id.trim();
    if (!queueId) return;

    const updated: RecentQueue[] = [
      { id: queueId, name: name.trim() || queueId, visitedAt: Date.now() },
      ...getRecentQueues().filter((queue) => queue.id !== queueId),
    ].slice(0, MAX_RECENT_QUEUES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Recent queues are a convenience; storage failures should not affect navigation.
  }
}

export function removeRecentQueue(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getRecentQueues().filter((queue) => queue.id !== id)));
  } catch {
    // Recent queues are a convenience; storage failures should not affect navigation.
  }
}

export function formatLastVisited(timestamp: number, language: string) {
  const locale = language === 'ar' ? 'ar-PS' : 'en';
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const elapsedMinutes = Math.floor((Date.now() - timestamp) / 60_000);

  if (elapsedMinutes < 1) return relative.format(0, 'minute');
  if (elapsedMinutes < 60) return relative.format(-elapsedMinutes, 'minute');

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return relative.format(-elapsedHours, 'hour');

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return relative.format(-elapsedDays, 'day');
  return new Date(timestamp).toLocaleDateString(locale);
}
