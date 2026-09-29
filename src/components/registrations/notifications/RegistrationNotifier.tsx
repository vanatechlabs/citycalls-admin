'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ArrowRight, Globe, Layers, UserCog, Wrench, X } from 'lucide-react';

import { useUnreadRegistrations, UnreadRegistration, UnreadRegistrations } from '@/lib/hooks/useRegistrations';
import { formatTime } from '@/lib/registrations/format';
import { playNotificationTone, unlockNotificationTone } from './notificationTone';

const BELL_LOTTIE = 'https://lottie.host/14b92e16-04ec-4d1a-852e-eda372cb0e70/056TYgqNOY.lottie';
const AUTO_HIDE_MS = 15_000;
const MAX_VISIBLE = 3;

// Bottom-right popup (with sound) whenever a new registration arrives while
// the admin is open. Registrations already unread when the page loaded are
// shown by the sidebar badges instead, not announced again.
export function RegistrationNotifier() {
  const { data } = useUnreadRegistrations();
  const [lastData, setLastData] = useState<UnreadRegistrations | undefined>();
  const [knownIds, setKnownIds] = useState<Set<string> | null>(null);
  const [popups, setPopups] = useState<UnreadRegistration[]>([]);

  // Compare each poll with the ids already known (render-time state
  // adjustment, no effect): the first poll only seeds the set.
  if (data && data !== lastData) {
    setLastData(data);
    const ids = data.latest.map((r) => r._id);
    if (knownIds === null) {
      setKnownIds(new Set(ids));
    } else {
      const fresh = data.latest.filter((r) => !knownIds.has(r._id));
      if (fresh.length > 0) {
        setKnownIds(new Set([...knownIds, ...ids]));
        setPopups((current) => [...fresh, ...current]);
      }
    }
  }

  // Audio may only start after a user gesture — unlock on the first one.
  useEffect(() => {
    const unlock = () => unlockNotificationTone();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Chime once per batch of new registrations.
  const newestId = popups[0]?._id;
  useEffect(() => {
    if (newestId) playNotificationTone();
  }, [newestId]);

  // Stable, so each popup's auto-hide timer isn't reset by re-renders.
  const dismiss = useCallback((id: string) => setPopups((current) => current.filter((p) => p._id !== id)), []);

  if (popups.length === 0) return null;
  const visible = popups.slice(0, MAX_VISIBLE);
  const hidden = popups.length - visible.length;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[300] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-3" aria-live="polite">
      {visible.map((registration) => (
        <RegistrationPopup key={registration._id} registration={registration} onDismiss={dismiss} />
      ))}
      {hidden > 0 && (
        <Link
          href="/dashboard/registrations/list/all/pending"
          onClick={() => setPopups([])}
          className="pointer-events-auto self-end rounded-full bg-[#23471d] px-3 py-1 text-[11px] font-bold text-white shadow-lg hover:bg-[#1a3515]"
        >
          +{hidden} more new registration{hidden > 1 ? 's' : ''} →
        </Link>
      )}
    </div>
  );
}

function RegistrationPopup({ registration: r, onDismiss }: { registration: UnreadRegistration; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(r._id), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [onDismiss, r._id]);

  return (
    <div className="pointer-events-auto relative overflow-hidden rounded-xl border-2 border-[#3e8914]/30 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="flex gap-3 p-3 pr-8">
        <div className="h-16 w-16 shrink-0">
          <DotLottieReact src={BELL_LOTTIE} loop autoplay />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">New Registration</span>
            <span className="text-[10px] font-semibold text-gray-400">{formatTime(r.createdAt)}</span>
          </div>
          <p className="truncate text-[13px] font-bold text-[#111827]">{r.fullName}</p>
          <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-[#063B00]">
            <Wrench className="h-3 w-3 shrink-0 text-[#3e8914]" /> {r.serviceName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium text-gray-500">
            {r.serviceCategory && <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {r.serviceCategory}</span>}
            {r.source === 'WEBSITE' ? (
              <span className="flex items-center gap-1 font-bold text-purple-600"><Globe className="h-3 w-3" /> From Website</span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-orange-600">
                <UserCog className="h-3 w-3" /> From Admin{r.createdBy?.name ? ` · ${r.createdBy.name}` : ''}
              </span>
            )}
            <span className="font-mono font-bold text-[#14532d]">{r.registrationNo}</span>
          </div>
          <Link
            href={`/dashboard/registrations/${r._id}`}
            onClick={() => onDismiss(r._id)}
            className="mt-2 inline-flex items-center gap-1 rounded-[6px] bg-[#3e8914] px-3 py-1 text-[11px] font-bold text-white transition-colors hover:bg-[#347311]"
          >
            View Registration <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      <button type="button" onClick={() => onDismiss(r._id)} className="absolute right-2 top-2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
      {/* Time left before it auto-hides */}
      <div className="h-1 w-full bg-[#3e8914]/10">
        <div className="h-full bg-[#3e8914]" style={{ animation: `registration-popup-timer ${AUTO_HIDE_MS}ms linear forwards` }} />
      </div>
      <style>{'@keyframes registration-popup-timer { from { width: 100%; } to { width: 0%; } }'}</style>
    </div>
  );
}
