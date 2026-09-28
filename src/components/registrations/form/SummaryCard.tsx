import { Check, ClipboardList, ShieldCheck, X } from 'lucide-react';
import { CARD, CARD_TITLE, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../shared/styles';

interface SummaryCardProps {
  rows: [label: string, value: string][];
  isSaving: boolean;
  submitLabel: string;
  resetLabel: string;
  onReset: () => void;
}

export function SummaryCard({ rows, isSaving, submitLabel, resetLabel, onReset }: SummaryCardProps) {
  return (
    <section className={CARD}>
      <h2 className={`${CARD_TITLE} mb-3`}><ClipboardList className="h-4 w-4" /> Summary</h2>
      <dl className="space-y-2 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2 border-b border-gray-100 pb-1.5">
            <dt className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className="font-semibold text-gray-800">{value || '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center gap-1.5 text-[10px] font-medium text-blue-600">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Customer information is kept secure and never shared.
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onReset} disabled={isSaving} className={SECONDARY_BUTTON}>
          <X className="h-3.5 w-3.5" /> {resetLabel}
        </button>
        <button type="submit" disabled={isSaving} className={`${PRIMARY_BUTTON} flex-1`}>
          <Check className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </section>
  );
}
