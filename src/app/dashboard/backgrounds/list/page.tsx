'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Image as ImageIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  BackgroundStatus, PageBackground, useDeletePageBackground, usePageBackgroundList, useSavePageBackground,
} from '@/lib/hooks/usePageBackgrounds';
import { WEBSITE_ORIGIN } from '@/lib/hooks/useSeoMeta';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';

const PAGE_SIZE = 10;

export default function BackgroundListPage() {
  const router = useRouter();
  const { data: backgrounds = [], isLoading } = usePageBackgroundList();
  const deleteBackground = useDeletePageBackground();
  const saveBackground = useSavePageBackground();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const filteredList = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return backgrounds.filter((item) =>
      [item.pageName, item.pagePath, item.heading, item.menuName ?? ''].some((v) => v.toLowerCase().includes(q))
    );
  }, [backgrounds, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedList = filteredList.slice(startIndex, startIndex + PAGE_SIZE);

  const handleStatusChange = async (row: PageBackground, status: BackgroundStatus) => {
    if (status === row.status) return;
    setTogglingId(row._id);
    try {
      await saveBackground.mutateAsync({ id: row._id, status });
      void Swal.fire({
        icon: 'success',
        title: status === 'ACTIVE' ? 'Activated' : 'Deactivated',
        text: status === 'ACTIVE' ? `${row.pageName} now shows this background.` : `${row.pageName} is back to its default hero.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not change status', confirmButtonColor: '#3e8914' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (row: PageBackground) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `Delete the background for page: <strong>${row.pageName}</strong>?<br><span class="text-red-600">The page will go back to its default hero.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteBackground.mutateAsync(row._id);
      void Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Background deleted successfully', confirmButtonColor: '#3e8914', timer: 1500, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not delete background', confirmButtonColor: '#3e8914' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        <div className="mb-[20px] flex flex-wrap items-end justify-between gap-3 border-b-[2px] border-[#293681] pb-[8px]">
          <div>
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">BG List</h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Hero background images and text of the website&apos;s service pages.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/backgrounds/add')}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#4B1426] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
          >
            <Plus className="h-3.5 w-3.5" /> Add BG Image
          </button>
        </div>

        <div className="mt-[4px] flex min-h-0 flex-1 flex-col overflow-hidden border border-[#e8e5df] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-[#233D4D] px-6 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <ImageIcon className="h-5 w-5 text-[#3e8914]" /> Background List
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-200">
                Showing {filteredList.length} of {backgrounds.length} entries
              </p>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search page name or URL..."
                className="h-9 w-full border-2 border-gray-300 pl-10 pr-4 text-sm shadow-lg outline-none focus:border-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                  <th className="px-[12px] py-[8px]">S.No</th>
                  <th className="px-[12px] py-[8px]">BG Image</th>
                  <th className="px-[12px] py-[8px]">Page Name</th>
                  <th className="px-[12px] py-[8px]">URL</th>
                  <th className="px-[12px] py-[8px]">Status</th>
                  <th className="px-[12px] py-[8px]">Last Updated By</th>
                  <th className="px-[12px] py-[8px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedList.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-[12px] text-[#6c7587]">{isLoading ? 'Loading backgrounds...' : 'No backgrounds found.'}</td></tr>
                ) : (
                  paginatedList.map((row, index) => (
                    <tr key={row._id} className="align-top transition hover:bg-slate-50/80">
                      <td className="px-[12px] py-[8px] font-bold text-[#3e8914]">{startIndex + index + 1}</td>
                      <td className="px-[12px] py-[8px]">
                        {row.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveMediaUrl(row.image)} alt={row.imageAlt || row.pageName} className="h-9 w-16 border border-gray-200 object-cover" />
                        ) : (
                          <div className="flex h-9 w-16 items-center justify-center border border-dashed border-gray-300 text-[8px] font-bold text-gray-400">No image</div>
                        )}
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <span className="block text-[12px] font-bold text-[#4B1426]">{row.pageName}</span>
                        {row.menuName && <span className="mt-0.5 block text-[10px] font-semibold text-blue-600">{row.menuName}</span>}
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <a
                          href={`${WEBSITE_ORIGIN}${row.pagePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-fit items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                          title="Open on the website"
                        >
                          {row.pagePath}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-[12px] py-[8px]">
                        {/* Same status dropdown as Staff & Team Members. */}
                        <select
                          key={`${row._id}-${row.status}`}
                          value={row.status}
                          disabled={togglingId === row._id}
                          onChange={(e) => void handleStatusChange(row, e.target.value as BackgroundStatus)}
                          aria-label={`Status of ${row.pageName}`}
                          className={`h-[24px] cursor-pointer appearance-none rounded-[4px] bg-[right_6px_center] bg-no-repeat px-[8px] pr-[22px] text-[11px] font-bold shadow-xs outline-none transition disabled:opacity-50 ${
                            row.status === 'ACTIVE'
                              ? 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]'
                              : 'border border-[#fca5a5] bg-[#fee2e2] text-[#dc2626]'
                          }`}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                          }}
                        >
                          <option value="ACTIVE" className="bg-white font-bold text-[#23714a]">ACTIVE</option>
                          <option value="INACTIVE" className="bg-white font-bold text-[#dc2626]">INACTIVE</option>
                        </select>
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <span className="block text-[11px] font-bold text-[#4B1426]">{row.updatedBy?.name ?? '—'}</span>
                        <span className="block whitespace-nowrap text-[10px] font-semibold text-gray-700">
                          {formatDate(row.updatedAt)}, <span className="font-medium text-blue-500">{formatTime(row.updatedAt)}</span>
                        </span>
                      </td>
                      <td className="px-[12px] py-[8px] text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/backgrounds/add?editId=${row._id}`)}
                            title="Edit Background"
                            className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] border border-blue-400/30 bg-blue-500/10 text-blue-600 shadow-[0_2px_6px_rgba(37,99,235,0.12)] backdrop-blur-md transition-all hover:scale-105 hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] active:scale-95"
                          >
                            <Pencil className="h-[12px] w-[12px] text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(row)}
                            title="Delete Background"
                            className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] border border-red-400/30 bg-red-500/10 text-red-600 shadow-[0_2px_6px_rgba(220,38,38,0.12)] backdrop-blur-md transition-all hover:scale-105 hover:border-red-400/50 hover:bg-red-500/20 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] active:scale-95"
                          >
                            <Trash2 className="h-[12px] w-[12px] text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredList.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
              <span className="font-semibold text-[#2563eb]">
                Total Entries: <strong className="font-bold text-[#1d4ed8]">{filteredList.length}</strong>
              </span>
              <div className="flex items-center gap-[4px]">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-bold transition ${
                      p === safePage ? 'border-[#233D4D] bg-[#233D4D] text-white shadow-xs' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
