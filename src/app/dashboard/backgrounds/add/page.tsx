'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import {
  Clock, Globe, Image as ImageIcon, IndianRupee, ListChecks, Pencil, Plus, RotateCcw, Save, ShieldCheck, Trash2, Type, Upload, X,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  BackgroundFeature, BackgroundStatus, MAX_BACKGROUND_FEATURES, PageBackground,
  useBackgroundPageOptions, usePageBackground, useSavePageBackground,
} from '@/lib/hooks/usePageBackgrounds';
import { resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// What every service page hero shows today, as a starting point.
const DEFAULT_FEATURES: BackgroundFeature[] = [
  { title: 'Expert', subtitle: 'Technicians' },
  { title: 'Same Day', subtitle: 'Service' },
  { title: 'Transparent', subtitle: 'Pricing' },
  { title: '30-Day', subtitle: 'Warranty' },
];
// Same icon order as the website hero.
const FEATURE_ICONS = [ShieldCheck, Clock, IndianRupee, ShieldCheck];

interface FormState {
  pagePath: string;
  subheading: string;
  heading: string;
  highlight: string;
  description: string;
  features: BackgroundFeature[];
  image: string;
  imageAlt: string;
  status: BackgroundStatus;
}

const emptyForm: FormState = {
  pagePath: '', subheading: 'Professional & Reliable', heading: '', highlight: '', description: '',
  features: DEFAULT_FEATURES, image: '', imageAlt: '', status: 'ACTIVE',
};

function formFromBackground(bg: PageBackground): FormState {
  return {
    pagePath: bg.pagePath,
    subheading: bg.subheading ?? '',
    heading: bg.heading,
    highlight: bg.highlight ?? '',
    description: bg.description ?? '',
    features: bg.features,
    image: bg.image ?? '',
    imageAlt: bg.imageAlt ?? '',
    status: bg.status,
  };
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

function HighlightedHeading({ heading, highlight }: { heading: string; highlight: string }) {
  const index = highlight ? heading.indexOf(highlight) : -1;
  if (index < 0) return <>{heading}</>;
  return <>{heading.slice(0, index)}<span className="text-[#88be1e]">{highlight}</span>{heading.slice(index + highlight.length)}</>;
}

// Keyed by the loaded entry's id (see below) so switching between "add" and
// "edit ⟨id⟩" remounts this form with fresh state instead of syncing it.
function BackgroundForm({ existing }: { existing?: PageBackground }) {
  const router = useRouter();
  const isEditMode = !!existing;
  const initialForm = existing ? formFromBackground(existing) : emptyForm;

  const [form, setForm] = useState<FormState>(initialForm);
  const [imageFile, setImageFile] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: pageGroups = [], isLoading: pagesLoading } = useBackgroundPageOptions();
  const saveBackground = useSavePageBackground();
  const imageUpload = useUploadFile('PAGE_BACKGROUND', existing?._id ?? 'new', { skipGlobalToast: true });
  const isSaving = saveBackground.isPending || imageUpload.isPending;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const allPages = pageGroups.flatMap((g) => g.pages);
  const selectedPage = allPages.find((p) => p.path === form.pagePath);
  const imagePreview = imageFile?.preview ?? (form.image ? resolveMediaUrl(form.image) : null);
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);

  async function handlePageChange(path: string) {
    const page = allPages.find((p) => p.path === path);
    // One background per page — offer to edit the existing one instead.
    if (!isEditMode && page?.backgroundId) {
      const result = await Swal.fire({
        icon: 'info',
        title: 'Background already added',
        text: `"${page.name}" already has a background. Do you want to edit it?`,
        showCancelButton: true,
        confirmButtonText: 'Edit Background',
        confirmButtonColor: '#3e8914',
      });
      if (result.isConfirmed) router.push(`/dashboard/backgrounds/add?editId=${page.backgroundId}`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      pagePath: path,
      // Pre-fill the usual "<Service> in Ghaziabad" heading for a fresh entry.
      heading: prev.heading || (page ? `${page.name} in Ghaziabad` : ''),
      highlight: prev.highlight || (page ? 'Ghaziabad' : ''),
      imageAlt: prev.imageAlt || (page ? `${page.name} in Ghaziabad` : ''),
    }));
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 10 MB (1920×700 or wider recommended).' });
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

  function updateFeature(index: number, key: keyof BackgroundFeature, value: string) {
    setForm((prev) => ({ ...prev, features: prev.features.map((f, i) => (i === index ? { ...f, [key]: value } : f)) }));
  }

  function resetForm() {
    if (imageFile) URL.revokeObjectURL(imageFile.preview);
    setImageFile(null);
    setForm(initialForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const warn = (title: string, text: string) =>
      void Swal.fire({ icon: 'warning', title, text, confirmButtonColor: '#3e8914' });

    if (!form.pagePath) return warn('Missing Page', 'Please select a page');
    if (highlightMissing) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    if (!imagePreview) return warn('Missing Image', 'Please upload a background image');
    if (form.features.some((f) => !f.title.trim())) return warn('Check Features', 'Every feature needs a title — remove the empty ones.');

    try {
      const { pagePath, image, ...fields } = form;
      const payload = { ...fields, ...(image && { image }) };
      let saved = await saveBackground.mutateAsync(existing ? { id: existing._id, ...payload } : { pagePath, ...payload });

      // The image needs the entry's id, so it's uploaded after saving.
      if (imageFile) {
        const uploaded = await imageUpload.upload(imageFile.file, 'WEBSITE_PAGE_HERO_IMAGE', saved._id);
        saved = await saveBackground.mutateAsync({ id: saved._id, image: uploaded.url });
      }

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Updated!' : 'Success!',
        text: `Background ${isEditMode ? 'updated' : 'added'} successfully`,
        confirmButtonColor: '#3e8914',
        timer: 1500,
        showConfirmButton: false,
      });
      if (imageFile) URL.revokeObjectURL(imageFile.preview);
      setImageFile(null);
      if (isEditMode) router.push('/dashboard/backgrounds/list');
      else setForm(emptyForm);
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save background', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Globe} title="Page" hint="Service pages come from Navbar List, grouped by menu. Pages marked ✓ already have a background.">
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
                      {p.name} ({p.path}){p.backgroundId ? '  ✓ BG added' : ''}{p.inactive ? '  — inactive in navbar' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </FormCard>

        <FormCard icon={Type} title="Hero Text" hint="The text shown over the background image at the top of the page.">
          <div className="space-y-4">
            <Field label="Subheading" hint='Small line above the heading, e.g. "Professional & Reliable".'>
              <input value={form.subheading} maxLength={120} onChange={(e) => update('subheading', e.target.value)} placeholder="Professional & Reliable" className={FIELD_INPUT} />
            </Field>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Heading (H1)" required className="md:col-span-2" hint="The page's main H1 title.">
                <input required value={form.heading} maxLength={180} onChange={(e) => update('heading', e.target.value)} placeholder="Refrigerator Service in Ghaziabad" className={FIELD_INPUT} />
              </Field>
              <Field label="Highlight Text" hint={highlightMissing ? <span className="text-red-500">Must be part of the heading</span> : 'Shown in green inside the heading.'}>
                <input
                  value={form.highlight}
                  maxLength={100}
                  onChange={(e) => update('highlight', e.target.value)}
                  placeholder="Ghaziabad"
                  className={`${FIELD_INPUT} ${highlightMissing ? 'border-red-400' : ''}`}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={FIELD_LABEL}>Short Description</label>
                <span className="mb-1 text-[10px] font-bold text-gray-400">{form.description.length}/300</span>
              </div>
              <textarea
                rows={3}
                value={form.description}
                maxLength={300}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Cooling issues, gas refill, ice buildup — sorted at your doorstep."
                className={`${FIELD_INPUT} resize-none`}
              />
            </div>
          </div>
        </FormCard>

        <FormCard icon={ListChecks} title="Features" hint={`Up to ${MAX_BACKGROUND_FEATURES} badges under the text — a bold first line and a second line, e.g. "Expert" / "Technicians".`}>
          <div className="space-y-2">
            {form.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-gray-200 text-[11px] font-bold text-gray-500">{index + 1}</span>
                <input
                  value={feature.title}
                  maxLength={40}
                  onChange={(e) => updateFeature(index, 'title', e.target.value)}
                  placeholder="Title, e.g. Expert"
                  className={FIELD_INPUT}
                  aria-label={`Feature ${index + 1} title`}
                />
                <input
                  value={feature.subtitle}
                  maxLength={40}
                  onChange={(e) => updateFeature(index, 'subtitle', e.target.value)}
                  placeholder="Second line, e.g. Technicians"
                  className={FIELD_INPUT}
                  aria-label={`Feature ${index + 1} second line`}
                />
                <button
                  type="button"
                  onClick={() => update('features', form.features.filter((_, i) => i !== index))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  aria-label={`Remove feature ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {form.features.length < MAX_BACKGROUND_FEATURES && (
              <button
                type="button"
                onClick={() => update('features', [...form.features, { title: '', subtitle: '' }])}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-1.5 text-[11px] font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Feature
              </button>
            )}
          </div>
        </FormCard>

        <FormCard icon={ImageIcon} title="Background Image" hint="Uploads to Cloudinary. Use a wide image (1920×700 or larger) — the text sits on its left side.">
          <div className="space-y-4">
            <div>
              <label className={FIELD_LABEL}>Add BG Image <span className="text-red-500">*</span></label>
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
                  <img src={imagePreview} alt={form.imageAlt || 'Background preview'} className="h-24 w-56 object-cover" />
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
                <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="Technician repairing a refrigerator in Ghaziabad" className={FIELD_INPUT} />
              </Field>
              <Field label="Status" hint={form.status === 'ACTIVE' ? 'Shown on the website.' : 'Hidden — the page shows its default hero.'}>
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value as BackgroundStatus)}
                  className={`${FIELD_INPUT} cursor-pointer`}
                >
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
            <div className="relative overflow-hidden bg-[#0f1a12] text-white">
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="relative p-4">
                <p className="mb-1.5 text-[7px] font-bold uppercase tracking-widest text-[#88be1e]">{form.subheading || 'Subheading'}</p>
                <p className="mb-2 text-lg font-bold leading-tight">
                  {form.heading ? <HighlightedHeading heading={form.heading} highlight={form.highlight} /> : 'Heading (H1)'}
                </p>
                {form.description && <p className="mb-3 text-[9px] font-medium text-white/90">{form.description}</p>}
                <div className="flex flex-wrap gap-3">
                  {form.features.slice(0, MAX_BACKGROUND_FEATURES).map((f, i) => {
                    const Icon = FEATURE_ICONS[i] ?? ShieldCheck;
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-[8px] font-semibold">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10"><Icon className="h-3 w-3 text-[#88be1e]" /></span>
                        <span>{f.title}<br />{f.subtitle}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-gray-400">
              {selectedPage ? `Shown at the top of ${selectedPage.path}` : 'Select a page to see where this appears.'}
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
              {isSaving ? 'Saving...' : isEditMode ? 'Update Background' : 'Save Background'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function AddBackgroundPageInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const { data: existing, isLoading, isError } = usePageBackground(editId);

  let body;
  if (editId && isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (editId && (isError || !existing)) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Background not found.</div>;
  } else {
    body = <BackgroundForm key={existing?._id ?? 'new'} existing={existing} />;
  }

  return (
    <PageShell
      title={editId ? 'Edit BG Image' : 'Add BG Image'}
      description={
        editId && existing
          ? `Update the hero background for ${existing.pageName} (${existing.pagePath})`
          : 'Set the hero background image, heading and features of a website service page.'
      }
    >
      {body}
    </PageShell>
  );
}

export default function AddBackgroundPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>}>
      <AddBackgroundPageInner />
    </Suspense>
  );
}
