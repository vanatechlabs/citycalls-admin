'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import {
  fetchRegistrationPage, useBulkDeleteRegistrations, useDeleteRegistration, useMarkRegistrationsViewed, useRegistrations,
  useRegistrationServices, useRegistrationStats, Registration, RegistrationFilters,
} from '@/lib/hooks/useRegistrations';
import {
  ALL_CATEGORIES, HELP_NOW_CALL_SERVICES, helpNowCallListPath, registrationListPath, STAGE_BY_SLUG, STAGE_TITLE, StageSlug,
} from '@/lib/registrations/constants';
import { downloadRegistrationsCsv } from '@/lib/registrations/exportCsv';
import { todayISO, toISODate } from '@/lib/registrations/format';
import { PageShell } from '../shared/PageShell';
import { useStageTransition } from '../shared/useStageTransition';
import { RegistrationStatsCards } from './RegistrationStatsCards';
import { RegistrationTable } from './RegistrationTable';
import { RegistrationFilterControls, RegistrationToolbar, ToolbarFilters } from './RegistrationToolbar';
import { TablePagination } from './TablePagination';

const PAGE_SIZE = 10;

const INITIAL_FILTERS: ToolbarFilters = {
  search: '', datePreset: 'all', customFrom: '', customTo: '', source: '', serviceId: '',
};

const STAGE_DESCRIPTION: Record<StageSlug, string> = {
  all: 'Every call in every status — change any status (with a note) straight from here.',
  new: 'Fresh calls nobody has worked on yet — move one to Active, Pending or Cancelled with a note.',
  active: 'Calls the team is working on — move to Pending, or close once the work is done.',
  pending: 'Calls on hold (call back, part awaited…) — move back to Active, or close when done.',
  reopen: 'Closed calls the customer came back about — move to Active / Pending or close again.',
  closed: 'Work done — reopen a call (with a note) if the customer comes back.',
  cancelled: 'New calls that were cancelled, with the reason noted.',
};

// Turns the toolbar's date preset into the API's from/to (YYYY-MM-DD).
function dateRange(filters: ToolbarFilters): { from?: string; to?: string } {
  const today = new Date();
  switch (filters.datePreset) {
    case 'today':
      return { from: todayISO(), to: todayISO() };
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { from: toISODate(start.toISOString()), to: todayISO() };
    }
    case 'month':
      return { from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString()), to: todayISO() };
    case 'custom':
      return { from: filters.customFrom || undefined, to: filters.customTo || undefined };
    default:
      return {};
  }
}

interface RegistrationListProps {
  // A Navbar List menu slug (e.g. "home-appliance") or "all" — or, with
  // helpNow, a Help Now service slug (e.g. "dish-washing") or "all".
  categorySlug: string;
  stageSlug: StageSlug;
  // Help Now Call Section: Help Now bookings only, one list per service.
  helpNow?: boolean;
}

