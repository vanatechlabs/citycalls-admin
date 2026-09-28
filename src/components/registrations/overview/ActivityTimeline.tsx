import { CheckCheck, CirclePlus, PlayCircle } from 'lucide-react';
import type { Registration, RegistrationStatus } from '@/lib/hooks/useRegistrations';
import { STATUS_META } from '@/lib/registrations/constants';
import { formatDate, formatTime } from '@/lib/registrations/format';

const STEP_STYLE: Record<RegistrationStatus, { icon: typeof CirclePlus; dot: string; card: string; title: string }> = {
  PENDING: { icon: CirclePlus, dot: 'bg-orange-500', card: 'border-orange-200 bg-orange-50/50', title: 'Registered — Pending' },
  ACTIVE: { icon: PlayCircle, dot: 'bg-indigo-500', card: 'border-indigo-200 bg-indigo-50/50', title: 'Moved to Active' },
  COMPLETED: { icon: CheckCheck, dot: 'bg-[#3e8914]', card: 'border-green-200 bg-green-50/60', title: 'Completed' },
};

// Every stage move with its note, who did it and when — newest last.
export function ActivityTimeline({ registration }: { registration: Registration }) {
  const history = registration.statusHistory ?? [];
  const next = STATUS_META[registration.status].next;

  if (history.length === 0) {
    return <p className="text-xs italic text-slate-400">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative ml-3 space-y-4 border-l-2 border-slate-200 pl-6">
      {history.map((entry, i) => {
        const style = STEP_STYLE[entry.to];
        const Icon = style.icon;
        return (
          <li key={`${entry.to}-${entry.at}-${i}`} className="relative">
            <span className={`absolute -left-[35px] top-1 flex h-6 w-6 items-center justify-center rounded-full text-white ring-4 ring-white ${style.dot}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className={`border p-3 ${style.card}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] font-bold text-slate-800">{style.title}</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  <span className="font-bold text-[#4B1426]">{entry.by.name}</span> · {formatDate(entry.at)} {formatTime(entry.at)}
                </p>
              </div>
              {entry.note && <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">{entry.note}</p>}
            </div>
          </li>
        );
      })}
      {next && (
        <li className="relative">
          <span className="absolute -left-[33px] top-1 h-5 w-5 rounded-full border-2 border-dashed border-slate-300 bg-white" />
          <p className="pt-1 text-[11.5px] font-medium italic text-slate-400">Next: {next.action.toLowerCase()} (with a note).</p>
        </li>
      )}
    </ol>
  );
}
