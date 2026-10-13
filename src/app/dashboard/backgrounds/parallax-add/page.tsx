'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import { Globe, Image as ImageIcon, Pencil, RotateCcw, Save, Type, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import { PageParallax, ParallaxStatus, useParallaxPageOptions, usePageParallax, useSavePageParallax } from '@/lib/hooks/usePageParallax';
import { resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

// Background Section → Add Parallax Image: the wide photo banner (with text
// over it) in the middle of a website service page. One per page.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface FormState {
  pagePath: string;
  subheading: string;
  heading: string;
  highlight: string;
  description: string;
  image: string;
  imageAlt: string;
  status: ParallaxStatus;
}

// What every service page's parallax banner shows today, as a starting point.
const emptyForm: FormState = {
  pagePath: '',
  subheading: 'Appliance Repair',
  heading: 'Expert Repair at Your Doorstep',
  highlight: 'Your Doorstep',
  description: 'Experience world-class appliance service. We bring your appliances back to life with 100% genuine parts, verified professionals, and guaranteed satisfaction.',
  image: '',
  imageAlt: '',
  status: 'ACTIVE',
};

function formFromEntry(entry: PageParallax): FormState {
  return {
    pagePath: entry.pagePath,
    subheading: entry.subheading ?? '',
    heading: entry.heading,
    highlight: entry.highlight ?? '',
    description: entry.description ?? '',
    image: entry.image ?? '',
    imageAlt: entry.imageAlt ?? '',
    status: entry.status,
  };
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

function HighlightedHeading({ heading, highlight }: { heading: string; highlight: string }) {
  const index = highlight ? heading.indexOf(highlight) : -1;
  if (index < 0) return <>{heading}</>;
  return <>{heading.slice(0, index)}<span className="text-[#3e8914]">{highlight}</span>{heading.slice(index + highlight.length)}</>;
}

// Keyed by the loaded entry's id (see below) so switching between "add" and
// "edit ⟨id⟩" remounts this form with fresh state instead of syncing it.
function ParallaxForm({ existing }: { existing?: PageParallax }) {
  const router = useRouter();
  const isEditMode = !!existing;
  const initialForm = existing ? formFromEntry(existing) : emptyForm;

  const [form, setForm] = useState<FormState>(initialForm);
  const [imageFile, setImageFile] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: pageGroups = [], isLoading: pagesLoading } = useParallaxPageOptions();
  const saveParallax = useSavePageParallax();
  const imageUpload = useUploadFile('PAGE_PARALLAX', existing?._id ?? 'new', { skipGlobalToast: true });
  const isSaving = saveParallax.isPending || imageUpload.isPending;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const allPages = pageGroups.flatMap((g) => g.pages);
  const selectedPage = allPages.find((p) => p.path === form.pagePath);
  const imagePreview = imageFile?.preview ?? (form.image ? resolveMediaUrl(form.image) : null);
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);

  async function handlePageChange(path: string) {
    const page = allPages.find((p) => p.path === path);
    // One parallax image per page — offer to edit the existing one instead.
    if (!isEditMode && page?.parallaxId) {
      const result = await Swal.fire({
        icon: 'info',
        title: 'Parallax image already added',
        text: `"${page.name}" already has a parallax image. Do you want to edit it?`,
        showCancelButton: true,
        confirmButtonText: 'Edit Parallax Image',
        confirmButtonColor: '#3e8914',
      });
      if (result.isConfirmed) router.push(`/dashboard/backgrounds/parallax-add?editId=${page.parallaxId}`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      pagePath: path,
      subheading: page && (!prev.subheading || prev.subheading === emptyForm.subheading) ? page.name : prev.subheading,
      imageAlt: prev.imageAlt || (page ? `${page.name} by CityCalls in Ghaziabad` : ''),
    }));
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 10 MB (1920×800 or wider recommended).' });
      return;
    }
    if (imageFile) URL.revokeObjectURL(imageFile.preview);
    setImageFile({ file, preview: URL.createObjectURL(file) });
  }

  function clearImage() {
    if (imageFile) URL.revokeObjectURL(imageFile.preview);
    setImageFile(null);
    update('image', '');
  }

  function resetForm() {
    if (imageFile) URL.revokeObjectURL(imageFile.preview);
    setImageFile(null);
    setForm(initialForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const warn = (title: string, text: string) => void Swal.fire({ icon: 'warning', title, text, confirmButtonColor: '#3e8914' });

    if (!form.pagePath) return warn('Missing Page', 'Please select a page');
    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the heading');
    if (highlightMissing) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    if (!imagePreview) return warn('Missing Image', 'Please upload a parallax image');

    try {
      const { pagePath, image, ...fields } = form;
      const payload = { ...fields, ...(image && { image }) };
      let saved = await saveParallax.mutateAsync(existing ? { id: existing._id, ...payload } : { pagePath, ...payload });

      // The image needs the entry's id, so it's uploaded after saving.
      if (imageFile) {
        const uploaded = await imageUpload.upload(imageFile.file, 'WEBSITE_PAGE_PARALLAX_IMAGE', saved._id);
        saved = await saveParallax.mutateAsync({ id: saved._id, image: uploaded.url });
      }

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Updated!' : 'Success!',
        text: `Parallax image ${isEditMode ? 'updated' : 'added'} successfully`,
        confirmButtonColor: '#3e8914',
        timer: 1500,
        showConfirmButton: false,
      });
      if (imageFile) URL.revokeObjectURL(imageFile.preview);
      setImageFile(null);
      if (isEditMode) router.push('/dashboard/backgrounds/parallax-list');
      else setForm(emptyForm);
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save parallax image', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Globe} title="Page" hint="Service pages come from Navbar List, grouped by menu. Pages marked ✓ already have a parallax image.">
          <Field label="Select Page" required>
            <select
              required
              value={form.pagePath}
              disabled={isEditMode || pagesLoading}
              onChange={(e) => void handlePageChange(e.target.value)}
              className={FIELD_INPUT}
            >
              <option value="">{pagesLoading ? 'Loading pages...' : 'Select a page'}</option>
              {isEditMode && !selectedPage && <option value={form.pagePath}>{existing.pageName} ({form.pagePath})</option>}
              {pageGroups.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.pages.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.name} ({p.path}){p.parallaxId ? '  ✓ Parallax added' : ''}{p.inactive ? '  — inactive in navbar' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </FormCard>

        <FormCard icon={Type} title="Parallax Text" hint="The text shown in the middle of the parallax image.">
          <div className="space-y-4">
            <Field label="Subheading" hint='Small green line above the heading, e.g. "Appliance Repair".'>
              <input value={form.subheading} maxLength={120} onChange={(e) => update('subheading', e.target.value)} placeholder="Appliance Repair" className={FIELD_INPUT} />
            </Field>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Heading" required className="md:col-span-2" hint="The big line on the image.">
                <input required value={form.heading} maxLength={180} onChange={(e) => update('heading', e.target.value)} placeholder="Expert Repair at Your Doorstep" className={FIELD_INPUT} />
              </Field>
              <Field label="Highlight Text" hint={highlightMissing ? <span className="text-red-500">Must be part of the heading</span> : 'Shown in green inside the heading.'}>
                <input
                  value={form.highlight}
                  maxLength={100}
                  onChange={(e) => update('highlight', e.target.value)}
                  placeholder="Your Doorstep"
                  className={`${FIELD_INPUT} ${highlightMissing ? 'border-red-400' : ''}`}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={FIELD_LABEL}>Description</label>
                <span className="mb-1 text-[10px] font-bold text-gray-400">{form.description.length}/300</span>
              </div>
              <textarea
                rows={3}
                value={form.description}
                maxLength={300}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Experience world-class appliance service..."
                className={`${FIELD_INPUT} resize-none`}
              />
            </div>
          </div>
        </FormCard>

        <FormCard icon={ImageIcon} title="Parallax Image" hint="Uploads to Cloudinary. Use a wide image (1920×800 or larger) — it drifts slowly as the page scrolls, with the text centred over it.">
          <div className="space-y-4">
            <div>
              <label className={FIELD_LABEL}>Add Parallax Image <span className="text-red-500">*</span></label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#3e8914]/40 bg-[#3e8914]/[0.03] p-3 text-center transition-colors hover:bg-[#3e8914]/[0.07]"
              >
                <input ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(',')} onChange={handleImagePick} className="hidden" />
                <div className="flex items-center gap-2 text-[#3e8914]">
                  <Upload className="h-4 w-4" />
                  <span className="text-xs font-bold text-gray-800">{imagePreview ? 'Click to change image' : 'Click to upload image'}</span>
                </div>
                <p className="mt-0.5 text-[10px] font-medium text-gray-400">JPG, PNG or WebP, up to 10 MB</p>
              </div>
              {imagePreview && (
                <div className="relative mt-2 w-fit border-2 border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt={form.imageAlt || 'Parallax preview'} className="h-24 w-56 object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
                    aria-label="Remove image"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Image Alt Text" className="md:col-span-2" hint="Describes the image for Google and screen readers.">
                <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="Technician repairing a refrigerator in a modern kitchen" className={FIELD_INPUT} />
              </Field>
              <Field label="Status" hint={form.status === 'ACTIVE' ? 'Shown on the website.' : 'Hidden — the page shows its default banner.'}>
                <select value={form.status} onChange={(e) => update('status', e.target.value as ParallaxStatus)} className={`${FIELD_INPUT} cursor-pointer`}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>
            </div>
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><ImageIcon className="h-4 w-4" /> Live Preview</h2>
            <div className="relative flex min-h-[150px] items-center justify-center overflow-hidden bg-gray-900 text-center text-white">
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/40" />
              <div className="relative px-4 py-5">
                {form.subheading && <p className="mb-1 text-[7px] font-bold uppercase tracking-[0.2em] text-[#88be1e]">{form.subheading}</p>}
                <p className="mb-1.5 text-[15px] font-black uppercase leading-tight tracking-tight">
                  {form.heading ? <HighlightedHeading heading={form.heading} highlight={form.highlight} /> : 'Heading'}
                </p>
                {form.description && <p className="text-[8.5px] font-medium leading-relaxed text-white/90">{form.description}</p>}
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-gray-400">
              {selectedPage ? `Shown in the middle of ${selectedPage.path}` : 'Select a page to see where this appears.'}
            </p>
          </section>

          <div className="flex gap-2">
            <button type="button" onClick={resetForm} disabled={isSaving} className={SECONDARY_BUTTON}>
              <RotateCcw className="h-3.5 w-3.5" /> {isEditMode ? 'Undo Changes' : 'Reset'}
            </button>
            <button type="submit" disabled={isSaving} className={`${PRIMARY_BUTTON} flex-1`}>
              {isSaving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isEditMode ? (
                <Pencil className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? 'Saving...' : isEditMode ? 'Update Parallax Image' : 'Save Parallax Image'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function AddParallaxPageInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const { data: existing, isLoading, isError } = usePageParallax(editId);

  let body;
  if (editId && isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (editId && (isError || !existing)) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Parallax image not found.</div>;
  } else {
    body = <ParallaxForm key={existing?._id ?? 'new'} existing={existing} />;
  }

  return (
    <PageShell
      title={editId ? 'Edit Parallax Image' : 'Add Parallax Image'}
      description={
        editId && existing
          ? `Update the parallax image for ${existing.pageName} (${existing.pagePath})`
          : 'Set the parallax image and the text over it for a website service page.'
      }
    >
      {body}
    </PageShell>
  );
}

export default function AddParallaxPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>}>
      <AddParallaxPageInner />
    </Suspense>
  );
}
