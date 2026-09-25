'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit, Image as ImageIcon, Plus, Search, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  useHeroSlides, useCreateHeroSlide, useUpdateHeroSlide, useDeleteHeroSlide,
  HeroSlide, HeroSlideInput, HeroSlideStatus,
} from '@/lib/hooks/useHeroSlides';

const EMPTY_FORM: HeroSlideInput = {
  subtitle: '', titleLine1: '', titleLine2: '', description: '', altText: '',
  sortOrder: 0, status: 'ACTIVE',
};

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: '#1e2433',
  color: '#e2e8f0',
});

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Toast.fire({
    icon,
    title,
    iconColor: icon === 'success' ? '#4ade80' : icon === 'error' ? '#f87171' : '#facc15',
  });
}

// Flat, square-cornered fields — no rounded-* — same brand language as the
// Design House admin's forms, just with CityCalls' green (#3e8914) standing
// in for their blue (#134698).
const FIELD_SM = 'w-full px-3 py-2 border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-xs shadow-sm';
const FIELD_LG = 'w-full px-4 py-3 border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-sm shadow-lg';
const LABEL_SM = 'block text-xs font-medium text-gray-700 mb-1';
const LABEL_LG = 'block text-sm font-medium text-gray-700 mb-2';

// HeroSlide.image is stored as whatever the upload endpoint returned — an
// absolute Cloudinary URL, or a relative "/uploads/..." path from the local
// fallback adapter. Same resolution rule as useFiles.ts's resolveFileUrl,
// just applied to a plain string instead of an UploadedFile object.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
function resolveImageUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}

