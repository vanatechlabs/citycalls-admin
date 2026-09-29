import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock, PlayCircle, TicketPercent } from 'lucide-react';
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
    stageCard('PENDING', 'Waiting to be picked up', Clock, {
      iconBg: 'bg-orange-500', iconBorder: 'border-orange-500', bg: 'bg-gradient-to-br from-white from-50% to-orange-100', text: 'text-orange-600',
    }),
    stageCard('ACTIVE', 'Being worked on by the team', PlayCircle, {
      iconBg: 'bg-indigo-500', iconBorder: 'border-indigo-500', bg: 'bg-gradient-to-br from-white from-50% to-indigo-100', text: 'text-indigo-600',
    }),
    stageCard('COMPLETED', 'Service done and closed', CheckCircle2, {
      iconBg: 'bg-[#3e8914]', iconBorder: 'border-[#3e8914]', bg: 'bg-gradient-to-br from-white from-50% to-[#e8f5e9]', text: 'text-[#3e8914]',
    }),
    {
      key: 'today', title: 'Today Registration', desc: 'Registered today (all stages)', value: stats?.today ?? 0,
      icon: CalendarCheck, iconBg: 'bg-sky-500', iconBorder: 'border-sky-500', bg: 'bg-gradient-to-br from-white from-50% to-sky-100', text: 'text-sky-600',
      onClick: onTodayClick,
    },
    {
      key: 'coupon', title: 'Coupons Applied', desc: 'Registrations with an offer code', value: stats?.couponApplied ?? 0,
      icon: TicketPercent, iconBg: 'bg-[#4B1426]', iconBorder: 'border-[#4B1426]', bg: 'bg-gradient-to-br from-white from-50% to-rose-100', text: 'text-[#4B1426]',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const interactive = !!card.href || !!card.onClick;
        const className = `group relative block overflow-hidden rounded-2xl border-2 p-3 text-left shadow-sm transition-all duration-300 sm:p-4 ${card.bg} ${
          card.current ? `${card.iconBorder} ring-2 ring-offset-1 ring-gray-200` : 'border-gray-200'
        } ${interactive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : 'cursor-default'}`;

        const body = (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center border border-gray-200 shadow-sm transition-transform duration-300 group-hover:scale-105 ${card.iconBg}`}>
                  <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                </div>
                <p className="line-clamp-1 text-[11px] font-bold uppercase leading-tight tracking-wide text-gray-900">{card.title}</p>
              </div>
              <span className={`hidden shrink-0 border-2 bg-white/70 px-1.5 py-0.5 text-[10px] font-bold sm:block ${card.iconBorder} ${card.text}`}>
                {index + 1}
              </span>
            </div>
            <p className={`mb-1 text-xl font-extrabold leading-none ${card.text}`}>
              <CountUp value={card.value} />
            </p>
            <p className="text-xs font-medium text-black opacity-80">{card.desc}</p>
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
