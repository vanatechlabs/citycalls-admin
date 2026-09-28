import Link from 'next/link';
import type { RegistrationStatus } from '@/lib/hooks/useRegistrations';
import { registrationListPath, STAGE_BY_SLUG, STAGE_SLUGS, STAGE_TAB_LABEL, StageSlug } from '@/lib/registrations/constants';

interface RegistrationStageTabsProps {
  categorySlug: string;
  active: StageSlug;
  counts?: Record<RegistrationStatus, number>;
}

// All | Pending | Active | Completed for the current category, with counts.
// Links (not local state) so each tab has its own URL, same as the sidebar.
export function RegistrationStageTabs({ categorySlug, active, counts }: RegistrationStageTabsProps) {
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;

  return (
    <div className="thin-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto border-2 border-gray-200 bg-gray-100/90 p-1">
      {STAGE_SLUGS.map((slug) => {
        const isActive = slug === active;
        const status = STAGE_BY_SLUG[slug];
        const count = status ? counts?.[status] ?? 0 : total;
        return (
          <Link
            key={slug}
            href={registrationListPath(categorySlug, slug)}
            className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-xs font-bold transition-all ${
              isActive ? 'bg-[#3e8914] text-white shadow-sm' : 'text-gray-700 hover:bg-white hover:text-gray-900'
            }`}
          >
            {STAGE_TAB_LABEL[slug]}
            <span className={`rounded-full px-1.5 text-[10px] font-extrabold ${isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
