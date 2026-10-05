'use client';

import { useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  ArrowRight, Eye, Image as ImageIcon, Info, LayoutGrid, ListChecks, Plus, RotateCcw, Save, Target, Trash2, Type, Upload, X,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  ABOUT_IMAGE_SLOTS, AboutStatus, HomeAbout, HomeAboutInput, MAX_ABOUT_POINTS, useHomeAbout, useSaveHomeAbout,
} from '@/lib/hooks/useHomeAbout';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DESCRIPTION_MAX = 600;
// The default images are the website's own files (/assets/...), so they're
// previewed from the website rather than the API.
const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

function previewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

function formFromAbout(data: HomeAbout): HomeAboutInput {
  return {
    eyebrow: data.eyebrow ?? '',
    heading: data.heading ?? '',
    highlight: data.highlight ?? '',
    description: data.description ?? '',
    points: [...(data.points ?? [])],
    missionTitle: data.missionTitle ?? '',
    missionText: data.missionText ?? '',
    visionTitle: data.visionTitle ?? '',
    visionText: data.visionText ?? '',
    buttonText: data.buttonText ?? '',
    buttonLink: data.buttonLink ?? '',
    images: ABOUT_IMAGE_SLOTS.map((_, i) => ({ image: data.images?.[i]?.image ?? '', alt: data.images?.[i]?.alt ?? '' })),
    status: data.status ?? 'ACTIVE',
  };
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

function PreviewHeading({ heading, highlight }: { heading: string; highlight: string }) {
  const index = highlight ? heading.indexOf(highlight) : -1;
  if (index < 0) return <>{heading}</>;
  return <>{heading.slice(0, index)}<span className="text-[#88be1e] underline decoration-2 underline-offset-4">{highlight}</span>{heading.slice(index + highlight.length)}</>;
}

type PickedImage = { file: File; preview: string } | null;

// Keyed by the loaded entry's updatedAt, so a save remounts it with fresh state.
function AboutForm({ existing }: { existing: HomeAbout }) {
  const initialForm = formFromAbout(existing);
  const [form, setForm] = useState<HomeAboutInput>(initialForm);
  const [picked, setPicked] = useState<PickedImage[]>(ABOUT_IMAGE_SLOTS.map(() => null));
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);
  const saveAbout = useSaveHomeAbout();
  const imageUpload = useUploadFile('HOME_ABOUT', existing._id, { skipGlobalToast: true });
  const isSaving = saveAbout.isPending || imageUpload.isPending;

  const update = <K extends keyof HomeAboutInput>(key: K, value: HomeAboutInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);
  const imagePreview = (i: number) => picked[i]?.preview ?? previewUrl(form.images[i]?.image ?? '');

  function updateImage(index: number, patch: Partial<HomeAboutInput['images'][number]>) {
    setForm((prev) => ({ ...prev, images: prev.images.map((img, i) => (i === index ? { ...img, ...patch } : img)) }));
  }

  function setPickedAt(index: number, value: PickedImage) {
    setPicked((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]!.preview);
      return prev.map((p, i) => (i === index ? value : p));
    });
  }

  function handleImagePick(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 10 MB.' });
      return;
    }
    setPickedAt(index, { file, preview: URL.createObjectURL(file) });
  }

  function clearImage(index: number) {
    setPickedAt(index, null);
    updateImage(index, { image: '' });
  }

  function updatePoint(index: number, value: string) {
    setForm((prev) => ({ ...prev, points: prev.points.map((p, i) => (i === index ? value : p)) }));
  }

  function resetForm() {
    picked.forEach((p) => p && URL.revokeObjectURL(p.preview));
    setPicked(ABOUT_IMAGE_SLOTS.map(() => null));
    setForm(initialForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const warn = (title: string, text: string) => void Swal.fire({ icon: 'warning', title, text, confirmButtonColor: '#3e8914' });

    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the section heading.');
    if (highlightMissing) return warn('Check Highlight', 'Highlight text must be part of the heading.');

    try {
      // Upload any newly picked images first, then save everything in one go.
      const images = await Promise.all(
        form.images.map(async (img, i) => {
          const file = picked[i]?.file;
          if (!file) return img;
          const uploaded = await imageUpload.upload(file, 'WEBSITE_ABOUT_IMAGE');
          return { ...img, image: uploaded.url };
        })
      );
      await saveAbout.mutateAsync({ ...form, images });
      picked.forEach((p) => p && URL.revokeObjectURL(p.preview));
      void Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'About section saved successfully',
        confirmButtonColor: '#3e8914',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save About section', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Type} title="Section Text" hint="The small label, heading and paragraph of the section.">
          <div className="space-y-4">
            <Field label="Eyebrow" hint='Small line above the heading, e.g. "About CityCalls".'>
              <input value={form.eyebrow} maxLength={60} onChange={(e) => update('eyebrow', e.target.value)} placeholder="About CityCalls" className={FIELD_INPUT} />
            </Field>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Heading" required className="md:col-span-2">
                <input required value={form.heading} maxLength={160} onChange={(e) => update('heading', e.target.value)} placeholder="Your Trusted Home Services Partner in Ghaziabad" className={FIELD_INPUT} />
              </Field>
              <Field label="Highlight Text" hint={highlightMissing ? <span className="text-red-500">Must be part of the heading</span> : 'Shown in green, underlined.'}>
                <input
                  value={form.highlight}
                  maxLength={80}
                  onChange={(e) => update('highlight', e.target.value)}
                  placeholder="Home Services Partner"
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
                placeholder="We provide reliable and professional home services right at your doorstep..."
                className={`${FIELD_INPUT} resize-none`}
              />
            </div>
          </div>
        </FormCard>

        <FormCard icon={ListChecks} title="Key Points" hint={`Up to ${MAX_ABOUT_POINTS} short points shown as a list under the paragraph.`}>
          <div className="space-y-2">
            {form.points.map((point, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-gray-200 text-[11px] font-bold text-gray-500">{index + 1}</span>
                <input
                  value={point}
                  maxLength={120}
                  onChange={(e) => updatePoint(index, e.target.value)}
                  placeholder="e.g. Background-verified and highly trained professionals"
                  className={`${FIELD_INPUT} min-w-0`}
                  aria-label={`Point ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => update('points', form.points.filter((_, i) => i !== index))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  aria-label={`Remove point ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {form.points.length < MAX_ABOUT_POINTS && (
              <button
                type="button"
                onClick={() => update('points', [...form.points, ''])}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-1.5 text-[11px] font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Point
              </button>
            )}
          </div>
        </FormCard>

        <FormCard icon={Target} title="Mission & Vision" hint="The two items with icons under the points.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3 border-2 border-gray-200 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700"><Target className="h-3.5 w-3.5 text-[#3e8914]" /> Mission</p>
              <Field label="Title">
                <input value={form.missionTitle} maxLength={60} onChange={(e) => update('missionTitle', e.target.value)} placeholder="Our Mission" className={FIELD_INPUT} />
              </Field>
              <Field label="Text">
                <textarea rows={3} value={form.missionText} maxLength={300} onChange={(e) => update('missionText', e.target.value)} placeholder="To deliver safe, punctual, and premium home services..." className={`${FIELD_INPUT} resize-none`} />
              </Field>
            </div>
            <div className="space-y-3 border-2 border-gray-200 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700"><Eye className="h-3.5 w-3.5 text-gray-600" /> Vision</p>
              <Field label="Title">
                <input value={form.visionTitle} maxLength={60} onChange={(e) => update('visionTitle', e.target.value)} placeholder="Our Vision" className={FIELD_INPUT} />
              </Field>
              <Field label="Text">
                <textarea rows={3} value={form.visionText} maxLength={300} onChange={(e) => update('visionText', e.target.value)} placeholder="To be the leading and most trusted home service brand..." className={`${FIELD_INPUT} resize-none`} />
              </Field>
            </div>
          </div>
        </FormCard>

        <FormCard icon={ArrowRight} title="Button" hint="The outlined button at the end of the text. Leave the text empty to hide it.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Button Text">
              <input value={form.buttonText} maxLength={40} onChange={(e) => update('buttonText', e.target.value)} placeholder="Discover More" className={FIELD_INPUT} />
            </Field>
            <Field label="Button Link" hint="A page path like /about, or a full https:// link.">
              <input value={form.buttonLink} maxLength={500} onChange={(e) => update('buttonLink', e.target.value)} placeholder="/about" className={FIELD_INPUT} />
            </Field>
          </div>
        </FormCard>

        <FormCard icon={ImageIcon} title="Images" hint="Uploads to Cloudinary. A tall image on the left and two smaller ones on the right.">
          <div className="space-y-4">
            {ABOUT_IMAGE_SLOTS.map((slot, index) => {
              const preview = imagePreview(index);
              return (
                <div key={slot} className="min-w-0 border-2 border-gray-200 p-3">
                  <p className="mb-2 text-xs font-bold text-gray-700">{index + 1}. {slot}</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr] md:items-start">
                    <div className="flex items-start gap-2">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputs.current[index]?.click()}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputs.current[index]?.click()}
                        className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#3e8914]/40 bg-[#3e8914]/[0.03] text-center transition-colors hover:bg-[#3e8914]/[0.07]"
                      >
                        <input
                          ref={(el) => { fileInputs.current[index] = el; }}
                          type="file"
                          accept={IMAGE_TYPES.join(',')}
                          onChange={(e) => handleImagePick(index, e)}
                          className="hidden"
                        />
                        <Upload className="h-4 w-4 text-[#3e8914]" />
                        <span className="mt-1 text-[10px] font-bold text-gray-700">{preview ? 'Change' : 'Upload'}</span>
                        <span className="text-[9px] text-gray-400">JPG / PNG / WebP</span>
                      </div>
                      {preview && (
                        <div className="relative border-2 border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preview} alt={form.images[index]?.alt || slot} className="h-24 w-32 object-cover" />
                          <button
                            type="button"
                            onClick={() => clearImage(index)}
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
                            aria-label={`Remove ${slot}`}
                          >
                            <X className="h-2.5 w-2.5" strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                    <Field label="Image Alt Text" className="min-w-0" hint="Describes the image for Google and screen readers.">
                      <input
                        value={form.images[index]?.alt ?? ''}
                        maxLength={200}
                        onChange={(e) => updateImage(index, { alt: e.target.value })}
                        placeholder="e.g. CityCalls technician with a happy family"
                        className={FIELD_INPUT}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}

            <Field label="Status" className="md:w-1/3" hint={form.status === 'ACTIVE' ? 'Shown on the website.' : 'Hidden — the section is removed from the home page.'}>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value as AboutStatus)}
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
            <div className={`bg-white p-3 ring-1 ring-gray-100 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              <div className="mb-3 grid h-28 grid-cols-2 grid-rows-2 gap-1.5">
                {ABOUT_IMAGE_SLOTS.map((slot, i) => {
                  const preview = imagePreview(i);
                  return (
                    <div key={slot} className={`overflow-hidden rounded-md bg-gray-100 ${i === 0 ? 'row-span-2' : ''}`}>
                      {preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  );
                })}
              </div>
              {form.eyebrow && <p className="mb-1 text-[7px] font-bold uppercase tracking-[0.25em] text-[#88be1e]">— {form.eyebrow}</p>}
              <p className="mb-1.5 text-[13px] font-extrabold leading-snug text-slate-900">
                {form.heading ? <PreviewHeading heading={form.heading} highlight={form.highlight} /> : 'Heading'}
              </p>
              {form.description && <p className="mb-2 line-clamp-3 text-[8px] leading-relaxed text-gray-700">{form.description}</p>}
              <ul className="mb-2 space-y-0.5">
                {form.points.filter(Boolean).map((point, i) => (
                  <li key={i} className="flex items-center gap-1 text-[7.5px] font-medium text-gray-700">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-[#88be1e]" /> {point}
                  </li>
                ))}
              </ul>
              <div className="space-y-1.5 border-l border-dashed border-gray-300 pl-2">
                {[
                  { icon: Target, title: form.missionTitle, text: form.missionText },
                  { icon: Eye, title: form.visionTitle, text: form.visionText },
                ].map(({ icon: Icon, title, text }) => (title || text) && (
                  <div key={title || text} className="flex gap-1.5">
                    <Icon className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[#3e8914]" />
                    <div>
                      <p className="text-[8px] font-bold text-gray-900">{title}</p>
                      <p className="line-clamp-2 text-[7px] text-gray-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {form.buttonText && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#3e8914] px-2 py-0.5 text-[7.5px] font-bold text-[#3e8914]">
                  {form.buttonText} <ArrowRight className="h-2 w-2" />
                </span>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-gray-400">
              <Info className="h-3 w-3" />
              {form.status === 'ACTIVE' ? 'Shown on the home page, below the Features section.' : 'Inactive — hidden from the home page.'}
            </p>
          </section>

          <div className="flex gap-2">
            <button type="button" onClick={resetForm} disabled={isSaving} className={SECONDARY_BUTTON}>
              <RotateCcw className="h-3.5 w-3.5" /> Undo Changes
            </button>
            <button type="submit" disabled={isSaving} className={`${PRIMARY_BUTTON} flex-1`}>
              {isSaving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
              {isSaving ? 'Saving...' : 'Save About'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function AboutPage() {
  const { data, isLoading, isError } = useHomeAbout();

  let body;
  if (isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><Info className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (isError || !data) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Could not load the About section.</div>;
  } else {
    body = <AboutForm key={data.updatedAt} existing={data} />;
  }

  return (
    <PageShell
      title="About"
      description={
        <>
          Edit the home page&apos;s &quot;About CityCalls&quot; section — text, points, mission &amp; vision, button and images.
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
