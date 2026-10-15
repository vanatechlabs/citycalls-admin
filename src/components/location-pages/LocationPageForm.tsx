'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';
import { Check, Code, ExternalLink, FileText, Globe, LayoutTemplate, MapPin, Save, Share2, Sparkles, Trash2, Upload } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { slugify } from '@/lib/hooks/useBlogs';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  LocationPage, LocationPageFeature, LocationPageInput, LocationPageOption, LocationPageStatus, useLocationPageOptions, useSaveLocationPage,
} from '@/lib/hooks/useLocationPages';
import { WEBSITE_ORIGIN } from '@/lib/hooks/useSeoMeta';
import { resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { FIELD_INPUT, FIELD_LABEL } from '@/components/registrations/shared/styles';
import { RichTextEditor } from '@/components/blogs/RichTextEditor';

// Add / edit a city location page (citycalls.in/<slug>) — the same idea as
// Design House's location pages: pick the page (a Navbar List service or the
// home page) and the city, and the title, URL and SEO fill themselves in.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const DEFAULT_FEATURES: LocationPageFeature[] = [
  { title: 'Expert', subtitle: 'Technicians' },
  { title: 'Same Day', subtitle: 'Service' },
  { title: 'Transparent', subtitle: 'Pricing' },
  { title: '30-Day', subtitle: 'Warranty' },
];

const EMPTY: LocationPageInput = {
  pageType: 'SERVICE', navServiceId: null, location: '', slug: '', heroEyebrow: 'Professional & Reliable', title: '', highlight: '',
  shortDescription: '', features: DEFAULT_FEATURES, heroImage: '', heroImageAlt: '', highlightedHeading: '', content: '',
  metaTitle: '', metaKeywords: '', metaDescription: '', canonicalTag: '', ogTitle: '', ogImage: '', schemaMarkup: '', status: 'DRAFT',
};

const STATUS_STYLE: Record<LocationPageStatus, string> = {
  PUBLISHED: 'border-green-300 bg-green-50 text-green-700',
  DRAFT: 'border-red-300 bg-red-50 text-red-600',
};

// Fields that follow the selected page + city until someone edits them by hand.
type AutoField = 'title' | 'highlight' | 'slug' | 'shortDescription' | 'highlightedHeading' | 'heroImageAlt' | 'metaTitle' | 'metaKeywords' | 'metaDescription' | 'ogTitle';
const AUTO_FIELDS: AutoField[] = ['title', 'highlight', 'slug', 'shortDescription', 'highlightedHeading', 'heroImageAlt', 'metaTitle', 'metaKeywords', 'metaDescription', 'ogTitle'];

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function suggestions(pageName: string, city: string): Record<AutoField, string> {
  if (!pageName || !city) return Object.fromEntries(AUTO_FIELDS.map((f) => [f, ''])) as Record<AutoField, string>;
  const name = pageName.trim();
  const lower = name.toLowerCase();
  const title = `${name} in ${city}`;
  return {
    title,
    highlight: city,
    slug: slugify(title),
    shortDescription: cut(`Book trusted ${lower} in ${city} with CityCalls — background-verified professionals at your doorstep, same-day slots and transparent pricing.`, 700),
    highlightedHeading: cut(`Best ${name} in ${city} | Same-Day Doorstep Service`, 200),
    heroImageAlt: cut(title, 200),
    metaTitle: cut(`${title} | CityCalls`, 70),
    metaKeywords: cut(`${lower} in ${city.toLowerCase()}, ${lower} near me, best ${lower} ${city.toLowerCase()}, citycalls ${city.toLowerCase()}`, 500),
    metaDescription: cut(`Book ${lower} in ${city} with CityCalls. Verified experts, same-day doorstep service, transparent pricing and a 30-day warranty.`, 170),
    ogTitle: cut(`${title} | CityCalls`, 200),
  };
}

