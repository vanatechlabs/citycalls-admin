'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Crown, Eye, Loader2, MessageSquareText, Repeat2, Search, Trash2,
  UserRoundPlus, UsersRound, Wrench, X, type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import { PageShell } from '@/components/registrations/shared/PageShell';
import { usePermission } from '@/lib/hooks/useAuth';
import {
  CUSTOMER_KIND_META, CustomerDateField, CustomerListItem, CustomerSummary, customerProfilePath, useCustomerList, useCustomerSummary,
  useDebouncedValue, useDeleteCustomer,
} from '@/lib/hooks/useCustomerProfiles';
import { formatDate } from '@/lib/registrations/format';

type Sort = 'recent' | 'oldest' | 'name';
const PAGE_SIZE = 20;
const ICON_BUTTON = 'flex h-[24px] w-[24px] items-center justify-center rounded-[6px] border transition-all hover:scale-105 active:scale-95';

// Same card style as Pages Section → Testimonials (white → tint, round icon),
// kept short: the link sits beside the number instead of under it.
const SUMMARY_CARDS: { key: keyof CustomerSummary; title: string; icon: LucideIcon; tint: string; border: string; num: string; ring: string; footer: string }[] = [
  { key: 'total', title: 'TOTAL CUSTOMERS', icon: UsersRound, tint: '#e2e8f0', border: '#e2e8f0', num: '#334155', ring: 'text-slate-600 ring-slate-200', footer: 'View all' },
  { key: 'newThisMonth', title: 'NEW THIS MONTH', icon: UserRoundPlus, tint: '#bfdbfe', border: '#bfdbfe', num: '#1d4ed8', ring: 'text-blue-600 ring-blue-200', footer: 'View' },
  { key: 'withService', title: 'TOOK A SERVICE', icon: Wrench, tint: '#bbf7d0', border: '#bbf7d0', num: '#15803d', ring: 'text-green-700 ring-green-200', footer: '1+ calls' },
  { key: 'repeat', title: 'REPEAT CUSTOMERS', icon: Repeat2, tint: '#fed7aa', border: '#fed7aa', num: '#c2410c', ring: 'text-orange-600 ring-orange-200', footer: '2+ calls' },
  { key: 'loyal', title: 'LOYAL CUSTOMERS', icon: Crown, tint: '#fde68a', border: '#fde68a', num: '#b45309', ring: 'text-amber-600 ring-amber-200', footer: '5+ calls' },
  { key: 'enquiryOnly', title: 'ENQUIRY ONLY', icon: MessageSquareText, tint: '#fecdd3', border: '#fecdd3', num: '#be123c', ring: 'text-rose-600 ring-rose-200', footer: 'No service yet' },
];

// Today / first of this month as "YYYY-MM-DD" in India time.
function indiaDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