export default function HeroSlidesPage() {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HeroSlideInput>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: slides, isLoading, isError: hasLoadError } = useHeroSlides();
  const createSlide = useCreateHeroSlide();
  const updateSlide = useUpdateHeroSlide();
  const deleteSlide = useDeleteHeroSlide();
  const imageUpload = useUploadFile('HERO_SLIDE', editingId ?? 'new', { skipGlobalToast: true });

  const isSaving = createSlide.isPending || updateSlide.isPending || imageUpload.isPending;

  useEffect(() => {
    if (hasLoadError) {
      showToast('error', 'Failed to load hero slides');
    }
  }, [hasLoadError]);

  const filteredSlides = useMemo(() => {
    if (!slides) return [];
    if (!search.trim()) return slides;
    const q = search.toLowerCase();
    return slides.filter((s) =>
      [s.subtitle, s.titleLine1, s.titleLine2].some((v) => v?.toLowerCase().includes(q))
    );
  }, [slides, search]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
  }

  function startEdit(slide: HeroSlide) {
    setEditingId(slide._id);
    setForm({
      subtitle: slide.subtitle ?? '',
      titleLine1: slide.titleLine1 ?? '',
      titleLine2: slide.titleLine2 ?? '',
      description: slide.description ?? '',
      altText: slide.altText ?? '',
      sortOrder: slide.sortOrder,
      status: slide.status,
    });
    setImageFile(null);
    setImagePreview(resolveImageUrl(slide.image));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('error', 'Please choose a JPG, PNG, or WebP image');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Hero image must be 10 MB or smaller');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId && !imageFile) {
      showToast('warning', 'Hero image is required');
      return;
    }
    try {
      let slideId = editingId;

      if (slideId) {
        await updateSlide.mutateAsync({ id: slideId, ...form });
      } else {
        const created = await createSlide.mutateAsync(form);
        slideId = created._id;
      }

      if (imageFile && slideId) {
        const uploaded = await imageUpload.upload(imageFile, 'WEBSITE_HERO_IMAGE', slideId);
        await updateSlide.mutateAsync({ id: slideId, image: uploaded.url });
      }

      showToast('success', editingId ? 'Hero slide updated' : 'Hero slide created');
      resetForm();
    } catch {
      showToast('error', 'Failed to save hero slide');
    }
  }

  async function handleDelete(id: string) {
    const result = await Swal.fire({
      title: 'Delete this hero slide?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    deleteSlide.mutate(id, {
      onSuccess: () => {
        showToast('success', 'Hero slide deleted');
        if (editingId === id) resetForm();
      },
      onError: () => showToast('error', 'Failed to delete hero slide'),
    });
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="flex min-h-full flex-col p-6" style={{ zoom: 0.75 }}>
        <div className="mb-4 pb-3 border-b-2 border-black">
          <h1 className="text-xl font-bold text-[#3e8914] uppercase tracking-wide">Hero Carousel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage the home page&apos;s hero carousel slides.</p>
        </div>

        {/* CREATE / EDIT FORM */}
        <div className="bg-white border-2 border-gray-200 p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-100">
            <div className="p-2 bg-[#3e8914]/10">
              <ImageIcon className="w-4 h-4 text-[#3e8914]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Hero Slide' : 'Create New Hero Slide'}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={LABEL_SM}>Subtitle <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., Premium Home Cleaning"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  maxLength={100}
                  required
                  className={FIELD_SM}
                />
              </div>

              <div>
                <label className={LABEL_SM}>Title (line 1) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., Spotless Homes,"
                  value={form.titleLine1}
                  onChange={(e) => setForm((f) => ({ ...f, titleLine1: e.target.value }))}
                  maxLength={120}
                  required
                  className={FIELD_SM}
                />
              </div>

              <div>
                <label className={LABEL_SM}>Title (line 2 / highlight) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., Zero Hassle."
                  value={form.titleLine2}
                  onChange={(e) => setForm((f) => ({ ...f, titleLine2: e.target.value }))}
                  maxLength={120}
                  required
                  className={FIELD_SM}
                />
              </div>

              <div>
                <label className={LABEL_SM}>Sort Order</label>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className={`${FIELD_SM} font-bold text-[#3e8914]`}
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className={LABEL_SM}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as HeroSlideStatus }))}
                  className={FIELD_SM}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className={LABEL_LG}>Description <span className="text-red-500">*</span></label>
                <textarea
                  placeholder="e.g., Experience the pinnacle of cleanliness with our background-verified professionals..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={500}
                  required
                  rows={4}
                  className={`${FIELD_LG} resize-none`}
                />
              </div>

              <div className="md:col-span-4">
                <label className={LABEL_LG}>Hero Image <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  required={!editingId}
                  className={FIELD_LG}
                />
                {imagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="Preview" className="mt-3 w-32 h-32 object-cover border-2 border-gray-300 shadow-lg" />
                )}
              </div>

              <div className="md:col-span-4">
                <label className={LABEL_LG}>Alt Text <span className="text-gray-400 text-xs">(SEO)</span></label>
                <input
                  type="text"
                  placeholder="e.g., Salon technician at a customer's home"
                  value={form.altText}
                  onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))}
                  maxLength={160}
                  className={FIELD_LG}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-500 text-white font-bold transition-all shadow-lg hover:shadow-xl uppercase tracking-wider text-sm flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-[#3e8914] hover:bg-[#347311] text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 uppercase tracking-wider text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{editingId ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{editingId ? 'Update Slide' : 'Create Slide'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* LIST */}
        <div className="bg-white border-2 border-gray-200 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b bg-[#233D4D]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-white">Hero Slides List</h2>
                <p className="text-sm text-slate-200 mt-0.5">
                  {isLoading ? 'Loading...' : `Showing ${filteredSlides.length} of ${slides?.length ?? 0} slides`}
                </p>
              </div>

              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder="Search slides..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-sm text-white bg-white/10 border-2 border-white/20 placeholder:text-white/60 focus:outline-none focus:border-white transition-colors shadow-lg"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <Table className="min-w-[1575px] whitespace-nowrap border-collapse text-left">
              <TableHeader>
                <TableRow className="h-[43px] border-b border-[#e8e5df] bg-[#233D4D] hover:bg-[#233D4D]">
                  <TableHead className="h-auto w-[93px] px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">S.NO</TableHead>
                  <TableHead className="h-auto px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Image</TableHead>
                  <TableHead className="h-auto px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Alt Text</TableHead>
                  <TableHead className="h-auto px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Title</TableHead>
                  <TableHead className="h-auto px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Subtitle</TableHead>
                  <TableHead className="h-auto px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Button 1</TableHead>
                  <TableHead className="h-auto px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Button 2</TableHead>
                  <TableHead className="h-auto px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Schedule</TableHead>
                  <TableHead className="h-auto w-[93px] px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Order</TableHead>
                  <TableHead className="h-auto w-[123px] px-[16px] py-[8px] text-[11.5px] font-bold text-white uppercase tracking-wider">Status</TableHead>
                  <TableHead className="h-auto w-[123px] px-[16px] py-[8px] text-right text-[11.5px] font-bold text-white uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#f0f0ec]">
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-12">Loading slides...</TableCell></TableRow>
                ) : filteredSlides.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-sm text-gray-400 py-12">No hero slides yet. Create one above.</TableCell></TableRow>
                ) : (
                  filteredSlides.map((slide, i) => (
                    <TableRow key={slide._id} className="transition hover:bg-slate-50/80">
                      <TableCell className="px-[16px] py-[11px] text-[10.7px] font-semibold text-[#293681]">#{i + 1}</TableCell>
                      <TableCell className="px-[16px] py-[11px]">
                        <div className="relative flex h-[48px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-[#e4e7eb] bg-[#f8fafc] p-[3px] shadow-xs">
                          {slide.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveImageUrl(slide.image)} alt={slide.altText || ''} className="h-full w-full rounded-[3px] object-cover" />
                          ) : (
                            <ImageIcon className="h-[17px] w-[17px] text-slate-300" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] px-[16px] py-[11px] truncate text-[11.5px] font-medium italic text-[#64748b]">
                        {slide.altText || '—'}
                      </TableCell>
                      <TableCell className="px-[16px] py-[11px] text-[11.5px] font-semibold text-[#111827]">
                        {slide.titleLine1} <span className="text-[#006199]">{slide.titleLine2}</span>
                      </TableCell>
                      <TableCell className="px-[16px] py-[11px] text-[11.5px] font-medium text-[#35445f]">{slide.subtitle}</TableCell>
                      <TableCell className="px-[16px] py-[11px] text-[10.7px] font-semibold text-[#94a3b8]">—</TableCell>
                      <TableCell className="px-[16px] py-[11px] text-[10.7px] font-semibold text-[#94a3b8]">—</TableCell>
                      <TableCell className="px-[16px] py-[11px] text-[10.7px] font-medium text-[#64748b]">Not Scheduled</TableCell>
                      <TableCell className="px-[16px] py-[11px] text-[10.7px] font-semibold text-[#293681]">#{slide.sortOrder}</TableCell>
                      <TableCell className="px-[16px] py-[11px]">
                        <span className={`inline-flex h-[32px] items-center rounded-[5px] px-[11px] text-[10.7px] font-bold shadow-xs ${
                          slide.status === 'ACTIVE'
                            ? 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]'
                            : 'border border-[#ef9a9a] bg-[#ffebee] text-[#c62828]'
                        }`}>
                          {slide.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="px-[16px] py-[11px] text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(slide)}
                            className="flex h-[33px] w-[33px] items-center justify-center rounded-[8px] border border-blue-400/30 bg-blue-500/10 text-blue-600 shadow-[0_3px_8px_rgba(37,99,235,0.12)] backdrop-blur-md transition-all hover:scale-105 hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-[0_4px_13px_rgba(37,99,235,0.25)] active:scale-95"
                            title="Edit slide"
                            aria-label="Edit slide"
                          >
                            <Edit className="h-[16px] w-[16px] text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(slide._id)}
                            className="flex h-[33px] w-[33px] items-center justify-center rounded-[8px] border border-red-400/30 bg-red-500/10 text-red-600 shadow-[0_3px_8px_rgba(220,38,38,0.12)] backdrop-blur-md transition-all hover:scale-105 hover:border-red-400/50 hover:bg-red-500/20 hover:shadow-[0_4px_13px_rgba(220,38,38,0.25)] active:scale-95"
                            title="Delete slide"
                            aria-label="Delete slide"
                          >
                            <Trash2 className="h-[16px] w-[16px] text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
