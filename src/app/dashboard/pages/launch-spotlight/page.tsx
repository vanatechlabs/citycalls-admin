'use client';

import { useState } from 'react';
import { ExternalLink, Image as ImageIcon, Plus, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import Swal from 'sweetalert2';

import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  LaunchSpotlightConfig,
  LaunchSpotlightSlide,
  LaunchSpotlightStatus,
  useLaunchSpotlight,
  useUpdateLaunchSpotlight,
} from '@/lib/hooks/useLaunchSpotlight';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const FIELD = 'w-full border-2 border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-[#3e8914]';
const LABEL = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600';

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
  void Toast.fire({ icon, title, iconColor: icon === 'success' ? '#4ade80' : icon === 'error' ? '#f87171' : '#facc15' });
}

function resolveImageUrl(image: string): string {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return `${API_ORIGIN}${image.startsWith('/') ? '' : '/'}${image}`;
}

function makeNewSlide(existingCount: number): LaunchSpotlightSlide {
  return {
    id: `spotlight-${Date.now()}`,
    image: '',
    altText: '',
    badgeText: 'NEW LAUNCH',
    heading: '',
    subheading: '',
    link: '',
    accentColor: '#7cb342',
    sortOrder: existingCount,
    status: 'ACTIVE',
  };
}

