'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Copy, Download, Eye, Inbox, Mail, MessageCircle,
  MessageSquareText, Phone, PhoneCall, Search, Sparkles, Trash2, Wrench, X, type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';
import type { AxiosError } from 'axios';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { usePermission } from '@/lib/hooks/useAuth';
import {
  Enquiry, EnquiryStatus, EnquiryType, useDeleteEnquiry, useEnquiries, useUpdateEnquiryStatus,
} from '@/lib/hooks/useEnquiries';

// Enquiry Section list page, shared by Quick Booking and Contact Enquiry:
// stat cards, status tabs, search, and a table where staff move each
// enquiry Pending → Contacted → Resolved, call / WhatsApp, view or delete it.

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
  background: '#1e2433',
  color: '#e2e8f0',
});
const showSuccess = (title: string) => void Toast.fire({ icon: 'success', iconColor: '#34d399', title });
const showError = (title: string) => void Toast.fire({ icon: 'error', iconColor: '#f87171', title });

function errorMessage(error: unknown, fallback: string) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || fallback;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isWithinLastDays = (value: string, days: number) => new Date(value).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  PENDING: 'bg-[#fff8e1] text-[#b78103] border border-[#ffe082]',
  CONTACTED: 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]',
  RESOLVED: 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]',
};
const STATUS_LABEL: Record<EnquiryStatus, string> = { PENDING: 'Pending', CONTACTED: 'Contacted', RESOLVED: 'Resolved' };
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const toneClass = {
  slate: 'bg-slate-50 text-slate-700 ring-slate-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
} as const;

const PAGE_SIZE = 10;
type Tab = 'ALL' | EnquiryStatus;

const ICON_BUTTON =
  'flex h-[27px] w-[27px] items-center justify-center rounded-[6px] backdrop-blur-md border transition-all hover:scale-105 active:scale-95';

// What differs between the two pages.
const CONFIG: Record<EnquiryType, { title: string; subtitle: string; noun: string; nounPlural: string; searchPlaceholder: string }> = {
  QUICK_BOOKING: {
    title: 'Quick Booking',
    subtitle: 'Requests from the website’s floating “Quick Book” button — call them back to book the visit.',
    noun: 'booking',
    nounPlural: 'bookings',
    searchPlaceholder: 'Search by name, phone number, reference no., service or message...',
  },
  CONTACT: {
    title: 'Contact Enquiry',
    subtitle: 'Messages from the website’s Contact page “Send a Message” form.',
    noun: 'message',
    nounPlural: 'messages',
    searchPlaceholder: 'Search by name, email, phone number, reference no., subject or message...',
  },
};

// Header filters — same look as the Registration list's (All Time / All Sources / All Services).
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';
const FILTER_SELECT =
  'h-8 cursor-pointer border-2 border-gray-300 bg-white px-2 text-[11px] font-bold text-gray-800 outline-none transition-colors hover:border-[#3e8914]/50 focus:border-[#3e8914]';

