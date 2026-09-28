'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, FilePlus2, Pencil } from 'lucide-react';
import { useServicePageOptions } from '@/lib/hooks/useWebsitePages';

// Public CityCalls website that renders these pages at /services/<slug>.
const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://citycalls.in').replace(/\/$/, '');
const PAGE_SIZE = 10;

interface PageRow {
  serviceId: string;
  serviceName: string;
  menuName: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function PageListPage() {
  const { data: menus, isLoading } = useServicePageOptions();
  const [page, setPage] = useState(1);

  // One row per navbar service that already has a page created for it.
  const rows = useMemo<PageRow[]>(
    () =>
      (menus ?? []).flatMap((menu) =>
        menu.services
          .filter((service) => service.page)
          .map((service) => ({
            serviceId: service.id,
            serviceName: service.name,
            menuName: menu.name,
            slug: service.page!.slug,
            status: service.page!.status,
          })),
      ),
    [menus],
  );

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = rows.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        {/* TOP HEADING — matching Staff & Team Members */}
        <div className="mb-[20px] flex shrink-0 items-center justify-between border-b-[2px] border-[#293681] pb-[8px]">
          <div>
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Page List</h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
              All website service pages created from navbar links.
            </p>
          </div>

          <Link
            href="/dashboard/pages/add"
            className="flex h-[30px] items-center justify-center gap-[5px] rounded-[6px] bg-[#4B1426] px-[14px] text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] transition hover:bg-[#3a0f1d]"
          >
            <FilePlus2 className="h-[12px] w-[12px]" strokeWidth={1.7} />
            Add Page
          </Link>
        </div>

        {/* PAGES TABLE — same table style as Staff & Team Members */}
        <div className="mt-[4px] flex min-h-0 flex-1 flex-col overflow-hidden border border-[#e8e5df] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="h-[32px] border-b border-[#e8e5df] bg-[#233D4D]">
                  <th className="px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wider text-white">S.No</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wider text-white">Page Name</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wider text-white">Menu</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wider text-white">Slug</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wider text-white">Website Link</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wider text-white">Status</th>
                  <th className="px-[12px] py-[6px] text-right text-[12px] font-bold uppercase tracking-wider text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0ec]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[12px] text-[#6c7587]">Loading pages...</td>
                  </tr>
                ) : total === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[12px] text-[#6c7587]">
                      No pages created yet.{' '}
                      <Link href="/dashboard/pages/add" className="font-semibold text-blue-600 hover:underline">
                        Add your first page
                      </Link>
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, index) => {
                    const path = `/services/${row.slug}`;
                    return (
                      <tr key={row.serviceId} className="transition hover:bg-slate-50/80">
                        <td className="px-[12px] py-[8px] text-[11px] font-semibold text-[#293681]">#{startIndex + index + 1}</td>
                        <td className="px-[12px] py-[8px] text-[12px] font-semibold text-[#4B1426]">{row.serviceName}</td>
                        <td className="px-[12px] py-[8px] text-[11px] font-semibold text-[#293681]">{row.menuName}</td>
                        <td className="px-[12px] py-[8px] text-[11px] font-medium text-[#334155]">{row.slug}</td>
                        <td className="px-[12px] py-[8px]">
                          <a
                            href={`${WEBSITE_URL}${path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Open ${WEBSITE_URL}${path}`}
                            className="group inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                          >
                            <span>{path}</span>
                            <ExternalLink className="h-[10px] w-[10px] opacity-60 transition group-hover:opacity-100" />
                          </a>
                        </td>
                        <td className="px-[12px] py-[8px]">
                          <span
                            className={`inline-flex h-[24px] items-center rounded-[4px] px-[8px] text-[11px] font-bold shadow-xs ${
                              row.status === 'ACTIVE'
                                ? 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]'
                                : 'border border-[#fca5a5] bg-[#fee2e2] text-[#dc2626]'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-[12px] py-[8px] text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/dashboard/pages/add?serviceId=${row.serviceId}`}
                              title="Edit Page"
                              className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] border border-blue-400/30 bg-blue-500/10 text-blue-600 shadow-[0_2px_6px_rgba(37,99,235,0.12)] backdrop-blur-md transition-all hover:scale-105 hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] active:scale-95"
                            >
                              <Pencil className="h-[12px] w-[12px] text-blue-600" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION — matching Staff & Team Members */}
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#2563eb]">
                  Total Pages: <strong className="font-bold text-[#1d4ed8]">{total}</strong>
                </span>
                <span className="text-[11px] text-[#8a92a0]">
                  (Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, total)} of {total})
                </span>
              </div>

              <div className="flex items-center gap-[4px]">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
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
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
