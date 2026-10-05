import type { RegistrationStatus } from '@/lib/hooks/useRegistrations';
import { STATUS_META } from '@/lib/registrations/constants';

export function StatusBadge({ status, size = 'sm' }: { status: RegistrationStatus; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-[5px] border font-bold ${meta.badge} ${
        size === 'md' ? 'px-2.5 py-1 text-[12px]' : 'px-1.5 py-0.5 text-[9.5px]'
      }`}
    >
      {meta.label}
    </span>
  );
}

export function SourceBadge({ source }: { source: 'ADMIN' | 'WEBSITE' }) {
  return (
    <span
      className="inline-flex items-center rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[8.5px] font-bold leading-tight text-purple-600"
    >
      {source === 'WEBSITE' ? 'WEBSITE' : 'ADMIN'}
    </span>
  );
}