function inDateRange(value: string, preset: DatePreset, from: string, to: string) {
  if (preset === 'all') return true;
  const d = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (preset === 'today') return d >= start;
  if (preset === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to Monday
    return d >= start;
  }
  if (preset === 'month') {
    start.setDate(1);
    return d >= start;
  }
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to && d > new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

// Website page an enquiry came from, as a readable label.
const pageLabel = (path: string) => (path === '/' ? 'Home page' : path);

// Excel-friendly CSV (UTF-8 BOM so ₹, — and Hindi text open correctly).
function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const digits = (phone: string) => phone.replace(/\D/g, '');
const withCountryCode = (phone: string) => (digits(phone).length === 10 ? `91${digits(phone)}` : digits(phone));

export function EnquiryTablePage({ type }: { type: EnquiryType }) {
  const config = CONFIG[type];
  const isQuick = type === 'QUICK_BOOKING';
  const canEdit = usePermission('leads', 'edit');
  const { data: enquiries = [], isLoading, error } = useEnquiries(type);
  const updateStatus = useUpdateEnquiryStatus(type);
  const deleteEnquiry = useDeleteEnquiry(type);

  const [tab, setTab] = useState<Tab>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Rows whose "+N" was clicked: show every service in the cell.
  const [expandedServices, setExpandedServices] = useState<string[]>([]);
  const toggleServices = (id: string) =>
    setExpandedServices((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [pageFilter, setPageFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const viewing = enquiries.find((e) => e._id === viewingId) ?? null;

  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const handleStatusChange = (id: string, status: EnquiryStatus) => {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => showSuccess(`Marked as "${STATUS_LABEL[status]}"`),
        onError: (err) => showError(errorMessage(err, 'Failed to update status.')),
      }
    );
  };

  const handleDelete = async (enquiry: Enquiry) => {
    const result = await Swal.fire({
      title: `Delete ${config.noun} from "${enquiry.name}"?`,
      text: 'This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#dc2626',
      background: '#1e2433',
      color: '#e2e8f0',
    });
    if (!result.isConfirmed) return;
    deleteEnquiry.mutate(enquiry._id, {
      onSuccess: () => {
        if (viewingId === enquiry._id) setViewingId(null);
        showSuccess(`${config.noun[0].toUpperCase()}${config.noun.slice(1)} deleted`);
      },
      onError: (err) => showError(errorMessage(err, `Failed to delete ${config.noun}.`)),
    });
  };

  // A bare tel: link does nothing on a computer without a calling app, so
  // show the number first: copy it, or "Call Now" (opens the dialer on phones).
  const callEnquiry = async (enquiry: Enquiry) => {
    const number = `+91 ${enquiry.phone}`;
    const result = await Swal.fire({
      titleText: `Call ${enquiry.name}`,
      html: `<p style="margin:2px 0 6px;font-size:24px;font-weight:800;color:#166534;letter-spacing:0.5px">${number}</p>
             <p style="margin:0;font-size:12px;color:#94a3b8">On a computer, dial this number from your phone, or use Call Now if a calling app is set up.</p>`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Call Now',
      denyButtonText: 'Copy Number',
      cancelButtonText: 'Close',
      confirmButtonColor: '#0284c7',
      denyButtonColor: '#16a34a',
      background: '#1e2433',
      color: '#e2e8f0',
    });
    if (result.isConfirmed) window.location.assign(`tel:+${withCountryCode(enquiry.phone)}`);
    else if (result.isDenied) copyToClipboard('Phone number', number);
  };

  const copyToClipboard = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopiedField(label);
      showSuccess(`${label} copied!`);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

  // Quick Booking: the services picked; Contact: the service / subject chosen.
  const serviceOptions = useMemo(
    () => [...new Set(enquiries.flatMap((e) => (isQuick ? e.services : e.subject ? [e.subject] : [])))].sort((a, b) => a.localeCompare(b)),
    [enquiries, isQuick]
  );
  const pageOptions = useMemo(
    () => [...new Set(enquiries.map((e) => e.page).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b)),
    [enquiries]
  );

  // Header filters apply to the cards, tabs and table alike.
  const scoped = useMemo(
    () =>
      enquiries.filter(
        (e) =>
          inDateRange(e.createdAt, datePreset, customFrom, customTo) &&
          (!pageFilter || e.page === pageFilter) &&
          (!serviceFilter || (isQuick ? e.services.includes(serviceFilter) : e.subject === serviceFilter))
      ),
    [enquiries, datePreset, customFrom, customTo, pageFilter, serviceFilter, isQuick]
  );

  const counts = useMemo(() => {
    const now = new Date();
    return {
      ALL: scoped.length,
      PENDING: scoped.filter((e) => e.status === 'PENDING').length,
      CONTACTED: scoped.filter((e) => e.status === 'CONTACTED').length,
      RESOLVED: scoped.filter((e) => e.status === 'RESOLVED').length,
      today: scoped.filter((e) => isSameDay(new Date(e.createdAt), now)).length,
      week: scoped.filter((e) => isWithinLastDays(e.createdAt, 7)).length,
    };
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((e) => {
      if (tab !== 'ALL' && e.status !== tab) return false;
      if (!q) return true;
      return [e.name, e.phone, e.email, e.referenceNo, e.subject, e.message, e.services.join(' ')]
        .some((field) => (field ?? '').toLowerCase().includes(q));
    });
  }, [scoped, tab, search]);

  // Exports exactly what the table shows (tab, search and filters applied).
  const exportRows = () => {
    const header = isQuick
      ? ['S.No', 'Ref No.', 'Name', 'Phone No.', 'Services', 'Message', 'Sent From Page', 'Status', 'Received']
      : ['S.No', 'Ref No.', 'Name', 'Email', 'Phone No.', 'Subject', 'Message', 'Status', 'Received'];
    const rows = filtered.map((e, i) =>
      isQuick
        ? [i + 1, e.referenceNo, e.name, `+91 ${e.phone}`, e.services.join(', '), e.message ?? '', e.page ? pageLabel(e.page) : '', STATUS_LABEL[e.status], formatDateTime(e.createdAt)]
        : [i + 1, e.referenceNo, e.name, e.email ?? '', `+91 ${e.phone}`, e.subject ?? '', e.message ?? '', STATUS_LABEL[e.status], formatDateTime(e.createdAt)]
    );
    downloadCsv(`${isQuick ? 'quick-bookings' : 'contact-enquiries'}-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
    showSuccess(`Exported ${rows.length} ${rows.length === 1 ? config.noun : config.nounPlural}`);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filtered.length);
  const rows = filtered.slice(startIndex, endIndex);

  const statCards: {
    title: string; value: number; icon: LucideIcon; tone: keyof typeof toneClass;
    gradient: string; borderColor: string; numColor: string; footer: string; onClick: () => void;
  }[] = [
    { title: `TOTAL ${config.nounPlural.toUpperCase()}`, value: counts.ALL, icon: Inbox, tone: 'slate', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #e2e8f0 100%)', borderColor: '#e2e8f0', numColor: '#334155', footer: `View all ${config.nounPlural}`, onClick: () => changeTab('ALL') },
    { title: 'PENDING', value: counts.PENDING, icon: Clock3, tone: 'amber', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #fed7aa 100%)', borderColor: '#fed7aa', numColor: '#c2410c', footer: 'View pending', onClick: () => changeTab('PENDING') },
    { title: 'CONTACTED', value: counts.CONTACTED, icon: PhoneCall, tone: 'blue', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #bae6fd 100%)', borderColor: '#bae6fd', numColor: '#0284c7', footer: 'View contacted', onClick: () => changeTab('CONTACTED') },
    { title: 'RESOLVED', value: counts.RESOLVED, icon: CheckCircle2, tone: 'emerald', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #bbf7d0 100%)', borderColor: '#bbf7d0', numColor: '#15803d', footer: 'View resolved', onClick: () => changeTab('RESOLVED') },
    { title: 'TODAY', value: counts.today, icon: Sparkles, tone: 'violet', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #ddd6fe 100%)', borderColor: '#ddd6fe', numColor: '#6d28d9', footer: 'New today', onClick: () => changeTab('ALL') },
    { title: 'LAST 7 DAYS', value: counts.week, icon: MessageSquareText, tone: 'teal', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #99f6e4 100%)', borderColor: '#99f6e4', numColor: '#0f766e', footer: 'This week', onClick: () => changeTab('ALL') },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ALL', label: `All ${config.nounPlural[0].toUpperCase()}${config.nounPlural.slice(1)}` },
    { key: 'PENDING', label: 'Pending' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'RESOLVED', label: 'Resolved' },
  ];

  const columns = isQuick
    ? ['S.No', 'Ref No.', 'Name', 'Phone No.', 'Services', 'Message', 'Status', 'Received']
    : ['S.No', 'Ref No.', 'Name', 'Email', 'Phone No.', 'Subject', 'Status', 'Received'];
  const colSpan = columns.length + 1;

  const statusSelect = (enquiry: Enquiry, size: 'sm' | 'md') => (
    <select
      value={enquiry.status}
      disabled={!canEdit || (updateStatus.isPending && updateStatus.variables?.id === enquiry._id)}
      onChange={(e) => handleStatusChange(enquiry._id, e.target.value as EnquiryStatus)}
      className={`cursor-pointer appearance-none rounded-[4px] font-bold shadow-xs outline-none transition disabled:cursor-not-allowed disabled:opacity-60 bg-no-repeat ${
        size === 'sm' ? 'h-[24px] px-[8px] pr-[22px] text-[12px] bg-[right_6px_center]' : 'h-[28px] px-[10px] pr-[24px] text-[12px] bg-[right_7px_center]'
      } ${STATUS_STYLES[enquiry.status]}`}
      style={{ backgroundImage: SELECT_ARROW }}
    >
      <option value="PENDING" className="bg-white font-bold text-[#b78103]">Pending</option>
      <option value="CONTACTED" className="bg-white font-bold text-[#0369a1]">Contacted</option>
      <option value="RESOLVED" className="bg-white font-bold text-[#23714a]">Resolved</option>
    </select>
  );

  return (
    // Same full-bleed white page and spacing as New Registration.
    <PageShell
      title={config.title}
      description={config.subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={datePreset} onChange={(e) => { setDatePreset(e.target.value as DatePreset); setPage(1); }} className={FILTER_SELECT}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          {datePreset === 'custom' && (
            <div className="flex h-8 items-center gap-1.5 border-2 border-gray-300 bg-white px-1.5">
              <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} className="h-6 cursor-pointer px-1 text-[11px] text-gray-900 outline-none" />
              <span className="text-[11px] font-medium text-gray-500">to</span>
              <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} className="h-6 cursor-pointer px-1 text-[11px] text-gray-900 outline-none" />
            </div>
          )}
          {isQuick && (
            <select value={pageFilter} onChange={(e) => { setPageFilter(e.target.value); setPage(1); }} className={`${FILTER_SELECT} max-w-[190px]`}>
              <option value="">All Pages</option>
              {pageOptions.map((p) => <option key={p} value={p}>{pageLabel(p)}</option>)}
            </select>
          )}
          <select value={serviceFilter} onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }} className={`${FILTER_SELECT} max-w-[190px]`}>
            <option value="">All Services</option>
            {serviceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      }
    >

        {/* Stats */}
        <div className="mb-[12px] grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="relative flex h-[86px] flex-col overflow-hidden rounded-[10px] border bg-white p-2 transition-all hover:translate-y-[-1px]"
                style={{
                  background: item.gradient,
                  borderColor: item.borderColor,
                  boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px',
                }}
              >
                <div className="flex items-start gap-1.5">
                  <div className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-white/80 shadow-xs ring-1 ${toneClass[item.tone]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold tracking-[0.01em] text-slate-900">{item.title}</p>
                    <span className="mt-1 block text-[18px] font-semibold leading-none tracking-[-0.04em]" style={{ color: item.numColor }}>
                      {item.value}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#293957] transition hover:text-blue-600"
                >
                  {item.footer}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Table card */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[7px] border border-[#e8e5df] bg-white">
          <div className="flex flex-wrap items-center gap-[20px] border-b border-[#e8e5df] px-[16px] pt-[11px]">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => changeTab(t.key)}
                className={`relative pb-[9px] text-[13px] font-bold transition-colors ${tab === t.key ? 'text-[#166b40]' : 'text-[#6c7587] hover:text-[#18233b]'}`}
              >
                {t.label} ({counts[t.key]})
                {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#166b40]" />}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-[8px] border-b border-[#f0f0ec] px-[16px] py-[10px]">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-[9px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#9aa0aa]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={config.searchPlaceholder}
                className="h-[34px] w-full rounded-[5px] border border-[#e5e6e2] bg-white pl-[30px] pr-[9px] text-[13px] font-medium text-[#414b5e] outline-none placeholder:text-[#9aa0aa] focus:border-[#8fa98e]"
              />
            </div>
            <button
              type="button"
              onClick={exportRows}
              disabled={filtered.length === 0}
              title="Export to Excel (CSV)"
              className="flex h-[34px] items-center gap-1.5 rounded-[5px] bg-[#16a34a] px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="h-[36px] border-b border-[#e8e5df] bg-[#233D4D]">
                  {columns.map((col) => (
                    <th key={col} className="px-[12px] py-[6px] text-[12px] font-bold uppercase tracking-wider text-white">{col}</th>
                  ))}
                  <th className="px-[12px] py-[6px] text-right text-[12px] font-bold uppercase tracking-wider text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0ec]">
                {isLoading ? (
                  <tr><td colSpan={colSpan} className="py-12 text-center text-[12px] text-[#6c7587]">Loading {config.nounPlural}…</td></tr>
                ) : error ? (
                  <tr><td colSpan={colSpan} className="py-12 text-center text-[12px] font-semibold text-red-600">{errorMessage(error, `Failed to load ${config.nounPlural}.`)}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={colSpan} className="py-12 text-center text-[12px] text-[#6c7587]">No {config.nounPlural} match your filters.</td></tr>
                ) : (
                  rows.map((enquiry, rowIndex) => (
                    <tr key={enquiry._id} className="transition hover:bg-slate-50/80">
                      <td className="px-[10px] py-[7px] text-[12px] font-semibold text-[#6c7587]">{startIndex + rowIndex + 1}</td>
                      <td className="whitespace-nowrap px-[10px] py-[7px] text-[11px] font-bold text-[#134698]">{enquiry.referenceNo}</td>
                      <td className="px-[10px] py-[7px]">
                        <button type="button" onClick={() => setViewingId(enquiry._id)} className="whitespace-nowrap text-left text-[12px] font-bold text-[#4B1426] hover:underline">
                          {enquiry.name}
                        </button>
                      </td>
                      {!isQuick && <td className="whitespace-nowrap px-[10px] py-[7px] text-[12px] font-medium text-[#334155]">{enquiry.email || '—'}</td>}
                      <td className="whitespace-nowrap px-[10px] py-[7px] text-[12px] font-bold text-[#166534]">+91 {enquiry.phone}</td>
                      {isQuick ? (
                        <>
                          <td className="max-w-[220px] px-[10px] py-[7px]">
                            {/* First service, then "+N" — click to list all in the cell (like Registration's issues) */}
                            <div className="flex flex-wrap items-center gap-1">
                              {enquiry.services.length === 0 && <span className="text-[12px] text-[#334155]">—</span>}
                              {(expandedServices.includes(enquiry._id) ? enquiry.services : enquiry.services.slice(0, 1)).map((s) => (
                                <span key={s} className="rounded-[4px] border border-[#3e8914]/25 bg-[#3e8914]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#2f6b0f]">
                                  {s}
                                </span>
                              ))}
                              {enquiry.services.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => toggleServices(enquiry._id)}
                                  title={expandedServices.includes(enquiry._id) ? 'Show less' : enquiry.services.slice(1).join(', ')}
                                  className="cursor-pointer rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-red-600 hover:bg-red-100"
                                >
                                  {expandedServices.includes(enquiry._id) ? 'Less' : `+${enquiry.services.length - 1}`}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate px-[10px] py-[7px] text-[12px] font-medium text-[#334155]" title={enquiry.message}>{enquiry.message || '—'}</td>
                        </>
                      ) : (
                        <td className="max-w-[180px] truncate px-[10px] py-[7px] text-[12px] font-medium text-[#334155]" title={enquiry.subject}>{enquiry.subject || '—'}</td>
                      )}
                      <td className="px-[10px] py-[7px]">{statusSelect(enquiry, 'sm')}</td>
                      <td className="whitespace-nowrap px-[10px] py-[7px] text-[11px] font-medium text-[#6c7587]">{formatDateTime(enquiry.createdAt)}</td>
                      <td className="px-[10px] py-[7px]">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" title="View" onClick={() => setViewingId(enquiry._id)} className={`${ICON_BUTTON} border-orange-400/30 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20`}>
                            <Eye className="h-[13px] w-[13px]" />
                          </button>
                          <button type="button" onClick={() => void callEnquiry(enquiry)} title="Call" className={`${ICON_BUTTON} border-sky-400/30 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20`}>
                            <Phone className="h-[13px] w-[13px]" />
                          </button>
                          <a href={`https://wa.me/${withCountryCode(enquiry.phone)}`} target="_blank" rel="noreferrer" title="Message on WhatsApp" className={`${ICON_BUTTON} border-emerald-400/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20`}>
                            <MessageCircle className="h-[13px] w-[13px]" />
                          </a>
                          {canEdit && (
                            <button type="button" title="Delete" onClick={() => void handleDelete(enquiry)} className={`${ICON_BUTTON} border-red-400/30 bg-red-500/10 text-red-600 hover:bg-red-500/20`}>
                              <Trash2 className="h-[13px] w-[13px]" />
                            </button>
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[8px] text-[12px]">
              <span className="font-semibold text-[#5f6a7c]">
                Showing {startIndex + 1} to {endIndex} of {filtered.length} {config.nounPlural}
              </span>
              <div className="flex items-center gap-[4px]">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`flex h-[26px] min-w-[26px] items-center justify-center rounded-[4px] border px-1.5 text-[12px] font-bold transition ${
                      safePage === pageNum ? 'border-[#233D4D] bg-[#233D4D] text-white shadow-xs' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onClick={() => setViewingId(null)}>
          <div className="w-full max-w-[560px] overflow-hidden rounded-[8px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-[#e8e5df] px-4 py-3">
              <h2 className="text-[15px] font-bold text-[#18233b]">{isQuick ? 'Quick Booking' : 'Contact Message'} · <span className="text-[#134698]">{viewing.referenceNo}</span></h2>
              <button type="button" onClick={() => setViewingId(null)} className="rounded p-1 text-[#6c7587] hover:bg-slate-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-bold text-[#18233b]">{viewing.name}</p>
                  <p className="text-[12px] font-medium text-[#6c7587]">{formatDateTime(viewing.createdAt)}</p>
                </div>
                {statusSelect(viewing, 'md')}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Phone Number', value: `+91 ${viewing.phone}`, icon: Phone },
                  ...(viewing.email ? [{ label: 'Email', value: viewing.email, icon: Mail }] : []),
                  ...(isQuick
                    ? [{ label: 'Services', value: viewing.services.join(', ') || '—', icon: Wrench }]
                    : [{ label: 'Subject', value: viewing.subject || '—', icon: MessageSquareText }]),
                  ...(viewing.page ? [{ label: 'Sent From Page', value: viewing.page, icon: Inbox }] : []),
                ].map(({ label, value, icon: FieldIcon }) => (
                  <div key={label} className="rounded-[4px] border border-[#e4e7eb] bg-[#f8fafc] px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
                        <FieldIcon className="h-3 w-3" />
                        {label}
                      </p>
                      <button type="button" onClick={() => copyToClipboard(label, value)} className="text-[#64748b] hover:text-[#0284c7]" title={`Copy ${label}`}>
                        {copiedField === label ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <p className="mt-0.5 break-words text-[13px] font-semibold text-[#1e293b]">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">Message</p>
                <div className="whitespace-pre-wrap rounded-[4px] border border-[#e4e7eb] bg-[#f8fafc] p-3 text-[13px] leading-relaxed text-[#334155]">
                  {viewing.message || 'No message.'}
                </div>
              </div>

              {/* "We got your request" WhatsApp to the customer */}
              <div
                className={`flex items-start gap-2 rounded-[4px] border px-3 py-2 text-[12px] font-medium ${
                  viewing.whatsapp?.status === 'SENT'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : viewing.whatsapp?.status === 'FAILED'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {viewing.whatsapp?.status === 'SENT' && <>WhatsApp confirmation sent to the customer on {formatDateTime(viewing.whatsapp.at)}.</>}
                  {viewing.whatsapp?.status === 'FAILED' && <>WhatsApp confirmation could not be sent{viewing.whatsapp.error ? ` — ${viewing.whatsapp.error}` : '.'}</>}
                  {viewing.whatsapp?.status === 'SKIPPED' && <>WhatsApp confirmation not sent — WhatsApp sending is switched off on the server.</>}
                  {!viewing.whatsapp && <>No WhatsApp confirmation recorded for this {config.noun}.</>}
                </span>
              </div>

              {viewing.statusUpdatedBy && viewing.statusUpdatedAt && (
                <p className="text-[11px] font-medium text-[#94a3b8]">
                  Status last changed by {viewing.statusUpdatedBy.name} on {formatDateTime(viewing.statusUpdatedAt)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-4 py-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void handleDelete(viewing)}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-[4px] bg-[#fff1f2] px-[14px] text-[13px] font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-95"
                  style={{ boxShadow: 'rgba(0,0,0,0.02) 0px 1px 3px 0px, rgba(220,38,38,0.15) 0px 0px 0px 1px' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => void callEnquiry(viewing)}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[4px] bg-[#0284c7] px-[14px] text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </button>
              <a
                href={`https://wa.me/${withCountryCode(viewing.phone)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[4px] bg-[#16a34a] px-[14px] text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Reply on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
