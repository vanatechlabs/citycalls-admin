'use client';

import { useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, EyeOff, Eye, Grid, List, MapPin,
  MessageCircleMore, Palette, Pencil, Plus, RefreshCw, Settings, Star, Trash2, X, Globe, MessageSquareQuote,
  type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { usePermission } from '@/lib/hooks/useAuth';
import {
  Testimonial, TestimonialInput, TestimonialsSectionInput, TestimonialStatus,
  useCreateTestimonial, useDeleteTestimonial, useTestimonials, useUpdateTestimonial, useUpdateTestimonialsSection,
} from '@/lib/hooks/useTestimonials';

// Pages Section → Testimonials: reviews for the home page's "Loved by
// thousands of happy families" carousel. Layout follows the Bharat admin's
// Testimonials Management (cards, filters, table/grid, details panel), in
// CityCalls colours. No photos — the badge shows the name's initials.

const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2200, timerProgressBar: true });
const showSuccess = (title: string) => void Toast.fire({ icon: 'success', title });
const showError = (title: string) => void Toast.fire({ icon: 'error', title });

function errorMessage(error: unknown, fallback: string) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || fallback;
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

// First letter of the first and last word ("Anjali Mehra" → AM), skipping
// titles like Dr. / Mr.; one word → its first two letters.
export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const clean = words.filter((w) => !['dr.', 'dr', 'mr.', 'mr', 'mrs.', 'mrs', 'ms.', 'ms', 'prof.', 'prof'].includes(w.toLowerCase()));
  const target = clean.length >= 2 ? clean : words;
  return (target[0][0] + target[target.length - 1][0]).toUpperCase();
}

function InitialsBadge({ name, color, size = 36, textSize = 12 }: { name: string; color: string; size?: number; textSize?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-white font-bold uppercase tracking-wider"
      style={{
        width: size,
        height: size,
        fontSize: textSize,
        color,
        background: `linear-gradient(135deg, #ffffff 0%, ${color}22 100%)`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1.5px #e2e8f0',
      }}
    >
      {getInitials(name) || 'CC'}
    </div>
  );
}

function RatingStars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} strokeWidth={1.6} className={i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-300'} />
      ))}
    </div>
  );
}

