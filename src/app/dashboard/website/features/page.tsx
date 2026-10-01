'use client';

import { useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  ArrowUpRight, Bug, Droplets, House, Image as ImageIcon, LayoutGrid, ListChecks, PaintRoller, Plus, RotateCcw, Save,
  Settings, ShieldCheck, Sparkles, Trash2, Type, Upload, Wind, Wrench, X, Zap, type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  FEATURE_ICONS, FeatureIcon, FeatureItem, FeaturesStatus, HomeFeatures, HomeFeaturesInput, MAX_FEATURE_ITEMS,
  useHomeFeatures, useSaveHomeFeatures,
} from '@/lib/hooks/useHomeFeatures';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DESCRIPTION_MAX = 600;

// Same icons the website draws for each card.
const ICONS: Record<FeatureIcon, { icon: LucideIcon; label: string }> = {
  wrench: { icon: Wrench, label: 'Wrench' },
  zap: { icon: Zap, label: 'Electric' },
  sparkles: { icon: Sparkles, label: 'Sparkles' },
  'shield-check': { icon: ShieldCheck, label: 'Shield' },
  droplets: { icon: Droplets, label: 'Water' },
  wind: { icon: Wind, label: 'Air / AC' },
  bug: { icon: Bug, label: 'Pest' },
  'paint-roller': { icon: PaintRoller, label: 'Paint' },
  house: { icon: House, label: 'Home' },
  settings: { icon: Settings, label: 'Gear' },
};

