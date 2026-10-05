'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Globe, Info, Server, ShieldAlert } from 'lucide-react';
import { usePermission } from '@/lib/hooks/useAuth';
import { ServerAssetType, useServerAssets } from '@/lib/hooks/useServerAssets';
import { formatDate } from '@/lib/registrations/format';
import { daysLeft, daysLeftLabel, expiryTone, shortCountdown, TONE_CLASSES, TYPE_LABEL } from '@/lib/serverAssets/expiry';
import { useNow } from '@/lib/serverAssets/useNow';

const TYPE_ICON: Record<ServerAssetType, typeof Globe> = { DOMAIN: Globe, HOSTING: Server, SSL: ShieldAlert, OTHER: Info };

// Badge colour = the most urgent record's colour.
const BADGE: Record<'green' | 'orange' | 'red', string> = {
  green: 'from-emerald-500 to-green-600',
  orange: 'from-amber-500 to-orange-600',
  red: 'from-rose-500 to-red-600',
};

// "https://citycalls.in/" → "citycalls.in"
const displayName = (name: string) => name.replace(/^https?:\/\//i, '').replace(/\/$/, '');

// Topbar server icon (like the bell): the badge shows how many domain /
// hosting records there are, coloured by the most urgent one. Clicking it
// opens the full list with live countdowns.
export function ServerExpiryChip({ buttonClass, iconClass }: { buttonClass: string; iconClass: string }) {
  const canView = usePermission('config', 'view');
  const { data: assets = [] } = useServerAssets({ enabled: canView });
  const now = useNow(1000);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!canView || assets.length === 0) return null;

  const ranked = assets
    .map((asset) => ({ asset, days: daysLeft(asset.expiresOn, now) }))
    .sort((a, b) => a.days - b.days);
  const worst = expiryTone(ranked[0].days);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative ${buttonClass}`}
        title="Domain & hosting renewals"
        aria-label="Domain and hosting renewals"
        aria-expanded={open}
      >
        <Server size={18} className={iconClass} />
        <span className={`absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r px-1 text-[10px] font-semibold text-white shadow-lg ${BADGE[worst]}`}>
          {assets.length}
        </span>
        {worst !== 'green' && <span className={`absolute -top-1 -right-1 h-5 w-5 animate-ping rounded-full opacity-40 ${TONE_CLASSES[worst].dot}`} />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-[12.5px] font-bold text-slate-800">Renewals</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">{assets.length}</span>
          </div>

          {/* One compact row per record: name + meta on the left, time left on the right */}
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {ranked.map(({ asset, days }) => {
              const tone = TONE_CLASSES[expiryTone(days)];
              const Icon = TYPE_ICON[asset.type];
              return (
                <li key={asset._id} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-slate-50">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${tone.badge}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-[12.5px] font-semibold leading-tight text-slate-900">{displayName(asset.name)}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
                      {TYPE_LABEL[asset.type]}{asset.provider ? ` · ${asset.provider}` : ''} · {formatDate(asset.expiresOn)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-mono text-[11px] font-bold ${tone.text}`}>{shortCountdown(asset.expiresOn, now)}</p>
                    <p className={`text-[9.5px] font-semibold uppercase tracking-wide ${tone.text} opacity-80`}>{daysLeftLabel(days)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href="/dashboard/server-management"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-slate-100 py-2 text-[11.5px] font-semibold text-[#233D4D] hover:bg-slate-50"
          >
            View all in Server Management <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
