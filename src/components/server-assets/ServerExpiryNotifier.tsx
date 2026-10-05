'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ArrowRight, CalendarClock, Globe, Info, Server, ShieldAlert, X } from 'lucide-react';
import { usePermission } from '@/lib/hooks/useAuth';
import { ServerAssetType, useServerAssets } from '@/lib/hooks/useServerAssets';
import { formatDate } from '@/lib/registrations/format';
import { countdown, daysLeft, daysLeftLabel, expiryTone, TONE_CLASSES, TYPE_LABEL } from '@/lib/serverAssets/expiry';
import { useNow } from '@/lib/serverAssets/useNow';
import { playAlarmTone, unlockNotificationTone } from '@/components/registrations/notifications/notificationTone';

const BELL_LOTTIE = 'https://lottie.host/14b92e16-04ec-4d1a-852e-eda372cb0e70/056TYgqNOY.lottie';
const STORAGE_KEY = 'server-expiry-dismissed';
const today = () => new Date().toISOString().slice(0, 10);

const TYPE_ICON: Record<ServerAssetType, typeof Globe> = { DOMAIN: Globe, HOSTING: Server, SSL: ShieldAlert, OTHER: Info };

// Halo behind the bell, by the most urgent item.
const HALO = {
  green: 'bg-green-100 ring-green-200',
  orange: 'bg-orange-100 ring-orange-200',
  red: 'bg-red-100 ring-red-200',
} as const;

// { assetId: "YYYY-MM-DD" it was dismissed } — a dismissed reminder comes
// back the next day until the item is renewed.
function readDismissed(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

// "https://citycalls.in/" → "citycalls.in"
const displayName = (name: string) => name.replace(/^https?:\/\//i, '').replace(/\/$/, '');

// SweetAlert-style dialog, once a day, listing every domain / hosting / SSL
// record inside its "remind before" window (or already expired) — with a
// bell animation and an alarm sound.
export function ServerExpiryNotifier() {
  const canView = usePermission('config', 'view');
  const { data: assets = [] } = useServerAssets({ enabled: canView });
  const now = useNow(1000);
  const [dismissed, setDismissed] = useState<Record<string, string>>(() => (typeof window === 'undefined' ? {} : readDismissed()));

  const due = canView
    ? assets
        .map((asset) => ({ asset, days: daysLeft(asset.expiresOn, now) }))
        .filter(({ asset, days }) => days <= (asset.reminderDays ?? 30) && dismissed[asset._id] !== today())
        .sort((a, b) => a.days - b.days)
    : [];
  const dueKey = due.map((x) => x.asset._id).join(',');
  const worst = due[0] ? expiryTone(due[0].days) : 'green';

  // Alarm once when the dialog appears. Browsers only allow sound after the
  // first click / key press, so if it's still locked it plays on that.
  useEffect(() => {
    if (!dueKey) return;
    if (playAlarmTone(worst === 'red')) return;
    const playOnFirstGesture = () => {
      unlockNotificationTone();
      setTimeout(() => playAlarmTone(worst === 'red'), 150);
    };
    window.addEventListener('pointerdown', playOnFirstGesture, { once: true });
    window.addEventListener('keydown', playOnFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', playOnFirstGesture);
      window.removeEventListener('keydown', playOnFirstGesture);
    };
  }, [dueKey, worst]);

  if (due.length === 0) return null;

  // Hides everything shown now until tomorrow.
  function dismissAll() {
    const next = { ...dismissed };
    due.forEach(({ asset }) => { next[asset._id] = today(); });
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode etc. — it simply shows again on the next load.
    }
  }

  const overdue = due.filter((x) => x.days < 0).length;
  const subtitle = overdue
    ? `${overdue} expired${due.length > overdue ? ` and ${due.length - overdue} expiring soon` : ''} — renew to avoid downtime.`
    : `${due.length} ${due.length === 1 ? 'item is' : 'items are'} expiring soon — renew before they lapse.`;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="renewal-title">
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <button type="button" onClick={dismissAll} className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-2 pt-7 text-center">
          <div className={`mx-auto h-24 w-24 rounded-full ring-8 ${HALO[worst]}`}>
            <DotLottieReact src={BELL_LOTTIE} loop autoplay />
          </div>
          <h2 id="renewal-title" className="mt-4 text-[22px] font-bold text-slate-800">Renewal Reminder</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <ul className="mx-6 mt-3 max-h-[280px] space-y-2 overflow-y-auto">
          {due.map(({ asset, days }) => {
            const tone = TONE_CLASSES[expiryTone(days)];
            const Icon = TYPE_ICON[asset.type];
            return (
              <li key={asset._id} className="flex gap-3 rounded-xl border border-slate-200 p-3 text-left">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${tone.dot}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                    <p className="break-all text-[14px] font-bold leading-snug text-slate-900">{displayName(asset.name)}</p>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10.5px] font-bold ${tone.badge}`}>{daysLeftLabel(days)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {TYPE_LABEL[asset.type]}{asset.provider ? ` · ${asset.provider}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <CalendarClock className="h-3 w-3" /> {formatDate(asset.expiresOn)}
                    </span>
                    <span className={`font-mono font-semibold ${tone.text}`}>{countdown(asset.expiresOn, now)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={dismissAll}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Remind me tomorrow
          </button>
          <Link
            href="/dashboard/server-management"
            onClick={dismissAll}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#233D4D] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a2e3a]"
          >
            Renew Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
