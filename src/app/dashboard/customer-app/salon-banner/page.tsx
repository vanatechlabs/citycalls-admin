'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit, Image as ImageIcon, Plus, Search, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  useSalonBanners, useCreateSalonBanner, useUpdateSalonBanner, useDeleteSalonBanner,
  SalonBanner, SalonBannerInput, SalonBannerStatus,
} from '@/lib/hooks/useSalonBanners';

const EMPTY_FORM: SalonBannerInput = {
  tagLine: '', titleLine1: '', titleLine2: '', description: '', buttonText: 'Book a Service', altText: '',
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

// Same flat, square-cornered fields as the Hero Carousel page.
const FIELD = 'w-full px-3 py-2 border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-sm shadow-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const PAGE_SIZE = 10;

const TH = 'h-auto px-[18px] py-[14px] text-[13.5px] font-bold text-white uppercase tracking-wider';

// Banner.image is whatever the upload endpoint returned — an absolute
// Cloudinary URL, or a relative "/uploads/..." path from the local adapter.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
function resolveImageUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}

function Required() {
  return <span className="text-red-500">*</span>;
}

export default function CustomerAppSalonBannerPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SalonBannerInput>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: banners, isLoading, isError: hasLoadError } = useSalonBanners();
  const createBanner = useCreateSalonBanner();
  const updateBanner = useUpdateSalonBanner();
  const deleteBanner = useDeleteSalonBanner();
  const imageUpload = useUploadFile('APP_SALON_BANNER', editingId ?? 'new', { skipGlobalToast: true });

  // True for the whole save (create → image upload → attach), not just while
  // one request is in flight — the mutations' isPending flags each drop to
  // false between steps, which would briefly re-enable the button. The ref
  // blocks a second submit fired before React re-renders (a fast double-click).
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (hasLoadError) showToast('error', 'Failed to load salon banners');
  }, [hasLoadError]);

  const filteredBanners = useMemo(() => {
    if (!banners) return [];
    if (!search.trim()) return banners;
    const q = search.toLowerCase();
    return banners.filter((b) =>
      [b.tagLine, b.titleLine1, b.titleLine2, b.description].some((v) => v?.toLowerCase().includes(q))
    );
  }, [banners, search]);

  // Clamped so deleting the last banner on a page, or a narrower search,
  // never leaves the table on an empty page.
  const totalPages = Math.max(1, Math.ceil(filteredBanners.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageBanners = filteredBanners.slice(pageStart, pageStart + PAGE_SIZE);

  function set<K extends keyof SalonBannerInput>(key: K, value: SalonBannerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  }

  function openEdit(banner: SalonBanner) {
    setEditingId(banner._id);
    setForm({
      tagLine: banner.tagLine,
      titleLine1: banner.titleLine1,
      titleLine2: banner.titleLine2,
      description: banner.description,
      buttonText: banner.buttonText,
      altText: banner.altText ?? '',
      sortOrder: banner.sortOrder,
      status: banner.status,
    });
    setImageFile(null);
    setImagePreview(resolveImageUrl(banner.image) || null);
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setModalOpen(false);
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
      showToast('error', 'Banner image must be 10 MB or smaller');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef.current) return;
    if (!editingId && !imageFile) {
      showToast('warning', 'Background image is required');
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    const isEdit = !!editingId;
    try {
      let bannerId = editingId;

      if (bannerId) {
        await updateBanner.mutateAsync({ id: bannerId, ...form });
      } else {
        const created = await createBanner.mutateAsync(form);
        bannerId = created._id;
        // If the image step below fails, retrying must update this banner,
        // not create a second copy of it.
        setEditingId(created._id);
      }

      if (imageFile && bannerId) {
        const uploaded = await imageUpload.upload(imageFile, 'APP_SALON_BANNER_IMAGE', bannerId);
        await updateBanner.mutateAsync({ id: bannerId, image: uploaded.url });
      }

      showToast('success', isEdit ? 'Banner updated' : 'Banner created');
      setModalOpen(false);
    } catch {
      showToast('error', 'Failed to save banner');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const result = await Swal.fire({
      title: 'Delete this banner?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    deleteBanner.mutate(id, {
      onSuccess: () => showToast('success', 'Banner deleted'),
      onError: () => showToast('error', 'Failed to delete banner'),
    });
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="flex min-h-full flex-col p-6" style={{ zoom: 0.75 }}>
        <div className="mb-4 pb-3 border-b-2 border-black flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#3e8914] uppercase tracking-wide">Salon Banner</h1>
            <p className="text-base text-gray-600 mt-1">Manage the banners at the top of the customer app&apos;s Salon tab.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="px-5 py-2.5 bg-[#3e8914] hover:bg-[#347311] text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 uppercase tracking-wider text-sm"
          >
            <Plus className="w-4 h-4" /> Add Banner
          </button>
        </div>

        {/* LIST */}
        <div className="bg-white border-2 border-gray-200 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b bg-[#233D4D]">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold text-white">Banner List</h2>
                <p className="text-base text-slate-200 mt-0.5">
                  {isLoading ? 'Loading...' : `Showing ${filteredBanners.length} of ${banners?.length ?? 0} banners`}
                </p>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder="Search banners..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full h-10 pl-10 pr-4 text-sm text-white bg-white/10 border-2 border-white/20 placeholder:text-white/60 focus:outline-none focus:border-white transition-colors shadow-lg"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <Table className="min-w-[1000px] whitespace-nowrap border-collapse text-left">
              <TableHeader>
                <TableRow className="h-[52px] border-b border-[#e8e5df] bg-[#233D4D] hover:bg-[#233D4D]">
                  <TableHead className={`${TH} w-[80px]`}>S.No</TableHead>
                  <TableHead className={TH}>Image</TableHead>
                  <TableHead className={TH}>Tag Line</TableHead>
                  <TableHead className={TH}>Title</TableHead>
                  <TableHead className={TH}>Button</TableHead>
                  <TableHead className={`${TH} w-[80px]`}>Order</TableHead>
                  <TableHead className={`${TH} w-[110px]`}>Status</TableHead>
                  <TableHead className={`${TH} w-[110px] text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#f0f0ec]">
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-base text-muted-foreground py-12">Loading banners...</TableCell></TableRow>
                ) : filteredBanners.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-base text-gray-400 py-12">No banners yet. Click &quot;Add Banner&quot; to create one.</TableCell></TableRow>
                ) : (
                  pageBanners.map((banner, i) => (
                    <TableRow key={banner._id} className="transition hover:bg-slate-50/80">
                      <TableCell className="px-[18px] py-[14px] text-[15px] font-semibold text-[#293681]">{String(pageStart + i + 1).padStart(2, '0')}</TableCell>
                      <TableCell className="px-[18px] py-[14px]">
                        <div className="relative flex h-[64px] w-[116px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-[#e4e7eb] bg-[#f8fafc] p-[3px] shadow-xs">
                          {banner.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveImageUrl(banner.image)} alt={banner.altText || ''} className="h-full w-full rounded-[3px] object-cover" />
                          ) : (
                            <ImageIcon className="h-[17px] w-[17px] text-slate-300" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-[18px] py-[14px] text-[15px] font-medium text-[#35445f]">{banner.tagLine}</TableCell>
                      <TableCell className="px-[18px] py-[14px] text-[16px] font-semibold text-[#111827]">
                        {banner.titleLine1} <span className="text-[#3e8914]">{banner.titleLine2}</span>
                      </TableCell>
                      <TableCell className="px-[18px] py-[14px] text-[15px] font-medium text-[#35445f]">{banner.buttonText}</TableCell>
                      <TableCell className="px-[18px] py-[14px] text-[15px] font-semibold text-[#293681]">{String(banner.sortOrder).padStart(2, '0')}</TableCell>
                      <TableCell className="px-[18px] py-[14px]">
                        <span className={`inline-flex h-[34px] items-center rounded-[5px] px-[14px] text-[13.5px] font-bold shadow-xs ${
                          banner.status === 'ACTIVE'
                            ? 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]'
                            : 'border border-[#ef9a9a] bg-[#ffebee] text-[#c62828]'
                        }`}>
                          {banner.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="px-[18px] py-[14px] text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(banner)}
                            className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] border border-blue-400/30 bg-blue-500/10 text-blue-600 shadow-[0_3px_8px_rgba(37,99,235,0.12)] backdrop-blur-md transition-all hover:scale-105 hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-[0_4px_13px_rgba(37,99,235,0.25)] active:scale-95"
                            title="Edit banner"
                            aria-label="Edit banner"
                          >
                            <Edit className="h-[18px] w-[18px] text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner._id)}
                            className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] border border-red-400/30 bg-red-500/10 text-red-600 shadow-[0_3px_8px_rgba(220,38,38,0.12)] backdrop-blur-md transition-all hover:scale-105 hover:border-red-400/50 hover:bg-red-500/20 hover:shadow-[0_4px_13px_rgba(220,38,38,0.25)] active:scale-95"
                            title="Delete banner"
                            aria-label="Delete banner"
                          >
                            <Trash2 className="h-[18px] w-[18px] text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION */}
          {filteredBanners.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-gray-100 bg-white px-6 py-4">
              <p className="text-[15px] text-gray-600">
                Showing <span className="font-semibold text-gray-900">{pageStart + 1}</span>–<span className="font-semibold text-gray-900">{pageStart + pageBanners.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{filteredBanners.length}</span> banners
              </p>
              <nav className="flex items-center gap-1.5" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex h-10 items-center gap-1 border-2 border-gray-300 bg-white px-3 text-[14px] font-semibold text-gray-700 transition-colors hover:border-[#3e8914] hover:text-[#3e8914] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, n) => n + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === currentPage ? 'page' : undefined}
                    className={`h-10 min-w-10 border-2 px-3 text-[14px] font-bold transition-colors ${
                      n === currentPage
                        ? 'border-[#3e8914] bg-[#3e8914] text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-[#3e8914] hover:text-[#3e8914]'
                    }`}
                  >
                    {String(n).padStart(2, '0')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex h-10 items-center gap-1 border-2 border-gray-300 bg-white px-3 text-[14px] font-semibold text-gray-700 transition-colors hover:border-[#3e8914] hover:text-[#3e8914] disabled:pointer-events-none disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT POPUP */}
      {modalOpen && (
        // Clicking the backdrop does nothing on purpose — only the X and
        // Cancel buttons close the form, so a stray click can't lose input.
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="salon-banner-modal-title"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b-2 border-gray-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#3e8914]/10">
                  <ImageIcon className="w-4 h-4 text-[#3e8914]" />
                </div>
                <h2 id="salon-banner-modal-title" className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Banner' : 'Add Banner'}
                </h2>
              </div>
              <button type="button" onClick={closeModal} disabled={isSaving} aria-label="Close" className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={LABEL}>Tag Line <Required /></label>
                  <input type="text" required maxLength={60} placeholder="e.g., Salon at Home"
                    value={form.tagLine} onChange={(e) => set('tagLine', e.target.value)} className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>Title Line 1 <Required /></label>
                  <input type="text" required maxLength={60} placeholder="e.g., Haircut & Styling"
                    value={form.titleLine1} onChange={(e) => set('titleLine1', e.target.value)} className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>Title Line 2 <Required /> <span className="text-gray-400">(highlighted)</span></label>
                  <input type="text" required maxLength={60} placeholder="e.g., At Your Doorstep"
                    value={form.titleLine2} onChange={(e) => set('titleLine2', e.target.value)} className={FIELD} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Description <Required /></label>
                  <textarea required maxLength={200} rows={3} placeholder="e.g., Trained stylists with salon-grade products, at home."
                    value={form.description} onChange={(e) => set('description', e.target.value)} className={`${FIELD} resize-none`} />
                </div>
                <div>
                  <label className={LABEL}>Button Text <Required /></label>
                  <input type="text" required maxLength={40} placeholder="e.g., Book Now"
                    value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} className={FIELD} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Status</label>
                    <select value={form.status} onChange={(e) => set('status', e.target.value as SalonBannerStatus)} className={FIELD}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Order</label>
                    <input type="number" min={0} value={form.sortOrder}
                      onChange={(e) => set('sortOrder', Math.max(0, Number(e.target.value) || 0))} className={FIELD} />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={LABEL}>Background Image {!editingId && <Required />} <span className="text-gray-400">(JPG/PNG/WebP, max 10 MB, wide ~16:9)</span></label>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange}
                    className="w-full text-sm file:mr-3 file:border-0 file:bg-[#3e8914] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#347311]" />
                  {imagePreview && (
                    // Rough preview of how the slide reads in the app: photo
                    // full-bleed, dark fade on the left behind the text.
                    <div className="relative mt-3 h-[150px] w-full max-w-[340px] overflow-hidden rounded-[16px] bg-[#151515]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#151515] via-[#151515]/80 to-transparent" />
                      <div className="relative flex h-full flex-col p-3 text-white">
                        <span className="self-start rounded-full border border-[#8BD450] px-2 py-0.5 text-[9px] font-semibold text-[#8BD450]">{form.tagLine || 'Tag line'}</span>
                        <span className="mt-2 text-base font-bold leading-tight">{form.titleLine1 || 'Title line 1'}</span>
                        <span className="text-base font-bold leading-tight text-[#8BD450]">{form.titleLine2 || 'Title line 2'}</span>
                        <span className="mt-1 max-w-[55%] text-[9px] leading-snug">{form.description || 'Description'}</span>
                        <span className="mt-auto self-start rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#0F172A]">{form.buttonText || 'Button'} ›</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Image Alt Text</label>
                  <input type="text" maxLength={160} placeholder="e.g., Stylist giving a haircut at home"
                    value={form.altText} onChange={(e) => set('altText', e.target.value)} className={FIELD} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gray-500 text-white font-bold transition-all shadow-lg hover:shadow-xl uppercase tracking-wider text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#3e8914] hover:bg-[#347311] text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 uppercase tracking-wider text-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{editingId ? 'Updating...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{editingId ? 'Update Banner' : 'Save Banner'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
