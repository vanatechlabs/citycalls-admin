import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, CirclePlus, Clock, PlayCircle, RotateCcw, XCircle } from 'lucide-react';
import type { RegistrationStats, RegistrationStatus } from '@/lib/hooks/useRegistrations';
import { registrationListPath, stageSlugOf, STATUS_META } from '@/lib/registrations/constants';

// Counts up from 0 to `value` — same feel as the Arogya admin's CountUp.
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}

interface StatCard {
  key: string;
  title: string;
  desc: string;
  value: number;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  iconBg: string;
  iconBorder: string;
  bg: string;
  text: string;
  // Stage cards link to their own list page.
  href?: string;
  current?: boolean;
  onClick?: () => void;
}

interface RegistrationStatsCardsProps {
  stats?: RegistrationStats;
  // undefined on the "All" stage page.
  stage?: RegistrationStatus;
  categorySlug: string;
  onTodayClick: () => void;
}

export function RegistrationStatsCards({ stats, stage, categorySlug, onTodayClick }: RegistrationStatsCardsProps) {
  const by = stats?.byStatus;
  const stageCard = (status: RegistrationStatus, desc: string, icon: StatCard['icon'], colors: Pick<StatCard, 'iconBg' | 'iconBorder' | 'bg' | 'text'>): StatCard => ({
    key: status,
    title: STATUS_META[status].listTitle,
    desc,
    value: by?.[status] ?? 0,
    icon,
    href: registrationListPath(categorySlug, stageSlugOf(status)),
    current: stage === status,
    ...colors,
  });

  const cards: StatCard[] = [
    stageCard('NEW', 'Fresh calls, not worked on yet', CirclePlus, {
      iconBg: 'bg-sky-500', iconBorder: 'border-sky-500', bg: 'bg-gradient-to-br from-white from-50% to-sky-100', text: 'text-sky-600',
    }),
    stageCard('ACTIVE', 'Being worked on by the team', PlayCircle, {
      iconBg: 'bg-indigo-500', iconBorder: 'border-indigo-500', bg: 'bg-gradient-to-br from-white from-50% to-indigo-100', text: 'text-indigo-600',
    }),
    stageCard('PENDING', 'On hold — call back / part awaited', Clock, {
      iconBg: 'bg-orange-500', iconBorder: 'border-orange-500', bg: 'bg-gradient-to-br from-white from-50% to-orange-100', text: 'text-orange-600',
    }),
    stageCard('REOPENED', 'Closed calls the customer came back on', RotateCcw, {
      iconBg: 'bg-purple-500', iconBorder: 'border-purple-500', bg: 'bg-gradient-to-br from-white from-50% to-purple-100', text: 'text-purple-600',
    }),
    stageCard('CLOSED', 'Work done', CheckCircle2, {
      iconBg: 'bg-[#3e8914]', iconBorder: 'border-[#3e8914]', bg: 'bg-gradient-to-br from-white from-50% to-[#e8f5e9]', text: 'text-[#3e8914]',
    }),
    stageCard('CANCELLED', 'Cancelled new calls', XCircle, {
      iconBg: 'bg-red-500', iconBorder: 'border-red-500', bg: 'bg-gradient-to-br from-white from-50% to-red-100', text: 'text-red-600',
    }),
    {
      key: 'today', title: 'Today Calls', desc: 'Received today (all statuses)', value: stats?.today ?? 0,
      icon: CalendarCheck, iconBg: 'bg-sky-500', iconBorder: 'border-sky-500', bg: 'bg-gradient-to-br from-white from-50% to-sky-100', text: 'text-sky-600',
      onClick: onTodayClick,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => {
        const Icon = card.icon;
        const interactive = !!card.href || !!card.onClick;
        const className = `group relative block overflow-hidden rounded-xl border-2 px-2.5 py-2 text-left shadow-sm transition-all duration-300 ${card.bg} ${
          card.current ? `${card.iconBorder} ring-2 ring-offset-1 ring-gray-200` : 'border-gray-200'
        } ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'}`;

        const body = (
          <>
            <div className="mb-1.5 flex items-center gap-1.5">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center border border-gray-200 shadow-sm transition-transform duration-300 group-hover:scale-105 ${card.iconBg}`}>
                <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
              <p className="line-clamp-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-gray-900">{card.title}</p>
            </div>
            <p className={`text-lg font-extrabold leading-none ${card.text}`}>
              <CountUp value={card.value} />
            </p>
            <p className="mt-1 line-clamp-1 text-[10px] font-medium text-black opacity-70" title={card.desc}>{card.desc}</p>
          </>
        );

        if (card.href) {
          return <Link key={card.key} href={card.href} className={className}>{body}</Link>;
        }
        return (
          <button key={card.key} type="button" disabled={!card.onClick} onClick={card.onClick} className={className}>
            {body}
          </button>
        );
      })}
    </div>
  );
}