function fromPage(page: LocationPage): LocationPageInput {
  const { pageType, navServiceId, location, slug, heroEyebrow, title, highlight, shortDescription, features, heroImage, heroImageAlt,
    highlightedHeading, content, metaTitle, metaKeywords, metaDescription, canonicalTag, ogTitle, ogImage, schemaMarkup, status } = page;
  return { pageType, navServiceId: navServiceId ?? null, location, slug, heroEyebrow, title, highlight, shortDescription,
    features: features.length ? features : DEFAULT_FEATURES, heroImage, heroImageAlt, highlightedHeading, content, metaTitle,
    metaKeywords, metaDescription, canonicalTag, ogTitle, ogImage, schemaMarkup, status };
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || 'Please check the form and try again.';
}

const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();

type Picked = { file: File; preview: string } | null;

export function LocationPageForm({ existing }: { existing?: LocationPage }) {
  const router = useRouter();
  const isEdit = !!existing;
  const [form, setForm] = useState<LocationPageInput>(existing ? fromPage(existing) : EMPTY);
  // Editing keeps what was saved; a new page fills itself in until edited.
  const [touched, setTouched] = useState<Set<AutoField>>(() => new Set(isEdit ? AUTO_FIELDS : []));
  const [heroImage, setHeroImage] = useState<Picked>(null);
  const [ogImage, setOgImage] = useState<Picked>(null);

  const { data: groups = [], isLoading: optionsLoading } = useLocationPageOptions();
  const savePage = useSaveLocationPage();
  const uploader = useUploadFile('CITYCALLS_LOCATION_PAGE', existing?._id ?? 'new', { skipGlobalToast: true });
  const saving = savePage.isPending || uploader.isPending;

  const options = groups.flatMap((g) => g.pages);
  const selectedValue = form.pageType === 'HOME' ? 'HOME' : form.navServiceId ?? '';
  const selected: LocationPageOption | undefined = options.find((o) => o.value === selectedValue);
  // Saved page whose Navbar List link was since removed.
  const pageName = selected?.name ?? (existing && selectedValue === (existing.navServiceId ?? (existing.pageType === 'HOME' ? 'HOME' : '')) ? existing.serviceName : '');

  const set = (patch: Partial<LocationPageInput>) => setForm((f) => ({ ...f, ...patch }));
  // A hand edit stops that field following the page + city.
  const setManual = (field: AutoField, value: string) => {
    setTouched((t) => new Set(t).add(field));
    set({ [field]: value } as Partial<LocationPageInput>);
  };
  // Page or city changed → refill the fields nobody has edited.
  const refill = (patch: Partial<LocationPageInput>, name: string, city: string) => {
    const next = suggestions(name, city.trim());
    const auto = Object.fromEntries(AUTO_FIELDS.filter((f) => !touched.has(f)).map((f) => [f, next[f]]));
    set({ ...patch, ...auto });
  };

  function choosePage(value: string) {
    const option = options.find((o) => o.value === value);
    const patch: Partial<LocationPageInput> = value === 'HOME' ? { pageType: 'HOME', navServiceId: null } : { pageType: 'SERVICE', navServiceId: value || null };
    refill(patch, option?.name ?? '', form.location);
  }

  const heroPreview = heroImage?.preview ?? (form.heroImage ? resolveMediaUrl(form.heroImage) : null);
  const ogPreview = ogImage?.preview ?? (form.ogImage ? resolveMediaUrl(form.ogImage) : null);

  function pick(e: React.ChangeEvent<HTMLInputElement>, setter: (p: Picked) => void, current: Picked) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 10 MB.', confirmButtonColor: '#3e8914' });
      return;
    }
    if (current) URL.revokeObjectURL(current.preview);
    setter({ file, preview: URL.createObjectURL(file) });
  }

  const setFeature = (index: number, patch: Partial<LocationPageFeature>) =>
    set({ features: form.features.map((f, i) => (i === index ? { ...f, ...patch } : f)) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const warn = (text: string) => void Swal.fire({ icon: 'warning', title: 'Check the form', text, confirmButtonColor: '#3e8914' });
    if (!selectedValue) return warn('Please select the page this location page is for.');
    if (form.location.trim().length < 2) return warn('Please enter the location / city.');
    if (form.title.trim().length < 3) return warn('Please enter the page title (H1).');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return warn('URL can only use lowercase letters, numbers and dashes.');
    if (form.shortDescription.trim().length < 10) return warn('Please write a short summary (at least 10 characters).');
    if (!textOf(form.content)) return warn('Please write the page content.');
    const features = form.features.filter((f) => f.title.trim());

    try {
      // Images need the page's id, so they're uploaded after saving.
      const payload = { ...form, location: form.location.trim(), features };
      let saved = await savePage.mutateAsync(existing ? { id: existing._id, ...payload } : payload);
      const media: Partial<LocationPageInput> = {};
      if (heroImage) media.heroImage = (await uploader.upload(heroImage.file, 'WEBSITE_LOCATION_PAGE_IMAGE', saved._id)).url;
      if (ogImage) media.ogImage = (await uploader.upload(ogImage.file, 'WEBSITE_LOCATION_PAGE_IMAGE', saved._id)).url;
      if (Object.keys(media).length) saved = await savePage.mutateAsync({ id: saved._id, ...media });

      await Swal.fire({
        icon: 'success',
        title: isEdit ? 'Location page updated!' : 'Location page created!',
        text: saved.status === 'PUBLISHED' ? `It is live at citycalls.in/${saved.slug}` : 'Saved as draft — publish it when ready.',
        timer: 1800,
        showConfirmButton: false,
      });
      router.push('/dashboard/location-pages/list');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save the page', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  const counter = (len: number, max: number) => (
    <span className={`text-[10px] font-bold ${len > max ? 'text-red-500' : 'text-gray-400'}`}>{len}/{max}</span>
  );

  // Clicking the box opens its hidden file input (linked by id).
  const imageBox = (preview: string | null, inputId: string, onClear: () => void, label: string, tall = false) => (
    <label
      htmlFor={inputId}
      className={`group relative flex w-full cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed border-[#3e8914]/40 bg-[#3e8914]/[0.03] transition-colors hover:bg-[#3e8914]/[0.07] ${tall ? 'aspect-video' : 'h-28'}`}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            aria-label="Remove image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <span className="flex flex-col items-center gap-1.5 text-[#3e8914]">
          <Upload className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
          <span className="text-[9px] font-medium text-gray-400">JPG, PNG or WebP · up to 10 MB</span>
        </span>
      )}
    </label>
  );

  return (
    <form onSubmit={(e) => void submit(e)} className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <input id="location-hero-image" type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => pick(e, setHeroImage, heroImage)} />
      <input id="location-og-image" type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => pick(e, setOgImage, ogImage)} />

      {/* ── Left: configuration & SEO ── */}
      <div className="space-y-6 lg:col-span-1">
        <FormCard icon={Save} title="Configuration">
          <div className="space-y-3">
            <Field label="Publication Status">
              <select
                value={form.status}
                onChange={(e) => set({ status: e.target.value as LocationPageStatus })}
                className={`w-full border-2 px-2.5 py-2 text-[11px] font-bold uppercase tracking-widest outline-none ${STATUS_STYLE[form.status]}`}
              >
                <option value="PUBLISHED">● Published (Live)</option>
                <option value="DRAFT">○ Draft (Hidden)</option>
              </select>
            </Field>

            <Field label="Select Page" required hint="The home page or any service from Navbar List.">
              <select value={selectedValue} onChange={(e) => choosePage(e.target.value)} disabled={optionsLoading} className={FIELD_INPUT}>
                <option value="">{optionsLoading ? 'Loading pages…' : 'Select page'}</option>
                {groups.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.pages.map((o) => (
                      <option key={o.value} value={o.value}>{o.name}{o.inactive ? ' (inactive)' : ''}</option>
                    ))}
                  </optgroup>
                ))}
                {existing && selectedValue && !selected && !optionsLoading && <option value={selectedValue}>{existing.serviceName} (removed)</option>}
              </select>
            </Field>

            <Field label="Location / City" required hint="e.g. Noida, Ghaziabad, Indirapuram">
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3e8914]" />
                <input
                  value={form.location}
                  maxLength={80}
                  onChange={(e) => refill({ location: e.target.value }, pageName, e.target.value)}
                  placeholder="Enter city"
                  className={`${FIELD_INPUT} pl-8`}
                />
              </div>
            </Field>

            <Field label="SEO Permalink" required hint={<>citycalls.in/<span className="font-bold text-[#3e8914]">{form.slug || '…'}</span></>}>
              <input
                value={form.slug}
                maxLength={160}
                onChange={(e) => setManual('slug', slugify(e.target.value))}
                placeholder="refrigerator-service-in-noida"
                className={`${FIELD_INPUT} bg-gray-50 font-mono text-blue-600`}
              />
            </Field>

            {isEdit && existing.status === 'PUBLISHED' && (
              <a href={`${WEBSITE_ORIGIN}/${existing.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                View on website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </FormCard>

        <FormCard icon={Globe} title="SEO Metadata">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between"><label className={FIELD_LABEL}>Meta Title</label>{counter(form.metaTitle.length, 65)}</div>
              <input value={form.metaTitle} maxLength={70} onChange={(e) => setManual('metaTitle', e.target.value)} placeholder="Enter meta title" className={FIELD_INPUT} />
            </div>
            <Field label="Meta Keywords">
              <textarea rows={2} maxLength={500} value={form.metaKeywords} onChange={(e) => setManual('metaKeywords', e.target.value)} placeholder="Keywords, separated by commas" className={`${FIELD_INPUT} resize-none`} />
            </Field>
            <div>
              <div className="flex items-center justify-between"><label className={FIELD_LABEL}>Meta Description</label>{counter(form.metaDescription.length, 155)}</div>
              <textarea rows={3} value={form.metaDescription} maxLength={170} onChange={(e) => setManual('metaDescription', e.target.value)} placeholder="Brief summary for search results..." className={`${FIELD_INPUT} resize-none`} />
            </div>
            <Field label="Canonical Tag" hint="Leave empty to use this page's own URL.">
              <input value={form.canonicalTag} onChange={(e) => set({ canonicalTag: e.target.value })} placeholder={`https://citycalls.in/${form.slug || 'page-url'}`} className={FIELD_INPUT} />
            </Field>
          </div>
        </FormCard>

        <FormCard icon={Share2} title="Social Sharing">
          <div className="space-y-3">
            <Field label="OG Title">
              <input value={form.ogTitle} maxLength={200} onChange={(e) => setManual('ogTitle', e.target.value)} placeholder="Enter OG title" className={FIELD_INPUT} />
            </Field>
            <div>
              <label className={FIELD_LABEL}>OG Image</label>
              {imageBox(ogPreview, 'location-og-image', () => { if (ogImage) URL.revokeObjectURL(ogImage.preview); setOgImage(null); set({ ogImage: '' }); }, 'Drop Image Here')}
              <p className="mt-1 text-[10px] font-medium text-gray-400">Shown when the link is shared. Leave empty to use the hero image.</p>
            </div>
          </div>
        </FormCard>

        <FormCard icon={Code} title="Schema Markup" hint="JSON-LD for Google rich results. The <script> tag is optional — a Service schema for the city is added automatically.">
          <RichTextEditor code value={form.schemaMarkup} onChange={(v) => set({ schemaMarkup: v })} placeholder='{"@context": "https://schema.org", ...}' minHeight="120px" />
        </FormCard>
      </div>

      {/* ── Right: what the page shows ── */}
      <div className="space-y-6 lg:col-span-3">
        <FormCard icon={LayoutTemplate} title="Hero Section" hint="The top banner — same look as the service pages.">
          <div className="space-y-5">
            {!selectedValue || !form.location.trim() ? (
              <p className="flex items-center gap-2 border-2 border-dashed border-[#3e8914]/30 bg-[#3e8914]/[0.04] px-3 py-2 text-[11px] font-semibold text-[#2f6b0f]">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> Select the page and type the city — the title, URL, summary and SEO fill in automatically.
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Subtitle Chip">
                <input value={form.heroEyebrow} maxLength={80} onChange={(e) => set({ heroEyebrow: e.target.value })} placeholder="Professional & Reliable" className={FIELD_INPUT} />
              </Field>
              <Field label="Page Main Title (H1 for SEO)" required>
                <input value={form.title} maxLength={200} onChange={(e) => setManual('title', e.target.value)} placeholder="Refrigerator Service in Noida" className={FIELD_INPUT} />
              </Field>
              <Field label="Highlighted Word(s)" hint="Part of the title shown in green.">
                <input value={form.highlight} maxLength={100} onChange={(e) => setManual('highlight', e.target.value)} placeholder="Noida" className={FIELD_INPUT} />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between"><label className={FIELD_LABEL}>Short Summary <span className="text-red-500">*</span></label>{counter(form.shortDescription.length, 700)}</div>
              <textarea rows={2} maxLength={700} value={form.shortDescription} onChange={(e) => setManual('shortDescription', e.target.value)} placeholder="One or two lines under the title..." className={`${FIELD_INPUT} resize-none`} />
            </div>

            <div>
              <label className={FIELD_LABEL}>Hero Highlights (4)</label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {form.features.map((feature, index) => (
                  <div key={index} className="space-y-1.5 border-2 border-gray-100 bg-gray-50/60 p-2">
                    <input value={feature.title} maxLength={40} onChange={(e) => setFeature(index, { title: e.target.value })} placeholder="Expert" className={FIELD_INPUT} />
                    <input value={feature.subtitle} maxLength={40} onChange={(e) => setFeature(index, { subtitle: e.target.value })} placeholder="Technicians" className={FIELD_INPUT} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5 border-2 border-gray-100 bg-gray-50/60 p-4 md:flex-row">
              <div className="w-full md:w-1/3">
                <label className={FIELD_LABEL}>Hero Background Image</label>
                {imageBox(heroPreview, 'location-hero-image', () => { if (heroImage) URL.revokeObjectURL(heroImage.preview); setHeroImage(null); set({ heroImage: '' }); }, 'Upload Hero Image', true)}
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <Field label="Image Alt Text (SEO)">
                  <input value={form.heroImageAlt} maxLength={200} onChange={(e) => setManual('heroImageAlt', e.target.value)} placeholder="Describe the image..." className={FIELD_INPUT} />
                </Field>
                <p className="mt-2 text-[10px] font-medium italic text-gray-400">● Leave the image empty to use the selected service page&apos;s own hero photo.</p>
              </div>
            </div>
          </div>
        </FormCard>

        <FormCard icon={FileText} title="Page Content" hint="Shown below the hero, then the service cards for this city.">
          <div className="space-y-5">
            <Field label="Highlighted Heading" hint="Shown above the content with a green bar.">
              <input value={form.highlightedHeading} maxLength={200} onChange={(e) => setManual('highlightedHeading', e.target.value)} placeholder="Best Refrigerator Service in Noida | Same-Day Doorstep Service" className={FIELD_INPUT} />
            </Field>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={FIELD_LABEL}>Detailed Description <span className="text-red-500">*</span></label>
                <span className="border border-green-100 bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase text-green-600">Rich Text Active</span>
              </div>
              <RichTextEditor value={form.content} onChange={(v) => set({ content: v })} placeholder="Start typing page content..." minHeight="420px" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => router.push('/dashboard/location-pages/list')} className="rounded-[6px] bg-gray-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-[6px] bg-[#3e8914] px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_5px_12px_rgba(62,137,20,0.3)] transition-all hover:bg-[#347311] active:scale-95 disabled:opacity-60"
              >
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : isEdit ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : isEdit ? 'Update Location Page' : 'Save Location Page'}
              </button>
            </div>
          </div>
        </FormCard>
      </div>
    </form>
  );
}
