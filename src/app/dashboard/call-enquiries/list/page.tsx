'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightCircle, Download, Pencil, PhoneIncoming, Plus, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

import { usePermission } from '@/lib/hooks/useAuth';
import {
  CALL_ENQUIRY_SOURCES, CallEnquiry, CallEnquiryStatus, useCallEnquiries, useDeleteCallEnquiry, useSaveCallEnquiry,
} from '@/lib/hooks/useCallEnquiries';
import { formatDate, formatTime } from '@/lib/registrations/format';

// Call Enquiry Section → Call Enquiry List: every phone enquiry, with date /
// source / status filters, Excel export, and "Move to Service Call".

const PAGE_SIZE = 15;
type DateFilter = 'all' | 'today' | 'yesterday' | 'last7' | 'custom';

const STATUS_LABEL: Record<CallEnquiryStatus, string> = { OPEN: 'Open', CONVERTED: 'Converted', CLOSED: 'Closed' };
const STATUS_STYLE: Record<CallEnquiryStatus, string> = {
  OPEN: 'border-[#fcd34d] bg-[#fef3c7] text-[#92400e]',
  CONVERTED: 'border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]',
  CLOSED: 'border-[#d1d5db] bg-[#f3f4f6] text-[#4b5563]',
};
const SELECT = 'h-8 border-2 border-gray-300 bg-white px-2 text-[11px] font-bold text-[#18233b] outline-none focus:border-[#3e8914]';
const ACTION = 'flex h-[25px] w-[25px] items-center justify-center rounded-[6px] border backdrop-blur-md transition-all hover:scale-105 active:scale-95';