// Customer Section → All Customers: everyone who booked a service or
// enquired, one row per mobile number, newest activity first.
function AllCustomersInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const canCreate = usePermission('customers', 'create');
  const canDelete = usePermission('customers', 'edit');
  const deleteCustomer = useDeleteCustomer();

  const [text, setText] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) || 'recent');
  const [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1));
  // Custom date range, on last activity or "customer since".
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');
  const [dateField, setDateField] = useState<CustomerDateField>(params.get('by') === 'since' ? 'firstSeenAt' : 'lastSeenAt');
  const q = useDebouncedValue(text.trim(), 350);
  const rangeValid = !from || !to || from <= to;
  const hasRange = !!(from || to) && rangeValid;

  // Keep the search in the URL so a refresh / back button keeps it.
  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (sort !== 'recent') next.set('sort', sort);
    if (page > 1) next.set('page', String(page));
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if ((from || to) && dateField === 'firstSeenAt') next.set('by', 'since');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [q, sort, page, from, to, dateField, pathname, router]);

  const { data: summary } = useCustomerSummary();
  const { data, isLoading, isFetching, isError } = useCustomerList({
    q: q || undefined, page, limit: PAGE_SIZE, sort,
    ...(hasRange ? { from: from || undefined, to: to || undefined, dateField } : {}),
  });

  const clearDates = () => { setFrom(''); setTo(''); setPage(1); };
  // Card links: "View all" clears the filters, "New This Month" shows them.
  const cardAction: Partial<Record<keyof CustomerSummary, () => void>> = {
    total: () => { setText(''); clearDates(); setDateField('lastSeenAt'); },
    newThisMonth: () => { setDateField('firstSeenAt'); setFrom(`${indiaDay().slice(0, 8)}01`); setTo(indiaDay()); setPage(1); },
  };
  const items = data?.items ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const start = (page - 1) * PAGE_SIZE;

  const remove = async (c: CustomerListItem) => {
    const result = await Swal.fire({
      title: 'Delete this customer?',
      html: `<b>${c.name.replace(/</g, '&lt;')}</b> (${c.customerCode}) will be removed from All Customers and the search.<br><span class="text-[13px] text-gray-500">Their service calls and enquiries are kept. If they call or book again, they come back.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCustomer.mutateAsync(c.customerCode);
      void Swal.fire({ icon: 'success', title: 'Customer deleted', timer: 1300, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not delete the customer', confirmButtonColor: '#3e8914' });
    }
  };

  // Pages around the current one: 1 … 4 5 [6] 7 8 … 20
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <PageShell
      title="All Customers"
      description="Every customer who booked a service or enquired — open a profile to see their full history."
      actions={
        canCreate && (
          <Link
            href="/dashboard/call-enquiries/add"
            className="flex items-center gap-1.5 rounded-[6px] bg-[#4B1426] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
          >
            <UserRoundPlus className="h-3.5 w-3.5" /> New Customer Enquiry
          </Link>
        )
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          const action = cardAction[card.key];
          return (
            <div
              key={card.key}
              className="flex items-center gap-2 overflow-hidden rounded-[10px] border px-2.5 py-2 transition-all hover:-translate-y-px"
              style={{
                background: `linear-gradient(135deg, #ffffff 0%, #ffffff 42%, ${card.tint} 100%)`,
                borderColor: card.border,
                boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px',
              }}
            >
              <div className={`grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-white/80 shadow-xs ring-1 ${card.ring}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold tracking-[0.01em] text-slate-900">{card.title}</p>
                <div className="mt-0.5 flex items-end justify-between gap-1">
                  <span className="text-[18px] font-semibold leading-none tracking-[-0.04em]" style={{ color: card.num }}>
                    {summary ? summary[card.key].toLocaleString('en-IN') : '—'}
                  </span>
                  {action ? (
                    <button type="button" onClick={action} className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[#293957] transition hover:text-blue-600">
                      {card.footer} <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  ) : (
                    <span className="shrink-0 truncate text-[10px] font-semibold text-slate-500">{card.footer}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#e8e5df] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#233D4D] px-4 py-1.5">
          <div>
            <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-white">
              <UsersRound className="h-4 w-4 text-[#88be1e]" /> Customers
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />}
            </h2>
            <p className="text-[10px] leading-tight text-slate-200">
              {meta ? `${meta.total.toLocaleString('en-IN')} customer${meta.total === 1 ? '' : 's'}${q ? ` matching “${q}”` : ''}${hasRange ? ` · ${dateField === 'firstSeenAt' ? 'joined' : 'active'} ${from ? formatDate(from) : '…'} – ${to ? formatDate(to) : '…'}` : ''}` : 'Loading…'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Custom date range */}
            <div className={`flex h-7 items-center gap-1 border-2 bg-white px-1.5 ${rangeValid ? 'border-gray-300' : 'border-red-400'}`} title={rangeValid ? undefined : 'From date must be before the To date'}>
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#3e8914]" />
              <select
                value={dateField}
                onChange={(e) => { setDateField(e.target.value as CustomerDateField); setPage(1); }}
                className="bg-transparent text-[10.5px] font-bold text-gray-700 outline-none"
                aria-label="Date is"
              >
                <option value="lastSeenAt">Last activity</option>
                <option value="firstSeenAt">Customer since</option>
              </select>
              <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" className="w-[108px] bg-transparent text-[11px] font-semibold text-gray-800 outline-none" />
              <span className="text-[10px] font-bold text-gray-400">to</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" className="w-[108px] bg-transparent text-[11px] font-semibold text-gray-800 outline-none" />
              {(from || to) && (
                <button type="button" onClick={clearDates} className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Clear dates">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }}
              className="h-7 border-2 border-gray-300 bg-white px-1.5 text-[11px] font-bold text-gray-800 outline-none"
              aria-label="Sort customers"
            >
              <option value="recent">Latest activity</option>
              <option value="oldest">Oldest customers</option>
              <option value="name">Name A–Z</option>
            </select>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={text}
                onChange={(e) => { setText(e.target.value.slice(0, 100)); setPage(1); }}
                placeholder="Mobile, name, email, CC ID, Reg No, city..."
                className="h-7 w-full border-2 border-gray-300 bg-white pl-8 pr-2 text-[12px] text-gray-800 outline-none focus:border-[#88be1e]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-[#233D4D] text-[10px] font-bold uppercase tracking-wider text-white">
                {['S.No', 'Customer', 'Mobile', 'Email', 'City', 'Type', 'Services', 'Reopens', 'Call Enq.', 'Web Enq.', 'Last Activity', 'Since'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-[8px] py-[6px]">{h}</th>
                ))}
                <th className="px-[8px] py-[6px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-[11.5px] text-[#6c7587]">
                    {isLoading ? 'Loading customers...' : isError ? 'Could not load customers — please refresh.' : q || hasRange ? 'No customer matches these filters.' : 'No customers yet.'}
                  </td>
                </tr>
              ) : (
                items.map((c, i) => {
                  const kind = CUSTOMER_KIND_META[c.kind];
                  const href = customerProfilePath(c.customerCode);
                  const count = (n: number, warn = false) => (
                    <span className={`font-bold ${n ? (warn ? 'text-red-600' : 'text-slate-900') : 'text-slate-300'}`}>{n}</span>
                  );
                  return (
                    <tr key={c._id} onClick={() => router.push(href)} className="cursor-pointer text-[11px] transition hover:bg-slate-50/80">
                      <td className="px-[8px] py-[5px] font-bold text-[#3e8914]">{start + i + 1}</td>
                      <td className="max-w-[190px] px-[8px] py-[5px]">
                        <span className="block truncate font-bold capitalize leading-tight text-[#4B1426]" title={c.name}>{c.name}</span>
                        <span className="font-mono text-[9.5px] font-bold text-[#3e8914]">{c.customerCode}</span>
                      </td>
                      <td className="whitespace-nowrap px-[8px] py-[5px] font-semibold text-slate-800">{c.phone}</td>
                      <td className="max-w-[150px] truncate px-[8px] py-[5px] text-blue-600" title={c.email}>{c.email || '—'}</td>
                      <td className="whitespace-nowrap px-[8px] py-[5px] text-slate-700">{c.city || '—'}</td>
                      <td className="px-[8px] py-[5px]"><span className={`whitespace-nowrap rounded border px-1 py-px text-[9.5px] font-bold ${kind.className}`}>{kind.label}</span></td>
                      <td className="px-[8px] py-[5px]">{count(c.stats.services)}</td>
                      <td className="px-[8px] py-[5px]">{count(c.stats.reopens, true)}</td>
                      <td className="px-[8px] py-[5px]">{count(c.stats.enquiries)}</td>
                      <td className="px-[8px] py-[5px]">{count(c.stats.webEnquiries)}</td>
                      <td className="whitespace-nowrap px-[8px] py-[5px] text-slate-700">{formatDate(c.lastSeenAt)}</td>
                      <td className="whitespace-nowrap px-[8px] py-[5px] text-slate-700">{formatDate(c.firstSeenAt)}</td>
                      <td className="px-[8px] py-[5px]">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Link href={href} title="View profile" className={`${ICON_BUTTON} border-blue-400/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20`}>
                            <Eye className="h-[12px] w-[12px]" />
                          </Link>
                          {canDelete && (
                            <button type="button" title="Delete customer" onClick={() => void remove(c)} className={`${ICON_BUTTON} border-red-400/30 bg-red-500/10 text-red-600 hover:bg-red-500/20`}>
                              <Trash2 className="h-[12px] w-[12px]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
            <span className="font-semibold text-[#2563eb]">
              Showing {start + 1}–{start + items.length} of <strong className="font-bold text-[#1d4ed8]">{meta.total.toLocaleString('en-IN')}</strong>
            </span>
            <div className="flex items-center gap-[4px]">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white disabled:opacity-40" aria-label="Previous page">
                <ChevronLeft className="h-3 w-3" />
              </button>
              {pageNumbers.map((p, index) => (
                <span key={p} className="flex items-center gap-[4px]">
                  {index > 0 && p - pageNumbers[index - 1] > 1 && <span className="px-0.5 text-slate-400">…</span>}
                  <button
                    type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-bold ${p === page ? 'border-[#233D4D] bg-[#233D4D] text-white' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'}`}
                  >
                    {p}
                  </button>
                </span>
              ))}
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white disabled:opacity-40" aria-label="Next page">
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function AllCustomersPage() {
  return (
    <Suspense fallback={null}>
      <AllCustomersInner />
    </Suspense>
  );
}