function formFromFeatures(data: HomeFeatures): HomeFeaturesInput {
  return {
    heading: data.heading ?? '',
    highlight: data.highlight ?? '',
    description: data.description ?? '',
    image: data.image ?? '',
    imageAlt: data.imageAlt ?? '',
    imageBadge: data.imageBadge ?? '',
    items: (data.items ?? []).map((item) => ({ ...item })),
    status: data.status ?? 'ACTIVE',
  };
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

// Heading lines with the highlight part in green, as on the website.
function PreviewHeading({ heading, highlight }: { heading: string; highlight: string }) {
  const index = highlight ? heading.indexOf(highlight) : -1;
  const render = (text: string, green: boolean, key: string) =>
    text.split('\n').map((part, i, all) => (
      <span key={`${key}-${i}`}>
        <span className={green ? 'text-[#88be1e]' : undefined}>{part}</span>
        {i < all.length - 1 && <br />}
      </span>
    ));
  if (index < 0) return <>{render(heading, false, 'all')}</>;
  return (
    <>
      {render(heading.slice(0, index), false, 'a')}
      {render(highlight, true, 'h')}
      {render(heading.slice(index + highlight.length), false, 'b')}
    </>
  );
}

// Keyed by the loaded entry's updatedAt, so a save remounts it with fresh state.
function FeaturesForm({ existing }: { existing: HomeFeatures }) {
  const initialForm = formFromFeatures(existing);
  const [form, setForm] = useState<HomeFeaturesInput>(initialForm);
  const [imageFile, setImageFile] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveFeatures = useSaveHomeFeatures();
  const imageUpload = useUploadFile('HOME_FEATURES', existing._id, { skipGlobalToast: true });
  const isSaving = saveFeatures.isPending || imageUpload.isPending;

  const update = <K extends keyof HomeFeaturesInput>(key: K, value: HomeFeaturesInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const imagePreview = imageFile?.preview ?? (form.image ? resolveMediaUrl(form.image) : null);
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);

  function updateItem(index: number, patch: Partial<FeatureItem>) {
    setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 10 MB.' });
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

    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the section heading.');
    if (highlightMissing) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    if (form.items.some((item) => !item.title.trim())) return warn('Check Cards', 'Every feature card needs a title — remove the empty ones.');

    try {
      let image = form.image;
      if (imageFile) {
        const uploaded = await imageUpload.upload(imageFile.file, 'WEBSITE_FEATURES_IMAGE');
        image = uploaded.url;
      }
      await saveFeatures.mutateAsync({ ...form, image });
      if (imageFile) URL.revokeObjectURL(imageFile.preview);
      void Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Features section saved successfully',
        confirmButtonColor: '#3e8914',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save features', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Type} title="Section Text" hint="The heading and paragraph at the top of the section.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Heading" required className="md:col-span-2" hint="Each line of the box is a line on the website.">
                <textarea
                  required
                  rows={3}
                  value={form.heading}
                  maxLength={200}
                  onChange={(e) => update('heading', e.target.value)}
                  placeholder={'Home repairs everywhere,\nimpactful online services,\nenhanced experiences'}
                  className={`${FIELD_INPUT} resize-none`}
                />
              </Field>
              <Field label="Highlight Text" hint={highlightMissing ? <span className="text-red-500">Must be part of the heading</span> : 'Shown in green inside the heading.'}>
                <input
                  value={form.highlight}
                  maxLength={120}
                  onChange={(e) => update('highlight', e.target.value)}
                  placeholder="impactful online services,"
                  className={`${FIELD_INPUT} ${highlightMissing ? 'border-red-400' : ''}`}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={FIELD_LABEL}>Description</label>
                <span className="mb-1 text-[10px] font-bold text-gray-400">{form.description.length}/{DESCRIPTION_MAX}</span>
              </div>
              <textarea
                rows={4}
                value={form.description}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => update('description', e.target.value)}
                placeholder="CityCalls is dedicated to providing accessible, high-quality home repairs..."
                className={`${FIELD_INPUT} resize-none`}
              />
            </div>
          </div>
        </FormCard>

        <FormCard icon={ListChecks} title="Feature Cards" hint={`Up to ${MAX_FEATURE_ITEMS} cards. They are numbered "Service 01", "Service 02"… in this order.`}>
          <div className="space-y-3">
            {form.items.map((item, index) => {
              const Icon = ICONS[item.icon]?.icon ?? Wrench;
              return (
                <div key={index} className="border-2 border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-gray-200 text-[11px] font-bold text-gray-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#3e8914]/30 bg-[#3e8914]/5 text-[#3e8914]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <select
                      value={item.icon}
                      onChange={(e) => updateItem(index, { icon: e.target.value as FeatureIcon })}
                      className={`${FIELD_INPUT} w-36 shrink-0 cursor-pointer`}
                      aria-label={`Card ${index + 1} icon`}
                    >
                      {FEATURE_ICONS.map((key) => (
                        <option key={key} value={key}>{ICONS[key].label}</option>
                      ))}
                    </select>
                    <input
                      value={item.title}
                      maxLength={60}
                      onChange={(e) => updateItem(index, { title: e.target.value })}
                      placeholder="Title, e.g. Expert Plumbers"
                      className={FIELD_INPUT}
                      aria-label={`Card ${index + 1} title`}
                    />
                    <button
                      type="button"
                      onClick={() => update('items', form.items.filter((_, i) => i !== index))}
                      className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label={`Remove card ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    value={item.description}
                    maxLength={200}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    placeholder="Short description, e.g. Quick and reliable plumbing services for leaks, fittings, and repairs."
                    className={`${FIELD_INPUT} mt-2`}
                    aria-label={`Card ${index + 1} description`}
                  />
                </div>
              );
            })}
            {form.items.length < MAX_FEATURE_ITEMS && (
              <button
                type="button"
                onClick={() => update('items', [...form.items, { icon: 'wrench', title: '', description: '' }])}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-1.5 text-[11px] font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Card
              </button>
            )}
          </div>
        </FormCard>

        <FormCard icon={ImageIcon} title="Popup Image" hint="Uploads to Cloudinary. Pops up beside the paragraph on scroll and on hover — a landscape image (about 400×280) works best.">
          <div className="space-y-4">
            <div>
              <label className={FIELD_LABEL}>Image</label>
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
                  <img src={imagePreview} alt={form.imageAlt || 'Popup image preview'} className="h-24 w-36 object-cover" />
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
                <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="CityCalls technician at work" className={FIELD_INPUT} />
              </Field>
              <Field label="Image Badge" hint='Small label on the image, e.g. "Top Rated".'>
                <input value={form.imageBadge} maxLength={40} onChange={(e) => update('imageBadge', e.target.value)} placeholder="Top Rated" className={FIELD_INPUT} />
              </Field>
            </div>

            <Field label="Status" className="md:w-1/3" hint={form.status === 'ACTIVE' ? 'Shown on the website.' : 'Hidden — the section is removed from the home page.'}>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value as FeaturesStatus)}
                className={`${FIELD_INPUT} cursor-pointer`}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </Field>
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`bg-[#FAF9F6] p-4 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              <p className="text-[15px] font-bold leading-snug text-slate-900">
                {form.heading ? <PreviewHeading heading={form.heading} highlight={form.highlight} /> : 'Heading'}
              </p>
              <div className="mt-3 flex items-start gap-2">
                <p className="line-clamp-4 flex-1 text-[9px] leading-relaxed text-gray-500">{form.description || 'Description'}</p>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-400">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
              {imagePreview && (
                <div className="relative ml-auto mt-2 h-16 w-24 rotate-2 overflow-hidden rounded-lg shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {form.imageBadge && (
                    <span className="absolute bottom-1 left-1.5 flex items-center gap-1 text-[6px] font-bold uppercase tracking-widest text-white">
                      <span className="h-1 w-1 rounded-full bg-[#88be1e]" /> {form.imageBadge}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {form.items.map((item, i) => {
                  const Icon = ICONS[item.icon]?.icon ?? Wrench;
                  return (
                    <div key={i} className="rounded-md border border-gray-200 bg-white p-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded border border-[#4D4D4D]/10 bg-[#4D4D4D]/5">
                        <Icon className="h-3 w-3 text-[#4D4D4D]" />
                      </span>
                      <p className="mt-1 text-[6px] font-bold uppercase tracking-widest text-[#88be1e]">Service {String(i + 1).padStart(2, '0')}</p>
                      <p className="text-[8px] font-bold uppercase tracking-wide text-[#4D4D4D]">{item.title || 'Title'}</p>
                      {item.description && <p className="mt-0.5 line-clamp-2 text-[7px] text-slate-500">{item.description}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-gray-400">
              {form.status === 'ACTIVE' ? 'Shown on the home page, below the offers.' : 'Inactive — hidden from the home page.'}
            </p>
          </section>

          <div className="flex gap-2">
            <button type="button" onClick={resetForm} disabled={isSaving} className={SECONDARY_BUTTON}>
              <RotateCcw className="h-3.5 w-3.5" /> Undo Changes
            </button>
            <button type="submit" disabled={isSaving} className={`${PRIMARY_BUTTON} flex-1`}>
              {isSaving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
              {isSaving ? 'Saving...' : 'Save Features'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function FeaturesPage() {
  const { data, isLoading, isError } = useHomeFeatures();

  let body;
  if (isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><LayoutGrid className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (isError || !data) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Could not load the features section.</div>;
  } else {
    body = <FeaturesForm key={data.updatedAt} existing={data} />;
  }

  return (
    <PageShell
      title="Features"
      description={
        <>
          Edit the home page&apos;s &quot;Home repairs everywhere&quot; section — heading, text, popup image and feature cards.
          {data?.updatedBy && (
            <> Last updated by <strong className="text-[#4B1426]">{data.updatedBy.name}</strong>, {formatDate(data.updatedAt)}, {formatTime(data.updatedAt)}.</>
          )}
        </>
      }
    >
      {body}
    </PageShell>
  );
}
