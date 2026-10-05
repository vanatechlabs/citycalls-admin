import { Download, Search, Trash2 } from 'lucide-react';

export type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export interface ToolbarFilters {
  search: string;
  datePreset: DateRangePreset;
  customFrom: string;
  customTo: string;
  source: '' | 'ADMIN' | 'WEBSITE';
  // Lists the current category's services (all services on "All Categories").
  serviceId: string;
}

interface RegistrationToolbarProps {
  title: string;
  filters: ToolbarFilters;
  onChange: (patch: Partial<ToolbarFilters>) => void;
  shown: number;
  total: number;
  selectedCount: number;
  exporting: boolean;
  onExport: () => void;
  onBulkDelete: () => void;
}

const FILTER_SELECT = 'h-8 cursor-pointer border-2 border-gray-300 bg-white px-2 text-[11px] font-bold text-gray-800 outline-none transition-colors hover:border-[#3e8914]/50 focus:border-[#3e8914]';

// Date / source / service filters — shown in the page header above the list.
export function RegistrationFilterControls({ filters, onChange, services }: {
  filters: ToolbarFilters;
  onChange: (patch: Partial<ToolbarFilters>) => void;
  services: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select value={filters.datePreset} onChange={(e) => onChange({ datePreset: e.target.value as DateRangePreset })} className={FILTER_SELECT}>
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="custom">Custom Range</option>
      </select>

      {filters.datePreset === 'custom' && (
        <div className="flex h-8 items-center gap-1.5 border-2 border-gray-300 bg-white px-1.5">
          <input type="date" value={filters.customFrom} onChange={(e) => onChange({ customFrom: e.target.value })} className="h-6 cursor-pointer px-1 text-[11px] text-gray-900 outline-none" />
          <span className="text-[11px] font-medium text-gray-500">to</span>
          <input type="date" value={filters.customTo} onChange={(e) => onChange({ customTo: e.target.value })} className="h-6 cursor-pointer px-1 text-[11px] text-gray-900 outline-none" />
        </div>
      )}

      <select value={filters.source} onChange={(e) => onChange({ source: e.target.value as ToolbarFilters['source'] })} className={FILTER_SELECT}>
        <option value="">All Sources</option>
        <option value="ADMIN">Admin</option>
        <option value="WEBSITE">Website</option>
      </select>

      <select value={filters.serviceId} onChange={(e) => onChange({ serviceId: e.target.value })} className={`${FILTER_SELECT} max-w-[190px]`}>
        <option value="">All Services</option>
        {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}

// The dark-green bar on top of the Registration List table.
export function RegistrationToolbar({
  title, filters, onChange, shown, total, selectedCount, exporting, onExport, onBulkDelete,
}: RegistrationToolbarProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-3 py-1.5">
      <div className="flex flex-col items-center justify-between gap-2 xl:flex-row">
        <div className="self-start xl:self-auto">
          <h2 className="text-[13px] font-semibold uppercase leading-tight text-[#233D4D]">{title}</h2>
          <p className="text-[10.5px] text-black">Showing {shown} of {total} registrations</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, phone, reg no..."
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className="h-7 w-full border border-gray-300 bg-white pl-8 pr-2 text-[11px] font-medium outline-none focus:border-[#233D4D] focus:ring-1 focus:ring-[#233D4D]/30"
            />
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={exporting || total === 0}
            className="flex h-7 items-center gap-1.5 bg-[#4B1426] px-3 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
            title="Export to Excel (CSV)"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onBulkDelete}
              className="flex h-7 items-center gap-1.5 bg-red-600 px-2.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
