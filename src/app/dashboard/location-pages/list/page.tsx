'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, MapPin, MapPinned, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

import { PageShell } from '@/components/registrations/shared/PageShell';
import { usePermission } from '@/lib/hooks/useAuth';
import { LocationPageListItem, LocationPageStatus, useDeleteLocationPage, useLocationPageList, useSaveLocationPage } from '@/lib/hooks/useLocationPages';
import { WEBSITE_ORIGIN } from '@/lib/hooks/useSeoMeta';
import { formatDate, formatTime } from '@/lib/registrations/format';

const PAGE_SIZE = 15;
const STATUS_STYLE: Record<LocationPageStatus, string> = {
  PUBLISHED: 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]',
  DRAFT: 'border border-[#ffe082] bg-[#fff8e1] text-[#b78103]',
};
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;
const ICON_BUTTON = 'flex h-[25px] w-[25px] items-center justify-center rounded-[6px] border backdrop-blur-md transition-all hover:scale-105 active:scale-95';

// Blog Section → Location Page List.
export default function LocationPageListPage() {
  const router = useRouter();
  const canEdit = usePermission('marketing', 'edit');
  const { data: pages = [], isLoading } = useLocationPageList();
  const savePage = useSaveLocationPage();
  const deletePage = useDeleteLocationPage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | LocationPageStatus>('');
  const [pageFilter, setPageFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);

  const pageNames = useMemo(() => [...new Set(pages.map((p) => p.serviceName))].sort(), [pages]);
  const cities = useMemo(() => [...new Set(pages.map((p) => p.location))].sort((a, b) => a.localeCompare(b)), [pages]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pages.filter(
      (p) =>
        (!statusFilter || p.status === statusFilter) &&
        (!pageFilter || p.serviceName === pageFilter) &&
        (!cityFilter || p.location === cityFilter) &&
        (!q || [p.title, p.slug, p.location, p.serviceName].some((v) => v.toLowerCase().includes(q)))
    );
  }, [pages, search, statusFilter, pageFilter, cityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const publishedCount = pages.filter((p) => p.status === 'PUBLISHED').length;

  const changeStatus = async (item: LocationPageListItem, status: LocationPageStatus) => {
    try {
      await savePage.mutateAsync({ id: item._id, status });
      void Swal.fire({ icon: 'success', title: status === 'PUBLISHED' ? 'Published' : 'Moved to Draft', timer: 1300, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not change status', confirmButtonColor: '#3e8914' });
    }
  };

  const remove = async (item: LocationPageListItem) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `Delete <strong>${item.title.replace(/</g, '&lt;')}</strong>?<br><span class="text-red-600">citycalls.in/${item.slug} will stop working.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    try {
      await deletePage.mutateAsync(item._id);
      void Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1300, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not delete page', confirmButtonColor: '#3e8914' });
    }
  };

  const filterSelect = 'h-9 max-w-[180px] border-2 border-gray-300 bg-white px-2 text-xs font-bold text-gray-800 outline-none';

  return (
    <PageShell
      title="Location Page List"
      description="City pages on citycalls.in for SEO — publish, edit or remove them."
      actions={
        canEdit && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/location-pages/add')}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#4B1426] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Location Page
          </button>
        )
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#e8e5df] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#233D4D] px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <MapPinned className="h-5 w-5 text-[#88be1e]" /> Location Pages
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-200">
              Showing {filtered.length} of {pages.length} pages · {publishedCount} live
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as '' | LocationPageStatus); setPage(1); }} className={filterSelect}>
              <option value="">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
            <select value={pageFilter} onChange={(e) => { setPageFilter(e.target.value); setPage(1); }} className={filterSelect}>
              <option value="">All Pages</option>
              {pageNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }} className={filterSelect}>
              <option value="">All Cities</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search title, city, URL..."
                className="h-9 w-full border-2 border-gray-300 pl-10 pr-3 text-sm outline-none focus:border-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                {['S.No', 'Page Title', 'Page', 'Location', 'Status', 'Created', 'Last Updated By'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-[12px] py-[8px]">{h}</th>
                ))}
                <th className="px-[12px] py-[8px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[12px] text-[#6c7587]">
                    {isLoading ? 'Loading location pages...' : pages.length === 0 ? 'No location pages yet — add the first one.' : 'No pages match these filters.'}
                  </td>
                </tr>
              ) : (
                rows.map((item, i) => (
                  <tr key={item._id} className="align-top transition hover:bg-slate-50/80">
                    <td className="px-[12px] py-[8px] font-bold text-[#3e8914]">{start + i + 1}</td>
                    <td className="max-w-[320px] px-[12px] py-[8px]">
                      <span className="line-clamp-2 text-[12px] font-bold text-[#4B1426]" title={item.title}>{item.title}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-blue-600" title={item.slug}>/{item.slug}</span>
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <span className="whitespace-nowrap rounded-[4px] border border-[#3e8914]/25 bg-[#3e8914]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#2f6b0f]">{item.serviceName}</span>
                      {item.menuName && <span className="mt-1 block text-[10px] font-medium text-gray-500">{item.menuName}</span>}
                    </td>
                    <td className="whitespace-nowrap px-[12px] py-[8px] text-[12px] font-semibold text-gray-800">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-[#3e8914]" /> {item.location}</span>
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <select
                        key={`${item._id}-${item.status}`}
                        value={item.status}
                        disabled={!canEdit}
                        onChange={(e) => void changeStatus(item, e.target.value as LocationPageStatus)}
                        className={`h-[24px] cursor-pointer appearance-none rounded-[4px] bg-[right_6px_center] bg-no-repeat px-[8px] pr-[22px] text-[11px] font-bold outline-none disabled:cursor-not-allowed ${STATUS_STYLE[item.status]}`}
                        style={{ backgroundImage: SELECT_ARROW }}
                        aria-label={`Status of ${item.title}`}
                      >
                        <option value="PUBLISHED" className="bg-white text-[#23714a]">PUBLISHED</option>
                        <option value="DRAFT" className="bg-white text-[#b78103]">DRAFT</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-[12px] py-[8px] text-[11px] font-semibold text-gray-700">{formatDate(item.createdAt)}</td>
                    <td className="px-[12px] py-[8px]">
                      <span className="block text-[11px] font-bold text-[#4B1426]">{item.updatedBy?.name ?? '—'}</span>
                      <span className="block whitespace-nowrap text-[10px] font-semibold text-gray-700">
                        {formatDate(item.updatedAt)}, <span className="font-medium text-blue-500">{formatTime(item.updatedAt)}</span>
                      </span>
                    </td>
                    <td className="px-[12px] py-[8px]">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'PUBLISHED' && (
                          <a href={`${WEBSITE_ORIGIN}/${item.slug}`} target="_blank" rel="noopener noreferrer" title="View on website" className={`${ICON_BUTTON} border-orange-400/30 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20`}>
                            <ExternalLink className="h-[12px] w-[12px]" />
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <button type="button" title="Edit Page" onClick={() => router.push(`/dashboard/location-pages/add?editId=${item._id}`)} className={`${ICON_BUTTON} border-blue-400/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20`}>
                              <Pencil className="h-[12px] w-[12px]" />
                            </button>
                            <button type="button" title="Delete Page" onClick={() => void remove(item)} className={`${ICON_BUTTON} border-red-400/30 bg-red-500/10 text-red-600 hover:bg-red-500/20`}>
                              <Trash2 className="h-[12px] w-[12px]" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
            <span className="font-semibold text-[#2563eb]">Total Pages: <strong className="font-bold text-[#1d4ed8]">{filtered.length}</strong></span>
            <div className="flex items-center gap-[4px]">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-bold ${p === safePage ? 'border-[#233D4D] bg-[#233D4D] text-white' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