// Local calendar day, as YYYY-MM-DD.
function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function csvCell(value: string) {
  // Quote everything; neutralise leading =,+,-,@ so Excel never runs a formula.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadExcel(rows: CallEnquiry[]) {
  const header = ['S.No', 'Enquiry No', 'Name', 'Mobile', 'Service', 'Category', 'Source', 'Source Detail', 'Remarks', 'Status', 'Registration No', 'Received On', 'Added By'];
  const lines = rows.map((r, i) => [
    String(i + 1), r.enquiryNo, r.name, r.phone, r.serviceName, r.serviceCategory ?? '', r.source, r.sourceDetail ?? '', r.remarks ?? '',
    STATUS_LABEL[r.status], r.registrationNo ?? '', `${formatDate(r.createdAt)} ${formatTime(r.createdAt)}`, r.createdBy?.name ?? '',
  ]);
  const csv = [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n');
  // BOM so Excel reads the file as UTF-8.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `call-enquiries-${dayKey(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CallEnquiryListPage() {
  const router = useRouter();
  const { data: enquiries = [], isLoading } = useCallEnquiries();
  const save = useSaveCallEnquiry();
  const remove = useDeleteCallEnquiry();
  const canCreate = usePermission('customers', 'create');
  const canEdit = usePermission('customers', 'edit');

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const q = search.trim().toLowerCase();
    return enquiries.filter((row) => {
      const day = dayKey(new Date(row.createdAt));
      if (dateFilter === 'today' && day !== dayKey(today)) return false;
      if (dateFilter === 'yesterday' && day !== dayKey(yesterday)) return false;
      if (dateFilter === 'last7' && day < dayKey(weekAgo)) return false;
      if (dateFilter === 'custom' && ((from && day < from) || (to && day > to))) return false;
      if (source && row.source !== source) return false;
      if (status && row.status !== status) return false;
      if (!q) return true;
      return [row.name, row.phone, row.enquiryNo, row.serviceName, row.serviceCategory ?? '', row.remarks ?? '', row.registrationNo ?? '']
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [enquiries, search, dateFilter, from, to, source, status]);

  const counts = useMemo(() => {
    const today = dayKey(new Date());
    return {
      total: enquiries.length,
      today: enquiries.filter((r) => dayKey(new Date(r.createdAt)) === today).length,
      open: enquiries.filter((r) => r.status === 'OPEN').length,
      converted: enquiries.filter((r) => r.status === 'CONVERTED').length,
    };
  }, [enquiries]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const resetPage = () => setPage(1);

  async function changeStatus(row: CallEnquiry, next: CallEnquiryStatus) {
    if (next === row.status) return;
    try {
      await save.mutateAsync({ id: row._id, status: next });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not change status', confirmButtonColor: '#3e8914' });
    }
  }

  async function moveToServiceCall(row: CallEnquiry) {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Move to Service Call?',
      html: `<b>${row.name.replace(/</g, '&lt;')}</b> — ${row.serviceName.replace(/</g, '&lt;')}<br/><small>The Add New Call form opens with the name, mobile, service and source filled in. Add the address and issue details, then save.</small>`,
      showCancelButton: true,
      confirmButtonText: 'Open Add New Call',
      confirmButtonColor: '#3e8914',
    });
    if (result.isConfirmed) router.push(`/dashboard/registrations/new?enquiryId=${row._id}`);
  }

  async function handleDelete(row: CallEnquiry) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete this enquiry?',
      html: `<b>${row.enquiryNo}</b> — ${row.name.replace(/</g, '&lt;')}<br/><span class="text-red-600">This cannot be undone.</span>`,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    try {
      await remove.mutateAsync(row._id);
      void Swal.fire({ icon: 'success', title: 'Enquiry deleted', timer: 1300, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Could not delete enquiry', confirmButtonColor: '#3e8914' });
    }
  }

  // label, count, number colour, light card background + border (one shade per card)
  const stats: [string, number, string, string][] = [
    ['Total Enquiries', counts.total, 'text-[#5b21b6]', 'border-[#ddd6fe] bg-[#f5f3ff]'],
    ["Today's Enquiries", counts.today, 'text-[#1d4ed8]', 'border-[#bfdbfe] bg-[#eff6ff]'],
    ['Open', counts.open, 'text-[#b45309]', 'border-[#fde68a] bg-[#fffbeb]'],
    ['Moved to Service Call', counts.converted, 'text-[#23714a]', 'border-[#bbf7d0] bg-[#f0fdf4]'],
  ];

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        <div className="mb-[14px] flex flex-wrap items-end justify-between gap-3 border-b-[2px] border-[#293681] pb-[8px]">
          <div>
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Call Enquiry List</h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Phone enquiries — who called, for which service and where they heard about us.</p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => router.push('/dashboard/call-enquiries/add')}
              className="flex items-center gap-1.5 rounded-[6px] bg-[#4B1426] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Call Enquiry
            </button>
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([label, value, tone, card]) => (
            <div key={label} className={`border-2 px-4 py-3 shadow-sm ${card}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600">{label}</p>
              <p className={`mt-1 text-2xl font-bold leading-none ${tone}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[#e8e5df] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#233D4D] px-4 py-3">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
                <PhoneIncoming className="h-4 w-4 text-[#3e8914]" /> Call Enquiries
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-200">Showing {filtered.length} of {enquiries.length} enquiries</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value as DateFilter); resetPage(); }} className={SELECT} aria-label="Date filter">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="custom">Custom Dates</option>
              </select>
              {dateFilter === 'custom' && (
                <>
                  <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); resetPage(); }} className={SELECT} aria-label="From date" />
                  <span className="text-[11px] font-bold text-white">to</span>
                  <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); resetPage(); }} className={SELECT} aria-label="To date" />
                </>
              )}
              <select value={source} onChange={(e) => { setSource(e.target.value); resetPage(); }} className={SELECT} aria-label="Source filter">
                <option value="">All Sources</option>
                {CALL_ENQUIRY_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }} className={SELECT} aria-label="Status filter">
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="CONVERTED">Converted</option>
                <option value="CLOSED">Closed</option>
              </select>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                  placeholder="Search name, mobile, service..."
                  className="h-8 w-full border-2 border-gray-300 bg-white pl-8 pr-2 text-[11px] font-semibold text-[#18233b] outline-none focus:border-[#3e8914]"
                />
              </div>
              <button
                type="button"
                onClick={() => downloadExcel(filtered)}
                disabled={filtered.length === 0}
                className="flex h-8 items-center gap-1.5 bg-[#3e8914] px-3 text-[11px] font-bold text-white hover:bg-[#347311] disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Export to Excel
              </button>
            </div>
          </div>

          <div className="thin-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr className="bg-[#233D4D] text-[10.5px] font-bold uppercase tracking-wider text-white">
                  <th className="px-[12px] py-[8px]">S.No</th>
                  <th className="px-[12px] py-[8px]">Name</th>
                  <th className="px-[12px] py-[8px]">Mobile</th>
                  <th className="px-[12px] py-[8px]">Enquiry For</th>
                  <th className="px-[12px] py-[8px]">Source</th>
                  <th className="px-[12px] py-[8px]">Remarks</th>
                  <th className="px-[12px] py-[8px]">Status</th>
                  <th className="px-[12px] py-[8px]">Received On</th>
                  <th className="px-[12px] py-[8px]">Added By</th>
                  <th className="px-[12px] py-[8px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-[12px] text-[#6c7587]">{isLoading ? 'Loading enquiries...' : 'No enquiries found.'}</td></tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row._id} className="align-top transition hover:bg-slate-50/80">
                      <td className="px-[12px] py-[8px] text-[12px] font-bold text-[#3e8914]">{start + index + 1}</td>
                      <td className="px-[12px] py-[8px]">
                        <span className="block text-[12px] font-bold text-[#4B1426]">{row.name}</span>
                        <span className="mt-0.5 block text-[10px] font-semibold text-gray-500">{row.enquiryNo}</span>
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <a href={`tel:+91${row.phone}`} className="text-[12px] font-bold text-blue-600 hover:underline">+91 {row.phone}</a>
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <span className="block text-[12px] font-bold text-[#18233b]">{row.serviceName}</span>
                        {row.serviceCategory && <span className="mt-0.5 block text-[10px] font-semibold text-blue-600">{row.serviceCategory}</span>}
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <span className="inline-block rounded-[4px] border border-[#3e8914]/30 bg-[#3e8914]/10 px-2 py-0.5 text-[11px] font-bold text-[#2f6b0f]">{row.source}</span>
                        {row.sourceDetail && <span className="mt-0.5 block text-[10px] text-gray-500">{row.sourceDetail}</span>}
                      </td>
                      <td className="max-w-[240px] px-[12px] py-[8px] text-[11px] leading-snug text-[#334155]">{row.remarks || '—'}</td>
                      <td className="px-[12px] py-[8px]">
                        {row.status === 'CONVERTED' ? (
                          <>
                            <span className={`inline-block rounded-[4px] border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE.CONVERTED}`}>Converted</span>
                            {row.registrationNo && (
                              <button
                                type="button"
                                onClick={() => row.registrationId && router.push(`/dashboard/registrations/${row.registrationId}`)}
                                className="mt-0.5 block text-[10px] font-bold text-blue-600 hover:underline"
                              >
                                {row.registrationNo}
                              </button>
                            )}
                          </>
                        ) : (
                          <select
                            key={`${row._id}-${row.status}`}
                            value={row.status}
                            disabled={!canEdit}
                            onChange={(e) => void changeStatus(row, e.target.value as CallEnquiryStatus)}
                            aria-label={`Status of ${row.enquiryNo}`}
                            className={`h-[24px] cursor-pointer rounded-[4px] border px-1.5 text-[11px] font-bold outline-none disabled:cursor-not-allowed ${STATUS_STYLE[row.status]}`}
                          >
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        )}
                      </td>
                      <td className="px-[12px] py-[8px]">
                        <span className="block whitespace-nowrap text-[11px] font-bold text-[#18233b]">{formatDate(row.createdAt)}</span>
                        <span className="block text-[10px] font-medium text-blue-500">{formatTime(row.createdAt)}</span>
                      </td>
                      <td className="px-[12px] py-[8px] text-[11px] font-bold text-[#4B1426]">{row.createdBy?.name ?? '—'}</td>
                      <td className="px-[12px] py-[8px]">
                        <div className="flex items-center justify-end gap-1.5">
                          {canCreate && row.status !== 'CONVERTED' && (
                            <button
                              type="button"
                              onClick={() => void moveToServiceCall(row)}
                              title="Move to Service Call"
                              className="flex h-[25px] items-center gap-1 rounded-[6px] border border-[#3e8914]/40 bg-[#3e8914]/10 px-2 text-[10px] font-bold text-[#2f6b0f] transition-all hover:bg-[#3e8914] hover:text-white"
                            >
                              <ArrowRightCircle className="h-3.5 w-3.5" /> Service Call
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => router.push(`/dashboard/call-enquiries/add?editId=${row._id}`)}
                                title="Edit"
                                className={`${ACTION} border-blue-400/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20`}
                              >
                                <Pencil className="h-[12px] w-[12px]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(row)}
                                title="Delete"
                                className={`${ACTION} border-red-400/30 bg-red-500/10 text-red-600 hover:bg-red-500/20`}
                              >
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
              <span className="font-semibold text-[#2563eb]">
                Showing <strong>{start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
              </span>
              <div className="flex items-center gap-[4px]">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-bold transition ${
                      p === safePage ? 'border-[#233D4D] bg-[#233D4D] text-white' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'
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