const STATUS_LABEL: Record<TestimonialStatus, string> = { PUBLISHED: 'Published', PENDING: 'Pending Review', HIDDEN: 'Hidden' };
const STATUS_STYLES: Record<TestimonialStatus, string> = {
  PUBLISHED: 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]',
  PENDING: 'bg-[#fff8e1] text-[#b78103] border border-[#ffe082]',
  HIDDEN: 'bg-[#ffebee] text-[#c62828] border border-[#ef9a9a]',
};
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const COLOR_PRESETS = [
  { label: 'CityCalls Green', value: '#3e8914' },
  { label: 'Dark Green', value: '#23471d' },
  { label: 'Ocean Blue', value: '#0284c7' },
  { label: 'Slate', value: '#233d4d' },
  { label: 'Burgundy', value: '#4b1426' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Pink', value: '#be185d' },
  { label: 'Purple', value: '#7c3aed' },
];

const toneClass = {
  slate: 'bg-slate-50 text-slate-700 ring-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
} as const;

const ICON_BUTTON = 'flex h-[27px] w-[27px] items-center justify-center rounded-[6px] backdrop-blur-md border transition-all hover:scale-105 active:scale-95';
const FILTER = 'h-[36px] rounded-[6px] border border-[#dfe4e8] bg-white px-[10px] text-[12px] font-semibold text-[#2a3855] outline-none cursor-pointer';
const LABEL = 'mb-1 block text-[11px] font-bold text-[#1e293b]';
const INPUT = 'h-[36px] w-full rounded-[4px] border border-[#cbd5e1] px-2.5 text-[12px] font-medium text-[#1e293b] outline-none placeholder:text-slate-400 focus:border-[#3e8914]';

const EMPTY_FORM: TestimonialInput = { name: '', role: '', location: '', rating: 5, message: '', color: '#3e8914', sortOrder: 0, status: 'PUBLISHED' };

type StatusFilter = 'ALL' | TestimonialStatus;

export function TestimonialsManager() {
  const canEdit = usePermission('marketing', 'edit');
  const { data, isLoading, error } = useTestimonials();
  const createTestimonial = useCreateTestimonial();
  const updateTestimonial = useUpdateTestimonial();
  const deleteTestimonial = useDeleteTestimonial();
  const updateSection = useUpdateTestimonialsSection();
  const testimonials = useMemo(() => data?.testimonials ?? [], [data]);
  const section = data?.section;

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Add / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialInput>(EMPTY_FORM);
  const setField = (patch: Partial<TestimonialInput>) => setForm((f) => ({ ...f, ...patch }));

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<TestimonialsSectionInput>({ eyebrow: '', heading: '', highlight: '', minRating: 1 });

  const selected = testimonials.find((t) => t._id === selectedId) ?? testimonials[0] ?? null;
  const locations = useMemo(() => [...new Set(testimonials.map((t) => t.location).filter(Boolean))].sort(), [testimonials]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return testimonials.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (locationFilter && t.location !== locationFilter) return false;
      if (ratingFilter && t.rating !== ratingFilter) return false;
      if (!q) return true;
      return [t.name, t.role, t.location, t.message].some((f) => f.toLowerCase().includes(q));
    });
  }, [testimonials, query, statusFilter, locationFilter, ratingFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const counts = useMemo(() => {
    const published = testimonials.filter((t) => t.status === 'PUBLISHED');
    return {
      total: testimonials.length,
      published: published.length,
      pending: testimonials.filter((t) => t.status === 'PENDING').length,
      hidden: testimonials.filter((t) => t.status === 'HIDDEN').length,
      average: testimonials.length ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length : 0,
      // What the website actually shows (published + meets the minimum rating).
      live: published.filter((t) => t.rating >= (section?.minRating ?? 1)).length,
    };
  }, [testimonials, section]);

  const applyFilters = (patch: () => void) => {
    patch();
    setPage(1);
  };
  const clearFilters = () => applyFilters(() => {
    setQuery('');
    setStatusFilter('ALL');
    setLocationFilter('');
    setRatingFilter(0);
  });

  const statCards: {
    title: string; value: string; suffix?: string; icon: LucideIcon; tone: keyof typeof toneClass;
    gradient: string; borderColor: string; numColor: string; footer: string; onClick: () => void;
  }[] = [
    { title: 'TOTAL REVIEWS', value: String(counts.total), icon: MessageSquareQuote, tone: 'slate', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #e2e8f0 100%)', borderColor: '#e2e8f0', numColor: '#334155', footer: 'View all reviews', onClick: clearFilters },
    { title: 'PUBLISHED REVIEWS', value: String(counts.published), icon: CheckCircle2, tone: 'emerald', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #bbf7d0 100%)', borderColor: '#bbf7d0', numColor: '#15803d', footer: 'View published', onClick: () => applyFilters(() => setStatusFilter('PUBLISHED')) },
    { title: 'PENDING REVIEW', value: String(counts.pending), icon: Clock3, tone: 'amber', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #fed7aa 100%)', borderColor: '#fed7aa', numColor: '#c2410c', footer: 'Review pending', onClick: () => applyFilters(() => setStatusFilter('PENDING')) },
    { title: 'AVERAGE RATING', value: counts.average.toFixed(1), suffix: '/ 5', icon: Star, tone: 'yellow', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #fde68a 100%)', borderColor: '#fde68a', numColor: '#b45309', footer: 'View 5-star reviews', onClick: () => applyFilters(() => setRatingFilter(5)) },
    { title: 'HIDDEN REVIEWS', value: String(counts.hidden), icon: EyeOff, tone: 'rose', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #fecdd3 100%)', borderColor: '#fecdd3', numColor: '#be123c', footer: 'View hidden', onClick: () => applyFilters(() => setStatusFilter('HIDDEN')) },
    { title: 'WEBSITE STATUS', value: counts.live > 0 ? 'Live' : 'Off', icon: Globe, tone: 'teal', gradient: 'linear-gradient(135deg, #ffffff 0%, #ffffff 42%, #99f6e4 100%)', borderColor: '#99f6e4', numColor: counts.live > 0 ? '#0f766e' : '#be123c', footer: counts.live > 0 ? `${counts.live} live on website` : 'Nothing shown on website', onClick: () => window.open(`${WEBSITE_ORIGIN}/#testimonials`, '_blank', 'noopener') },
  ];

  // ── Actions ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    const nextOrder = testimonials.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1;
    setForm({ ...EMPTY_FORM, sortOrder: nextOrder });
    setFormOpen(true);
  };
  const openEdit = (t: Testimonial) => {
    setEditingId(t._id);
    setForm({ name: t.name, role: t.role, location: t.location, rating: t.rating, message: t.message, color: t.color, sortOrder: t.sortOrder, status: t.status });
    setFormOpen(true);
  };

  const saveForm = () => {
    if (form.name.trim().length < 2) return showError('Please enter the reviewer’s name.');
    if (form.message.trim().length < 5) return showError('Please write the review text.');
    const onError = (err: unknown) => showError(errorMessage(err, 'Could not save the testimonial.'));
    if (editingId) {
      updateTestimonial.mutate({ id: editingId, ...form }, { onSuccess: () => { setFormOpen(false); showSuccess('Testimonial updated'); }, onError });
    } else {
      createTestimonial.mutate(form, {
        onSuccess: (created) => { setFormOpen(false); setSelectedId(created._id); showSuccess('Testimonial added'); },
        onError,
      });
    }
  };

  const changeStatus = (id: string, status: TestimonialStatus) => {
    updateTestimonial.mutate(
      { id, status },
      { onSuccess: () => showSuccess(`Marked as "${STATUS_LABEL[status]}"`), onError: (err) => showError(errorMessage(err, 'Could not change the status.')) }
    );
  };

  const remove = async (t: Testimonial) => {
    const result = await Swal.fire({
      title: `Delete review from "${t.name}"?`,
      text: 'It will be removed from the website too. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    deleteTestimonial.mutate(t._id, {
      onSuccess: () => { if (selectedId === t._id) setSelectedId(null); showSuccess('Testimonial deleted'); },
      onError: (err) => showError(errorMessage(err, 'Could not delete the testimonial.')),
    });
  };

  const openSettings = () => {
    if (section) setSettingsForm({ eyebrow: section.eyebrow, heading: section.heading, highlight: section.highlight, minRating: section.minRating });
    setSettingsOpen(true);
  };
  const saveSettings = () => {
    updateSection.mutate(settingsForm, {
      onSuccess: () => { setSettingsOpen(false); showSuccess('Settings saved'); },
      onError: (err) => showError(errorMessage(err, 'Could not save the settings.')),
    });
  };

  const statusSelect = (t: Testimonial) => (
    <select
      value={t.status}
      disabled={!canEdit}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => changeStatus(t._id, e.target.value as TestimonialStatus)}
      className={`h-[24px] cursor-pointer appearance-none rounded-[4px] bg-[right_6px_center] bg-no-repeat px-[8px] pr-[22px] text-[11px] font-bold shadow-xs outline-none transition disabled:cursor-not-allowed ${STATUS_STYLES[t.status]}`}
      style={{ backgroundImage: SELECT_ARROW }}
    >
      <option value="PUBLISHED" className="bg-white font-bold text-[#23714a]">Published</option>
      <option value="PENDING" className="bg-white font-bold text-[#b78103]">Pending Review</option>
      <option value="HIDDEN" className="bg-white font-bold text-[#c62828]">Hidden</option>
    </select>
  );

  const saving = createTestimonial.isPending || updateTestimonial.isPending;

  return (
    <PageShell
      title="Testimonials Management"
      description="Manage customer reviews, ratings, locations and initials badges for the website's home page carousel."
      actions={
        <div className="flex flex-wrap items-center gap-[8px]">
          <a
            href={`${WEBSITE_ORIGIN}/`}
            target="_blank"
            rel="noreferrer"
            className="flex h-[30px] items-center gap-[5px] rounded-[6px] border border-[#fed7aa] bg-[#fff7ed] px-[12px] text-[11px] font-semibold text-[#ea580c] shadow-sm transition hover:bg-[#ffedd5] active:scale-95"
          >
            <ExternalLink className="h-[13px] w-[13px]" strokeWidth={1.8} />
            View on Website
          </a>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={openSettings}
                className="flex h-[30px] items-center gap-[5px] rounded-[6px] bg-[#233D4D] px-[12px] text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1a2f3c] active:scale-95"
              >
                <Settings className="h-[13px] w-[13px]" strokeWidth={1.8} />
                Settings
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="flex h-[30px] items-center gap-[5px] rounded-[6px] bg-[#3e8914] px-[12px] text-[11px] font-semibold text-white shadow-[0_5px_12px_rgba(62,137,20,0.25)] transition hover:bg-[#347311] active:scale-95"
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={1.8} />
                Add New Testimonial
              </button>
            </>
          )}
        </div>
      }
    >
      {/* Stat cards */}
      <div className="mb-[12px] grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="relative flex h-[90px] flex-col overflow-hidden rounded-[10px] border bg-white p-2 transition-all hover:translate-y-[-1px]"
              style={{ background: item.gradient, borderColor: item.borderColor, boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }}
            >
              <div className="flex items-start gap-1.5">
                <div className={`grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full bg-white/80 shadow-xs ring-1 ${toneClass[item.tone]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold tracking-[0.01em] text-slate-900">{item.title}</p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-[19px] font-semibold leading-none tracking-[-0.04em]" style={{ color: item.numColor }}>{item.value}</span>
                    {item.suffix && <span className="mb-0.5 text-[11px] font-bold text-slate-500">{item.suffix}</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={item.onClick}
                className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-1 truncate text-[11px] font-semibold text-[#293957] transition hover:text-blue-600"
              >
                {item.footer}
                <ArrowRight className="h-3 w-3 shrink-0" />
              </button>
            </div>
          );
        })}
      </div>

      <section className="grid items-start gap-[14px] xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: filters + table / grid */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[8px]">
            <input
              value={query}
              onChange={(e) => applyFilters(() => setQuery(e.target.value))}
              placeholder="Search testimonials by name, role, review or location..."
              className="h-[36px] min-w-[220px] flex-1 rounded-[6px] border border-[#dfe4e8] bg-white px-[12px] text-[12px] font-semibold text-[#273655] outline-none placeholder:font-medium placeholder:text-[#8b95a7] focus:border-[#3e8914]"
            />
            <select value={statusFilter} onChange={(e) => applyFilters(() => setStatusFilter(e.target.value as StatusFilter))} className={FILTER}>
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="PENDING">Pending Review</option>
              <option value="HIDDEN">Hidden</option>
            </select>
            <select value={locationFilter} onChange={(e) => applyFilters(() => setLocationFilter(e.target.value))} className={FILTER}>
              <option value="">All Locations</option>
              {locations.map((l) => <option key={l} value={l}>📍 {l}</option>)}
            </select>
            <select value={ratingFilter} onChange={(e) => applyFilters(() => setRatingFilter(Number(e.target.value)))} className={FILTER}>
              <option value={0}>All Ratings</option>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
            </select>
            <div className="flex items-center gap-[3px] rounded-[6px] border border-[#dfe4e8] bg-white p-[3px]">
              {(['table', 'grid'] as const).map((mode) => {
                const ModeIcon = mode === 'table' ? List : Grid;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    title={mode === 'table' ? 'Table View' : 'Grid View'}
                    className={`flex h-[28px] w-[28px] items-center justify-center rounded-[4px] transition ${viewMode === mode ? 'bg-[#233D4D] text-white' : 'text-[#59657a] hover:bg-slate-100'}`}
                  >
                    <ModeIcon className="h-[14px] w-[14px]" />
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={clearFilters} className="inline-flex h-[36px] items-center gap-[6px] rounded-[6px] border border-[#dfe4e8] bg-white px-[12px] text-[12px] font-semibold text-[#35445f] hover:bg-slate-50">
              <RefreshCw className="h-[13px] w-[13px]" />
              Clear
            </button>
          </div>

          {isLoading ? (
            <p className="mt-3 rounded-[7px] border border-[#e8e5df] py-12 text-center text-[12px] text-[#6c7587]">Loading testimonials…</p>
          ) : error ? (
            <p className="mt-3 rounded-[7px] border border-[#e8e5df] py-12 text-center text-[12px] font-semibold text-red-600">{errorMessage(error, 'Could not load testimonials.')}</p>
          ) : viewMode === 'table' ? (
            <div className="mt-[12px] overflow-hidden rounded-[7px] border border-[#e8e5df] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <thead>
                    <tr className="h-[36px] bg-[#233D4D]">
                      {['Order', 'Testimonial Name', 'Location', 'Rating', 'Updated By', 'Status'].map((h) => (
                        <th key={h} className="whitespace-nowrap px-[10px] py-[6px] text-[11px] font-bold uppercase tracking-wider text-white">{h}</th>
                      ))}
                      <th className="px-[10px] py-[6px] text-right text-[11px] font-bold uppercase tracking-wider text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0ec]">
                    {rows.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-[12px] font-medium text-slate-500">No testimonials match your filters.</td></tr>
                    ) : (
                      rows.map((t) => (
                        <tr key={t._id} onClick={() => setSelectedId(t._id)} className={`cursor-pointer transition hover:bg-slate-50/80 ${selected?._id === t._id ? 'bg-[#f4faf0]' : ''}`}>
                          <td className="whitespace-nowrap px-[10px] py-[7px] text-[11px] font-semibold text-[#293681]">#{t.sortOrder}</td>
                          <td className="px-[10px] py-[7px]">
                            <div className="flex min-w-[200px] items-center gap-[10px]">
                              <InitialsBadge name={t.name} color={t.color} size={32} textSize={11} />
                              <div className="min-w-0">
                                <p className="truncate text-[12px] font-bold" style={{ color: t.color }}>{t.name}</p>
                                <p className="truncate text-[11px] font-semibold text-[#4B1426]">{t.role || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-[10px] py-[7px]">
                            {t.location ? (
                              <span className="flex items-center gap-1 text-[12px] font-bold text-[#0f766e]">
                                <MapPin className="h-3 w-3 shrink-0 text-[#d26019]" />
                                {t.location}
                              </span>
                            ) : (
                              <span className="text-[12px] text-slate-400">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-[10px] py-[7px]">
                            <div className="flex items-center gap-[6px]">
                              <RatingStars value={t.rating} />
                              <span className="text-[11px] font-bold text-[#b45309]">{t.rating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-[10px] py-[7px]">
                            <span className="block text-[12px] font-bold text-[#dc2626]">{t.updatedBy?.name ?? 'Website default'}</span>
                            <span className="block text-[11px] font-medium text-[#64748b]">{formatDateTime(t.updatedAt)}</span>
                          </td>
                          <td className="px-[10px] py-[7px]">{statusSelect(t)}</td>
                          <td className="px-[10px] py-[7px]">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" title="View Details" onClick={(e) => { e.stopPropagation(); setSelectedId(t._id); }} className={`${ICON_BUTTON} border-orange-400/30 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20`}>
                                <Eye className="h-[13px] w-[13px]" />
                              </button>
                              {canEdit && (
                                <>
                                  <button type="button" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(t); }} className={`${ICON_BUTTON} border-blue-400/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20`}>
                                    <Pencil className="h-[13px] w-[13px]" />
                                  </button>
                                  <button type="button" title="Delete" onClick={(e) => { e.stopPropagation(); void remove(t); }} className={`${ICON_BUTTON} border-red-400/30 bg-red-500/10 text-red-600 hover:bg-red-500/20`}>
                                    <Trash2 className="h-[13px] w-[13px]" />
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

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[7px] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#2563eb]">Total Testimonials: <strong className="font-bold text-[#1d4ed8]">{filtered.length}</strong></span>
                  {filtered.length > 0 && (
                    <span className="text-[11px] text-[#8a92a0]">(Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length})</span>
                  )}
                </div>
                <div className="flex items-center gap-[4px]">
                  <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex h-[24px] w-[24px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`flex h-[24px] min-w-[24px] items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-bold ${safePage === n ? 'border-[#233D4D] bg-[#233D4D] text-white' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'}`}
                    >
                      {n}
                    </button>
                  ))}
                  <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="flex h-[24px] w-[24px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="ml-2 h-[24px] rounded-[4px] border border-[#d8dce2] bg-white px-[6px] text-[11px] font-semibold text-[#334155] outline-none">
                    {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-[12px] grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {rows.length === 0 && <p className="col-span-full py-12 text-center text-[12px] text-slate-500">No testimonials match your filters.</p>}
              {rows.map((t) => (
                <div
                  key={t._id}
                  onClick={() => setSelectedId(t._id)}
                  className={`flex cursor-pointer flex-col rounded-[10px] border bg-white p-3.5 shadow-sm transition-all ${selected?._id === t._id ? 'border-[#3e8914] shadow-md ring-2 ring-[#3e8914]/25' : 'border-[#e4e7eb] hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <InitialsBadge name={t.name} color={t.color} size={40} textSize={13} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold" style={{ color: t.color }}>{t.name}</p>
                      <span className="block truncate text-[11px] font-semibold text-[#4B1426]">{t.role || '—'}</span>
                      {t.location && (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-[#d26019]"><MapPin className="h-3 w-3" />{t.location}</span>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                  </div>
                  <p className="mt-2.5 line-clamp-3 rounded-[5px] border border-slate-100 bg-slate-50/70 p-2 text-[11.5px] font-medium italic leading-relaxed text-[#475569]">&ldquo;{t.message}&rdquo;</p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                    <div className="flex items-center gap-1"><RatingStars value={t.rating} size={11} /><span className="font-bold text-[#b45309]">{t.rating.toFixed(1)}</span></div>
                    <span className="font-semibold text-[#dc2626]">{formatDateTime(t.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: details of the selected review */}
        <aside className="border border-[#d1d5db] bg-white px-[14px] py-[13px]">
          <h2 className="text-[14px] font-bold text-[#19274a]">Testimonial Details</h2>
          {selected ? (
            <div className="mt-[12px]">
              <div className="flex flex-col items-center rounded-[8px] border border-[#e4e7eb] bg-[#fafbfc] p-4 text-center shadow-inner">
                <InitialsBadge name={selected.name} color={selected.color} size={56} textSize={18} />
                <p className="mt-2.5 text-[14px] font-bold" style={{ color: selected.color }}>{selected.name}</p>
                {selected.role && <p className="text-[11px] font-semibold text-[#4B1426]">{selected.role}</p>}
                {selected.location && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#d26019]"><MapPin className="h-3 w-3" />{selected.location}</p>
                )}
                <div className="mt-1.5 flex items-center gap-1"><RatingStars value={selected.rating} /><span className="text-[11px] font-bold text-[#b45309]">{selected.rating.toFixed(1)}</span></div>
              </div>

              <div className="mt-[10px] rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5 text-[12px] font-medium italic leading-[1.5] text-[#334155]">
                &ldquo;{selected.message}&rdquo;
              </div>

              <div className="mt-[10px] flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#475569]">
                  <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: selected.color }} />
                  Badge Theme
                </span>
                <span className={`rounded-[4px] px-[8px] py-[2px] text-[11px] font-bold ${STATUS_STYLES[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
              </div>

              <div className="mt-[12px] space-y-[7px] text-[12px]">
                {[
                  { label: 'Location:', value: selected.location || '—', className: 'text-[#0f766e]' },
                  { label: 'Rating:', value: `${selected.rating} / 5 Stars`, className: 'text-[#b45309]' },
                  { label: 'Display order:', value: `#${selected.sortOrder}`, className: 'text-[#293681]' },
                  { label: 'Added on:', value: formatDateTime(selected.createdAt), className: 'text-[#4B1426]' },
                  { label: 'Added by:', value: selected.createdBy?.name ?? 'Website default', className: 'text-[#dc2626]' },
                ].map((row) => (
                  <p key={row.label} className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#69758c]">{row.label}</span>
                    <span className={`text-right font-bold ${row.className}`}>{row.value}</span>
                  </p>
                ))}
              </div>

              {canEdit && (
                <div className="mt-[14px] flex items-center gap-2 border-t border-[#f0f2f5] pt-3">
                  <button type="button" onClick={() => openEdit(selected)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-[#d8dce2] bg-white py-1.5 text-[11px] font-bold text-[#334155] hover:bg-slate-50">
                    <Pencil className="h-3 w-3 text-blue-600" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => changeStatus(selected._id, selected.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-[#d8dce2] bg-white py-1.5 text-[11px] font-bold text-[#334155] hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3 w-3 text-emerald-600" /> {selected.status === 'PUBLISHED' ? 'Hide' : 'Publish'}
                  </button>
                  <button type="button" onClick={() => void remove(selected)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-rose-200 bg-rose-50 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100">
                    <Trash2 className="h-3 w-3 text-rose-600" /> Delete
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"><MessageCircleMore className="h-5 w-5" /></div>
              <p className="text-[13px] font-bold text-[#19274a]">No Testimonial Selected</p>
              <p className="mt-1 max-w-[210px] text-[11px] leading-relaxed text-[#69758c]">Add a testimonial or pick one from the table to see its details here.</p>
            </div>
          )}
        </aside>
      </section>

      {/* Add / edit modal */}
      {formOpen && (
        <Modal title={editingId ? 'Edit Testimonial' : 'Add New Testimonial'} onClose={() => setFormOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setFormOpen(false)} className="h-[34px] rounded-[4px] bg-[#fff1f2] px-[14px] text-[12px] font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100">Cancel</button>
              <button type="button" onClick={saveForm} disabled={saving} className="h-[34px] rounded-[4px] bg-[#3e8914] px-[14px] text-[12px] font-semibold text-white hover:bg-[#347311] disabled:opacity-60">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Testimonial'}
              </button>
            </>
          }
        >
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="t-name">Reviewer Full Name <span className="text-red-500">*</span></label>
                <input id="t-name" value={form.name} onChange={(e) => setField({ name: e.target.value })} maxLength={80} placeholder="e.g. Anjali Mehra" className={INPUT} />
              </div>
              <div>
                <label className={LABEL} htmlFor="t-role">Service / Role</label>
                <input id="t-role" value={form.role} onChange={(e) => setField({ role: e.target.value })} maxLength={120} placeholder="e.g. AC Service customer" className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL} htmlFor="t-location">Location</label>
                <input id="t-location" value={form.location} onChange={(e) => setField({ location: e.target.value })} maxLength={80} placeholder="e.g. Indirapuram" className={INPUT} />
              </div>
              <div>
                <label className={LABEL} htmlFor="t-status">Status</label>
                <select
                  id="t-status"
                  value={form.status}
                  onChange={(e) => setField({ status: e.target.value as TestimonialStatus })}
                  className={`h-[36px] w-full cursor-pointer appearance-none rounded-[4px] bg-[right_10px_center] bg-no-repeat px-[10px] pr-[28px] text-[12px] font-bold outline-none ${STATUS_STYLES[form.status]}`}
                  style={{ backgroundImage: SELECT_ARROW }}
                >
                  <option value="PUBLISHED">Published (on website)</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="HIDDEN">Hidden (not shown)</option>
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="t-order">Display Order</label>
                <input id="t-order" type="number" min={0} value={form.sortOrder} onChange={(e) => setField({ sortOrder: Math.max(0, Number(e.target.value) || 0) })} className={INPUT} />
              </div>
            </div>

            {/* Initials badge + colour */}
            <div className="rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className={LABEL}>Initials Badge & Color</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Badge: {getInitials(form.name) || 'CC'}</span>
              </div>
              <div className="flex items-center gap-3">
                <InitialsBadge name={form.name} color={form.color} size={48} textSize={16} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-600"><Palette className="h-3 w-3 text-[#3e8914]" /> Accent Color:</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        title={preset.label}
                        onClick={() => setField({ color: preset.value })}
                        className={`h-6 w-6 rounded-full border-2 shadow-xs transition-transform hover:scale-110 ${form.color.toLowerCase() === preset.value ? 'scale-110 border-slate-800 ring-2 ring-slate-400' : 'border-white'}`}
                        style={{ backgroundColor: preset.value }}
                      />
                    ))}
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[#cbd5e1] bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                      Custom:
                      <input type="color" value={form.color} onChange={(e) => setField({ color: e.target.value })} className="h-4 w-5 cursor-pointer border-none bg-transparent" />
                    </label>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">No photo needed — the website shows the first & last name initials ({getInitials(form.name) || 'AM'}) in this colour.</p>
            </div>

            <div>
              <span className={LABEL}>Rating (1 to 5 Stars) <span className="text-red-500">*</span></span>
              <div className="flex items-center gap-3 rounded-[4px] border border-[#e2e8f0] p-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setField({ rating: s })} className="p-0.5 transition-transform hover:scale-125" aria-label={`${s} stars`}>
                      <Star size={22} strokeWidth={1.8} className={s <= form.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-300'} />
                    </button>
                  ))}
                </div>
                <span className="text-[13px] font-bold text-[#b45309]">{form.rating}.0 / 5.0 Stars</span>
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="t-message">Review / Message <span className="text-red-500">*</span></label>
              <textarea
                id="t-message"
                rows={4}
                maxLength={1000}
                value={form.message}
                onChange={(e) => setField({ message: e.target.value })}
                placeholder="What the customer said about the service…"
                className="w-full resize-y rounded-[4px] border border-[#cbd5e1] px-2.5 py-2 text-[12px] font-medium text-[#1e293b] outline-none placeholder:text-slate-400 focus:border-[#3e8914]"
              />
              <p className="mt-0.5 text-right text-[10px] text-slate-400">{form.message.length}/1000 · cards show the first 145 characters with “Read more”</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <Modal title="Testimonial Display Settings" onClose={() => setSettingsOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setSettingsOpen(false)} className="h-[34px] rounded-[4px] bg-[#fff1f2] px-[14px] text-[12px] font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100">Cancel</button>
              <button type="button" onClick={saveSettings} disabled={updateSection.isPending} className="h-[34px] rounded-[4px] bg-[#3e8914] px-[14px] text-[12px] font-semibold text-white hover:bg-[#347311] disabled:opacity-60">
                {updateSection.isPending ? 'Saving…' : 'Save Settings'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="space-y-3 rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5">
              <h3 className="text-[13px] font-bold text-[#0f172a]">Section Heading</h3>
              <div>
                <label className={LABEL} htmlFor="s-eyebrow">Small text above heading</label>
                <input id="s-eyebrow" value={settingsForm.eyebrow} maxLength={60} onChange={(e) => setSettingsForm((f) => ({ ...f, eyebrow: e.target.value }))} placeholder="What customers say" className={INPUT} />
              </div>
              <div>
                <label className={LABEL} htmlFor="s-heading">Heading <span className="text-red-500">*</span></label>
                <input id="s-heading" value={settingsForm.heading} maxLength={120} onChange={(e) => setSettingsForm((f) => ({ ...f, heading: e.target.value }))} placeholder="Loved by thousands of happy families." className={INPUT} />
              </div>
              <div>
                <label className={LABEL} htmlFor="s-highlight">Green part of the heading</label>
                <input id="s-highlight" value={settingsForm.highlight} maxLength={80} onChange={(e) => setSettingsForm((f) => ({ ...f, highlight: e.target.value }))} placeholder="happy families." className={INPUT} />
                <p className="mt-0.5 text-[10px] text-slate-400">Must be part of the heading text.</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5">
              <div>
                <p className="text-[12px] font-bold text-[#1e293b]">Minimum rating on website</p>
                <p className="text-[11px] text-[#64748b]">Only published reviews with this rating or higher show in the carousel.</p>
              </div>
              <select value={settingsForm.minRating} onChange={(e) => setSettingsForm((f) => ({ ...f, minRating: Number(e.target.value) }))} className={`${FILTER} shrink-0`}>
                <option value={5}>5 stars only</option>
                <option value={4}>4 stars & above</option>
                <option value={3}>3 stars & above</option>
                <option value={1}>All ratings</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}

function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[8px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-[#e8e5df] px-4 py-3">
          <h2 className="text-[15px] font-bold text-[#18233b]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#6c7587] hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}
