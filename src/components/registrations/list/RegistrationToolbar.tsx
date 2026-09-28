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
  services: { id: string; name: string }[];
  shown: number;
  total: number;
  selectedCount: number;
  exporting: boolean;
  onExport: () => void;
  onBulkDelete: () => void;
}

const SELECT = 'h-9 cursor-pointer border border-white/20 bg-[#2f5a27] px-3 text-xs font-semibold text-white outline-none transition-colors focus:border-white';

// The dark-green bar on top of the Registration List table.
export function RegistrationToolbar({
  title, filters, onChange, services, shown, total, selectedCount, exporting, onExport, onBulkDelete,
}: RegistrationToolbarProps) {
  return (
    <div className="border-b bg-[#23471d] px-4 py-2.5">
      <div className="flex flex-col items-center justify-between gap-4 xl:flex-row">
        <div className="self-start xl:self-auto">
          <h2 className="text-lg font-semibold uppercase leading-tight text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-green-100">Showing {shown} of {total} registrations</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select value={filters.datePreset} onChange={(e) => onChange({ datePreset: e.target.value as DateRangePreset })} className={SELECT}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {filters.datePreset === 'custom' && (
            <div className="flex items-center gap-2 border border-white/20 bg-[#2f5a27] p-1 px-2">
              <input type="date" value={filters.customFrom} onChange={(e) => onChange({ customFrom: e.target.value })} className="h-7 cursor-pointer bg-white px-2 text-xs text-gray-900 outline-none" />
              <span className="text-xs font-medium text-green-100">to</span>
              <input type="date" value={filters.customTo} onChange={(e) => onChange({ customTo: e.target.value })} className="h-7 cursor-pointer bg-white px-2 text-xs text-gray-900 outline-none" />
            </div>
          )}

          <select value={filters.source} onChange={(e) => onChange({ source: e.target.value as ToolbarFilters['source'] })} className={SELECT}>
            <option value="">All Sources</option>
            <option value="ADMIN">Admin</option>
            <option value="WEBSITE">Website</option>
          </select>

          <select value={filters.serviceId} onChange={(e) => onChange({ serviceId: e.target.value })} className={`${SELECT} max-w-[200px]`}>
            <option value="">All Services</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, phone, reg no..."
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              className="h-9 w-full bg-white pl-9 pr-3 text-xs font-medium shadow-inner outline-none focus:ring-2 focus:ring-[#8cc63f]"
            />
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={exporting || total === 0}
            className="flex h-9 items-center gap-2 bg-[#4B1426] px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
            title="Export to Excel (CSV)"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onBulkDelete}
              className="flex h-9 items-center gap-1.5 bg-red-600 px-3.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