function LaunchSpotlightEditor({ initialConfig }: { initialConfig: LaunchSpotlightConfig }) {
  const [slides, setSlides] = useState<LaunchSpotlightSlide[]>(() =>
    [...initialConfig.slides].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  const updateConfig = useUpdateLaunchSpotlight();
  const imageUpload = useUploadFile('LAUNCH_SPOTLIGHT', initialConfig._id, { skipGlobalToast: true });
  const isSaving = updateConfig.isPending || imageUpload.isPending;

  function updateSlide(id: string, patch: Partial<LaunchSpotlightSlide>) {
    setSlides((current) => current.map((slide) => slide.id === id ? { ...slide, ...patch } : slide));
  }

  function handleImage(id: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('error', 'Please choose a JPG, PNG, or WebP image');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Spotlight image must be 10 MB or smaller');
      event.target.value = '';
      return;
    }

    const previousPreview = imagePreviews[id];
    if (previousPreview?.startsWith('blob:')) URL.revokeObjectURL(previousPreview);
    const preview = URL.createObjectURL(file);
    setImageFiles((current) => ({ ...current, [id]: file }));
    setImagePreviews((current) => ({ ...current, [id]: preview }));
  }

  async function removeSlide(id: string) {
    if (slides.length === 1) {
      showToast('warning', 'At least one spotlight slide is required');
      return;
    }
    const result = await Swal.fire({
      title: 'Remove this spotlight slide?',
      text: 'The slide will be removed after you save the changes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove slide',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    setSlides((current) => current.filter((slide) => slide.id !== id));
  }

  async function saveChanges(event: React.FormEvent) {
    event.preventDefault();
    const missingImage = slides.find((slide) => !slide.image && !imageFiles[slide.id]);
    if (missingImage) {
      showToast('warning', `Please upload an image for ${missingImage.heading || 'the new slide'}`);
      return;
    }

    try {
      const nextSlides: LaunchSpotlightSlide[] = [];
      for (const slide of slides) {
        const file = imageFiles[slide.id];
        if (file) {
          const uploaded = await imageUpload.upload(file, 'WEBSITE_SPOTLIGHT_IMAGE', initialConfig._id);
          nextSlides.push({ ...slide, image: uploaded.url });
        } else {
          nextSlides.push(slide);
        }
      }

      const saved = await updateConfig.mutateAsync({ slides: nextSlides });
      setSlides([...saved.slides].sort((a, b) => a.sortOrder - b.sortOrder));
      setImageFiles({});
      setImagePreviews({});
      showToast('success', 'Launch spotlight updated successfully');
    } catch {
      showToast('error', 'Failed to update launch spotlight');
    }
  }

  return (
    <form onSubmit={saveChanges} className="space-y-5">
      {slides.map((slide, index) => {
        const preview = imagePreviews[slide.id] || resolveImageUrl(slide.image);
        return (
          <section key={slide.id} className="border-2 border-gray-200 bg-white p-5 shadow-lg">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#3e8914]/10 p-2.5 text-[#3e8914]"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Spotlight Slide {index + 1}</h2>
                  <p className="text-xs text-gray-500">{slide.heading || 'New launch slide'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void removeSlide(slide.id)}
                className="flex items-center gap-2 bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <div>
                <label className={LABEL}>Spotlight Image <span className="text-red-500">*</span></label>
                <div className="relative flex h-40 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt={slide.altText || 'Spotlight preview'} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-gray-300" />
                  )}
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 bg-[#233D4D] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#182b36]">
                  <Upload className="h-4 w-4" /> {slide.image ? 'Replace Image' : 'Upload Image'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleImage(slide.id, event)} />
                </label>
                <p className="mt-2 text-[11px] text-gray-400">JPG, PNG or WebP. Maximum 10 MB.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={LABEL}>New Launch Label <span className="text-red-500">*</span></label>
                  <input required maxLength={40} className={FIELD} value={slide.badgeText} onChange={(e) => updateSlide(slide.id, { badgeText: e.target.value })} placeholder="NEW LAUNCH" />
                </div>
                <div>
                  <label className={LABEL}>Image Alt Text <span className="text-red-500">*</span></label>
                  <input required maxLength={160} className={FIELD} value={slide.altText} onChange={(e) => updateSlide(slide.id, { altText: e.target.value })} placeholder="Describe the image for accessibility" />
                </div>
                <div>
                  <label className={LABEL}>Heading <span className="text-red-500">*</span></label>
                  <input required maxLength={80} className={FIELD} value={slide.heading} onChange={(e) => updateSlide(slide.id, { heading: e.target.value })} placeholder="e.g. HelpNow" />
                </div>
                <div>
                  <label className={LABEL}>Subheading <span className="text-red-500">*</span></label>
                  <input required maxLength={120} className={FIELD} value={slide.subheading} onChange={(e) => updateSlide(slide.id, { subheading: e.target.value })} placeholder="e.g. Service Under 60 Mins" />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Page URL / Slide Link <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input required maxLength={500} className={`${FIELD} pl-10`} value={slide.link} onChange={(e) => updateSlide(slide.id, { link: e.target.value })} placeholder="/services/ac-repair or https://example.com/page" />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Sort Order</label>
                  <input type="number" min={0} className={FIELD} value={slide.sortOrder} onChange={(e) => updateSlide(slide.id, { sortOrder: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={LABEL}>Status</label>
                  <select className={FIELD} value={slide.status} onChange={(e) => updateSlide(slide.id, { status: e.target.value as LaunchSpotlightStatus })}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Accent Colour</label>
                  <div className="flex gap-2">
                    <input type="color" className="h-[42px] w-14 border-2 border-gray-300 bg-white p-1" value={slide.accentColor} onChange={(e) => updateSlide(slide.id, { accentColor: e.target.value })} />
                    <input className={FIELD} value={slide.accentColor} onChange={(e) => updateSlide(slide.id, { accentColor: e.target.value })} pattern="#[0-9a-fA-F]{6}" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-gray-200 bg-white p-4 shadow-lg">
        <button
          type="button"
          disabled={slides.length >= 12}
          onClick={() => setSlides((current) => [...current, makeNewSlide(current.length)])}
          className="flex items-center gap-2 bg-[#233D4D] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#182b36] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Another Slide
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#3e8914] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg hover:bg-[#347311] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Spotlight'}
        </button>
      </div>
    </form>
  );
}

export default function LaunchSpotlightPage() {
  const { data: config, isLoading, isError } = useLaunchSpotlight();

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -ml-3 -mt-3 bg-[#f7f8f6]">
      <div className="p-6" style={{ zoom: 0.82 }}>
        <header className="mb-5 border-b-2 border-black pb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide text-[#3e8914]">Launch Spotlight</h1>
          <p className="mt-1 text-sm text-gray-500">Manage the floating homepage launch cards, their images, text and destination URLs.</p>
        </header>

        {isLoading && <div className="border-2 border-gray-200 bg-white p-12 text-center text-sm text-gray-500">Loading launch spotlight...</div>}
        {isError && <div className="border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Unable to load the launch spotlight configuration.</div>}
        {config && <LaunchSpotlightEditor key={`${config._id}-${config.updatedAt}`} initialConfig={config} />}
      </div>
    </div>
  );
}
