import type { ServerAssetType } from '@/lib/hooks/useServerAssets';

// Colour of an expiry: green while it's far off, orange as it gets close,
// red when it's about to lapse (or already has).
export const ORANGE_WITHIN_DAYS = 45;
export const RED_WITHIN_DAYS = 15;

export type ExpiryTone = 'green' | 'orange' | 'red';

const DAY_MS = 24 * 60 * 60 * 1000;

// Expiry is the end of that calendar day.
export function expiryMoment(expiresOn: string) {
  const d = new Date(expiresOn);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
}

export function daysLeft(expiresOn: string, now = Date.now()) {
  return Math.floor((expiryMoment(expiresOn) - now) / DAY_MS);
}

export function expiryTone(days: number): ExpiryTone {
  if (days <= RED_WITHIN_DAYS) return 'red';
  if (days <= ORANGE_WITHIN_DAYS) return 'orange';
  return 'green';
}

export const TONE_CLASSES: Record<ExpiryTone, { badge: string; chip: string; dot: string; text: string }> = {
  green: {
    badge: 'border-green-300 bg-green-50 text-green-700',
    chip: 'border-green-300 bg-green-50 text-green-800',
    dot: 'bg-green-500',
    text: 'text-green-700',
  },
  orange: {
    badge: 'border-orange-300 bg-orange-50 text-orange-700',
    chip: 'border-orange-300 bg-orange-50 text-orange-800',
    dot: 'bg-orange-500',
    text: 'text-orange-700',
  },
  red: {
    badge: 'border-red-300 bg-red-50 text-red-700',
    chip: 'border-red-300 bg-red-50 text-red-800',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
};

export const TYPE_LABEL: Record<ServerAssetType, string> = {
  DOMAIN: 'Domain',
  HOSTING: 'Hosting',
  SSL: 'SSL',
  OTHER: 'Other',
};

// "42 days left", "Expires today", "Expired 3 days ago"
export function daysLeftLabel(days: number) {
  if (days > 1) return `${days} days left`;
  if (days === 1) return '1 day left';
  if (days === 0) return 'Expires today';
  return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
}

// Live countdown text: "42d 05h 12m 09s" (or "Expired").
export function countdown(expiresOn: string, now = Date.now()) {
  let ms = expiryMoment(expiresOn) - now;
  if (ms <= 0) return 'Expired';
  const d = Math.floor(ms / DAY_MS);
  ms -= d * DAY_MS;
  const h = Math.floor(ms / 3_600_000);
  ms -= h * 3_600_000;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms - m * 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// Compact countdown for tight spots: "17d 11h", or "11h 07m 30s" on the last day.
export function shortCountdown(expiresOn: string, now = Date.now()) {
  let ms = expiryMoment(expiresOn) - now;
  if (ms <= 0) return 'Expired';
  const d = Math.floor(ms / DAY_MS);
  ms -= d * DAY_MS;
  const h = Math.floor(ms / 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}h`;
  ms -= h * 3_600_000;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms - m * 60_000) / 1000);
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}