// One component behind every /registrations/list/[category]/[stage] page,
// and every /help-now-calls/list/[service]/[stage] page.
export function RegistrationList({ categorySlug, stageSlug, helpNow = false }: RegistrationListProps) {
  const router = useRouter();
  const stage = STAGE_BY_SLUG[stageSlug];
  const [filters, setFilters] = useState<ToolbarFilters>(INITIAL_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const { changeStatus } = useStageTransition();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Registrations store the category by its menu name, so resolve the URL's
  // slug to the menu first — and hold the queries until that's known.
  const { data: menus = [], isLoading: menusLoading } = useRegistrationServices();
  const isAll = categorySlug === ALL_CATEGORIES;
  const menu = isAll || helpNow ? undefined : menus.find((m) => m.slug === categorySlug);
  const helpNowService = helpNow && !isAll ? HELP_NOW_CALL_SERVICES.find((s) => s.slug === categorySlug) : undefined;
  const categoryReady = isAll || (helpNow ? !!helpNowService : !!menu);
  const categoryName = helpNow
    ? (isAll ? 'All Help Now Calls' : helpNowService?.name ?? '')
    : (isAll ? 'All Categories' : menu?.name ?? '');
  const listPath = (stage: StageSlug) => (helpNow ? helpNowCallListPath(categorySlug, stage) : registrationListPath(categorySlug, stage));

  // Help Now calls are matched by service name (the service filter on "All"
  // carries the name too); City Calls' "All Categories" leaves them out.
  const apiFilters: RegistrationFilters = helpNow
    ? {
      q: debouncedSearch || undefined,
      source: filters.source || undefined,
      website: 'HELP_NOW',
      serviceName: helpNowService?.name ?? (filters.serviceId || undefined),
      ...dateRange(filters),
    }
    : {
      q: debouncedSearch || undefined,
      source: filters.source || undefined,
      serviceCategory: menu?.name,
      website: isAll ? 'CITY_CALLS' : undefined,
      serviceId: filters.serviceId || undefined,
      ...dateRange(filters),
    };

  const { data: list, isFetching } = useRegistrations({ ...apiFilters, status: stage, page, limit: PAGE_SIZE }, { enabled: categoryReady });
  const { data: stats } = useRegistrationStats(apiFilters, { enabled: categoryReady });
  const deleteRegistration = useDeleteRegistration();
  const bulkDelete = useBulkDeleteRegistrations();

  const rows = list?.items ?? [];
  const total = list?.total ?? 0;

  // Seeing a registration in the list counts as reading it: the unread rows
  // on screen are marked read, so the sidebar badges drop. Each id is sent once.
  const { mutate: markViewed } = useMarkRegistrationsViewed();
  const sentViewedIds = useRef(new Set<string>());
  const unreadIds = rows.filter((r) => !r.viewedAt).map((r) => r._id).join(',');
  useEffect(() => {
    const ids = unreadIds.split(',').filter((id) => id && !sentViewedIds.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => sentViewedIds.current.add(id));
    markViewed(ids);
  }, [unreadIds, markViewed]);
  const serviceOptions = helpNow
    ? (isAll ? HELP_NOW_CALL_SERVICES.map((s) => ({ id: s.name, name: s.name })) : [])
    : (menu ? [menu] : menus).flatMap((m) => m.services.map((s) => ({ id: s.id, name: s.name })));

  function changeFilters(patch: Partial<ToolbarFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    setSelectedIds([]);
  }

  async function handleChangeStatus(row: Registration) {
    const updated = await changeStatus(row);
    if (updated) setSelectedIds((ids) => ids.filter((id) => id !== row._id));
  }

  async function handleDelete(row: Registration) {
    const result = await Swal.fire({
      title: 'Delete this registration?',
      html: `<b>${row.registrationNo}</b><br/>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    deleteRegistration.mutate(row._id, {
      onSuccess: () => {
        setSelectedIds((ids) => ids.filter((id) => id !== row._id));
        void Swal.fire({ icon: 'success', title: 'Registration deleted', timer: 1400, showConfirmButton: false });
      },
      onError: () => void Swal.fire({ icon: 'error', title: 'Failed to delete registration' }),
    });
  }

  async function handleBulkDelete() {
    const result = await Swal.fire({
      title: 'Delete selected registrations?',
      text: `Are you sure you want to delete ${selectedIds.length} registration(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, delete ${selectedIds.length}`,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    bulkDelete.mutate(selectedIds, {
      onSuccess: ({ deleted }) => {
        setSelectedIds([]);
        void Swal.fire({ icon: 'success', title: `${deleted} registration(s) deleted`, timer: 1500, showConfirmButton: false });
      },
      onError: () => void Swal.fire({ icon: 'error', title: 'Failed to delete selected registrations' }),
    });
  }

  // Exports every row matching the current filters, not just this page.
  async function handleExport() {
    setExporting(true);
    try {
      const all: Registration[] = [];
      for (let p = 1; ; p++) {
        const result = await fetchRegistrationPage({ ...apiFilters, status: stage, page: p, limit: 100 });
        all.push(...result.items);
        if (all.length >= result.total || result.items.length === 0) break;
      }
      downloadRegistrationsCsv(all, `${helpNow ? 'helpnow_' : ''}${categorySlug}_${stageSlug}_registrations_${todayISO()}.csv`);
    } catch {
      void Swal.fire({ icon: 'error', title: 'Export failed' });
    } finally {
      setExporting(false);
    }
  }

  // A slug that isn't (or is no longer) a Navbar List menu / Help Now service.
  if ((helpNow || !menusLoading) && !categoryReady) {
    return (
      <PageShell
        title={helpNow ? 'Service not found' : 'Category not found'}
        description={helpNow ? `No Help Now service has the slug "${categorySlug}".` : `No active Navbar List menu has the slug "${categorySlug}".`}
      >
        <Link
          href={helpNow ? helpNowCallListPath(ALL_CATEGORIES, stageSlug) : registrationListPath(ALL_CATEGORIES, stageSlug)}
          className="w-fit bg-[#3e8914] px-4 py-2 text-xs font-bold text-white hover:bg-[#347311]"
        >
          {helpNow ? 'Open All Help Now Calls' : 'Open All Categories'}
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={<>{helpNow && !isAll && <span className="mr-1 text-[#b5730f]">Help Now ·</span>}{categoryName} <span className="ml-1 text-[#3e8914]">- {STAGE_TITLE[stageSlug]}</span></>}
      description={STAGE_DESCRIPTION[stageSlug]}
      actions={<RegistrationFilterControls filters={filters} onChange={changeFilters} services={serviceOptions} />}
    >
      <div className="space-y-8">
        <RegistrationStatsCards
          stats={stats}
          stage={stage}
          categorySlug={categorySlug}
          onTodayClick={() => changeFilters({ datePreset: 'today' })}
          listPathFor={listPath}
        />

        <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
          <RegistrationToolbar
            title={`${STAGE_TITLE[stageSlug]} List`}
            filters={filters}
            onChange={changeFilters}
            shown={rows.length}
            total={total}
            selectedCount={selectedIds.length}
            exporting={exporting}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
          />

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-800">
              <span>{selectedIds.length} registration(s) selected</span>
              <button type="button" onClick={() => setSelectedIds([])} className="font-bold text-red-700 hover:underline">Deselect All</button>
            </div>
          )}

          <RegistrationTable
            stage={stage}
            rows={rows}
            startIndex={(page - 1) * PAGE_SIZE}
            loading={isFetching || !categoryReady}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onView={(row) => router.push(`/dashboard/registrations/${row._id}`)}
            onEdit={helpNow ? undefined : (row) => router.push(`/dashboard/registrations/${row._id}/edit`)}
            showPayment={helpNow}
            onChangeStatus={handleChangeStatus}
            onDelete={handleDelete}
          />

          <div className="border-t border-gray-100 px-4 py-4">
            <TablePagination page={page} limit={PAGE_SIZE} total={total} label="registrations" onPageChange={setPage} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
