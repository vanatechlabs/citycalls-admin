'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Edit, Search, Trash2, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { deleteSeoMeta, getSeoMetaList, pageName, SeoMeta } from '@/lib/demoSeoStore';

export default function MetaListPage() {
  const router = useRouter();
  // Lazy initializer — localStorage is only readable client-side, and this
  // page is a client component, so reading it here (once, per mount) is
  // safe without needing an effect.
  const [seoList, setSeoList] = useState<SeoMeta[]>(() => getSeoMetaList());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredList = useMemo(
    () =>
      seoList.filter(
        (item) =>
          item.page.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.metaTitle.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [seoList, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedList = filteredList.slice(startIndex, startIndex + PAGE_SIZE);

  const handleEdit = (row: SeoMeta) => {
    router.push(`/dashboard/seo/add-meta?editId=${encodeURIComponent(row.id)}`);
  };

  const handleDelete = async (row: SeoMeta) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `Delete SEO for page: <strong>${pageName(row.page)}</strong>?<br><span class="text-red-600">This cannot be undone!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    deleteSeoMeta(row.id);
    setSeoList(getSeoMetaList());
    void Swal.fire({ icon: 'success', title: 'Deleted!', text: 'SEO module deleted successfully', confirmButtonColor: '#3e8914', timer: 1500, showConfirmButton: false });
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">SEO Meta List</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage all SEO meta tags for the website.</p>
        </div>

        <div className="mt-[4px] flex min-h-0 flex-1 flex-col overflow-hidden bg-white border border-[#e8e5df]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-[#233D4D] px-6 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Search className="h-5 w-5 text-[#3e8914]" /> Meta Tags List
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-200">
                Showing {filteredList.length} of {seoList.length} entries
              </p>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search page..."
                className="h-9 w-full border-2 border-gray-300 pl-10 pr-4 text-sm shadow-lg outline-none focus:border-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                  <th className="px-[12px] py-[8px]">S.No</th>
                  <th className="px-[12px] py-[8px]">Page Name</th>
                  <th className="px-[12px] py-[8px]">Meta Title</th>
                  <th className="px-[12px] py-[8px]">Status</th>
                  <th className="px-[12px] py-[8px]">Last Updated By</th>
                  <th className="px-[12px] py-[8px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedList.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-[12px] text-[#6c7587]">No SEO meta entries found.</td></tr>
                ) : (
                  paginatedList.map((row, index) => (
                    <tr key={row.id} className="transition hover:bg-slate-50/80">
                      <td className="px-[12px] py-[8px] font-bold text-[#3e8914]">{startIndex + index + 1}</td>
                      <td className="px-[12px] py-[8px]">
                        <span className="block text-[12px] font-bold text-[#4B1426]">{pageName(row.page)}</span>
                        <span className="block text-[10px] text-gray-400">{row.page}</span>
                      </td>
                      <td className="max-w-[220px] truncate px-[12px] py-[8px] text-[11px] text-[#334155]" title={row.metaTitle}>
                        {row.metaTitle || '—'}
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <div className={`flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium ${
                          row.status === 'Active' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
                        }`}>
                          {row.status === 'Active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {row.status}
                        </div>
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <span className="block text-[11px] font-bold uppercase text-red-600">{row.updatedBy}</span>
                        <span className="block text-[10px] text-gray-500">{new Date(row.updatedAt).toLocaleString()}</span>
                      </td>
                      <td className="px-[12px] py-[8px] text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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
