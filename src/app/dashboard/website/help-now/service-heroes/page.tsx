'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, Clock, Globe, Image as ImageIcon, IndianRupee, ListChecks, Plus, ShieldCheck, Trash2, Type } from 'lucide-react';
import Swal from 'sweetalert2';

import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  MAX_SERVICE_HERO_FEATURES, ServiceHero, ServiceHeroFeature, ServiceHeroInput, ServiceHeroStatus,
  useSaveServiceHero, useServiceHero, useServiceHeroOptions,
} from '@/lib/hooks/useHelpNowServiceHeroes';
import { formatDate, formatTime } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL } from '@/components/registrations/shared/styles';
import { ImageField, SaveBar, errorMessage, helpNowPreviewUrl, warn } from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Service Page Hero: the banner at the top of
// each helpnow.citycalls.in/services/<slug> page — background image, alt
// text, heading, description and feature badges.

// Same icon order as the website hero.
const FEATURE_ICONS = [BadgeCheck, ShieldCheck, IndianRupee, Clock];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const inputOf = (hero: ServiceHero): ServiceHeroInput => ({
  subheading: hero.subheading,
  heading: hero.heading,
  highlight: hero.highlight,
  description: hero.description,
  features: hero.features,
  image: hero.image,
  imageAlt: hero.imageAlt,
  status: hero.status,
});

function HighlightedHeading({ heading, highlight }: { heading: string; highlight: string }) {
  const index = highlight ? heading.indexOf(highlight) : -1;
  if (index < 0) return <>{heading}</>;
  return <>{heading.slice(0, index)}<span className="text-[#e0a100]">{highlight}</span>{heading.slice(index + highlight.length)}</>;
}

// Keyed by slug, so switching service starts fresh; a save keeps the form as is.
function ServiceHeroForm({ hero }: { hero: ServiceHero }) {
  const [initial, setInitial] = useState(() => inputOf(hero));
  const [form, setForm] = useState(initial);
  const [picked, setPicked] = useState<{ file: File; preview: string } | null>(null);
  const save = useSaveServiceHero(hero.slug);
  const upload = useUploadFile('HELP_NOW_SERVICE_HERO', hero._id ?? 'new', { skipGlobalToast: true });
  const saving = save.isPending || upload.isPending;

  const update = <K extends keyof ServiceHeroInput>(key: K, value: ServiceHeroInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateFeature = (index: number, key: keyof ServiceHeroFeature, value: string) =>
    setForm((prev) => ({ ...prev, features: prev.features.map((f, i) => (i === index ? { ...f, [key]: value } : f)) }));
  const preview = picked?.preview ?? helpNowPreviewUrl(form.image);
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);

  function pickImage(file: File) {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      warn('Invalid image', 'Use a JPG, PNG or WebP image up to 10 MB (1920×700 or wider recommended).');
      return;
    }
    if (picked) URL.revokeObjectURL(picked.preview);
    setPicked({ file, preview: URL.createObjectURL(file) });
  }

  function clearImage() {
    if (picked) URL.revokeObjectURL(picked.preview);
    setPicked(null);
    update('image', '');
  }

  function undo() {
    if (picked) URL.revokeObjectURL(picked.preview);
    setPicked(null);
    setForm(initial);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the heading (H1).');
    if (highlightMissing) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    if (!preview) return warn('Missing Image', 'Please upload a background image.');
    const features = form.features.filter((f) => f.title.trim() || f.subtitle.trim());
    if (features.some((f) => !f.title.trim())) return warn('Check Features', 'Every feature needs a first line — remove the empty ones.');

    try {
      let saved = await save.mutateAsync({ ...form, features });
      // The image is linked to the saved entry, so it's uploaded after saving.
      if (picked && saved._id) {
        const uploaded = await upload.upload(picked.file, 'WEBSITE_PAGE_HERO_IMAGE', saved._id);
        saved = await save.mutateAsync({ ...inputOf(saved), image: uploaded.url });
        URL.revokeObjectURL(picked.preview);
        setPicked(null);
      }
      const next = inputOf(saved);
      setForm(next);
      setInitial(next);
      void Swal.fire({ icon: 'success', title: 'Updated!', text: `${hero.name} hero saved successfully`, confirmButtonColor: '#3e8914', timer: 1500, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save hero', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Type} title="Hero Text" hint="The text shown over the background image at the top of the page.">
          <div className="space-y-4">
            <Field label="Subheading" hint='Small chip above the heading, e.g. "Trusted Home Services".'>
              <input value={form.subheading} maxLength={60} onChange={(e) => update('subheading', e.target.value)} placeholder="Trusted Home Services" className={FIELD_INPUT} />
            </Field>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Heading (H1)" required className="md:col-span-2" hint="The page's main H1 title.">
                <input required value={form.heading} maxLength={120} onChange={(e) => update('heading', e.target.value)} placeholder={`${hero.name} in Delhi NCR`} className={FIELD_INPUT} />
              </Field>
              <Field label="Highlight Text" hint={highlightMissing ? <span className="text-red-500">Must be part of the heading</span> : 'Shown in gold, on its own line.'}>
                <input
                  value={form.highlight}
                  maxLength={80}
                  onChange={(e) => update('highlight', e.target.value)}
                  placeholder={hero.name}
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
                className={`${FIELD_INPUT} resize-none`}
              />
            </div>
          </div>
        </FormCard>

        <FormCard icon={ListChecks} title="Features" hint={`Up to ${MAX_SERVICE_HERO_FEATURES} badges under the text — a bold first line and a second line, e.g. "Trained" / "Professionals".`}>
          <div className="space-y-2">
            {form.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-gray-200 text-[11px] font-bold text-gray-500">{index + 1}</span>
                <input value={feature.title} maxLength={30} onChange={(e) => updateFeature(index, 'title', e.target.value)} placeholder="First line, e.g. Trained" className={`${FIELD_INPUT} min-w-0`} aria-label={`Feature ${index + 1} first line`} />
                <input value={feature.subtitle} maxLength={30} onChange={(e) => updateFeature(index, 'subtitle', e.target.value)} placeholder="Second line, e.g. Professionals" className={`${FIELD_INPUT} min-w-0`} aria-label={`Feature ${index + 1} second line`} />
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
            {form.features.length < MAX_SERVICE_HERO_FEATURES && (
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

        <FormCard icon={ImageIcon} title="Background Image" hint="Uploads to Cloudinary. Use a wide image (1920×700 or larger) with the person on the right — the text sits on the left.">
          <div className="space-y-4">
            <ImageField
              label={`${hero.name} background`}
              preview={preview}
              alt={form.imageAlt}
              onPick={pickImage}
              onClear={clearImage}
              onAlt={(alt) => update('imageAlt', alt)}
              altPlaceholder={`e.g. Help Now helper doing ${hero.name.toLowerCase()} in a Delhi NCR home`}
            />
            <p className="text-[10px] font-medium text-gray-400">JPG, PNG or WebP up to 10 MB.</p>
            <div className="md:w-1/3">
              <Field label="Status" hint={form.status === 'ACTIVE' ? 'Shown on the website.' : 'Hidden — the page shows its built-in hero.'}>
                <select value={form.status} onChange={(e) => update('status', e.target.value as ServiceHeroStatus)} className={`${FIELD_INPUT} cursor-pointer`}>
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
            <div className={`relative overflow-hidden bg-[#fffaf2] text-[#0f172a] ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
              )}
              <div className="relative p-4">
                {form.subheading && (
                  <p className="mb-1.5 inline-block rounded-full border border-white/60 bg-white/40 px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest">{form.subheading}</p>
                )}
                <p className="mb-2 max-w-[70%] text-lg font-extrabold leading-tight">
                  {form.heading ? <HighlightedHeading heading={form.heading} highlight={form.highlight} /> : 'Heading (H1)'}
                </p>
                {form.description && <p className="mb-3 max-w-[65%] text-[9px] font-semibold text-slate-800">{form.description}</p>}
                <div className="flex flex-wrap gap-3">
                  {form.features.map((f, i) => {
                    const Icon = FEATURE_ICONS[i] ?? BadgeCheck;
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-[8px] font-bold">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/50"><Icon className="h-3 w-3 text-[#e08e0b]" /></span>
                        <span>{f.title}<br />{f.subtitle}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-gray-400">Shown at the top of helpnow.citycalls.in{hero.path}</p>
          </section>
          <SaveBar saving={saving} label={`Save ${hero.name} Hero`} onUndo={undo} />
        </div>
      </div>
    </form>
  );
}

function ServiceHeroesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: options = [], isLoading: optionsLoading } = useServiceHeroOptions();
  const slug = searchParams.get('slug') || options[0]?.slug || null;
  const { data: hero, isLoading, isError } = useServiceHero(slug);

  let body;
  if (optionsLoading || (slug && isLoading)) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (isError || !hero) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Could not load this service&apos;s hero.</div>;
  } else {
    body = <ServiceHeroForm key={hero.slug} hero={hero} />;
  }

  return (
    <PageShell
      title="Service Page Hero"
      description={
        <>
          The banner at the top of each Help Now service page — background image, alt text, heading, description and features.
          {hero?.saved && hero.updatedBy && hero.updatedAt && (
            <> Last updated by <strong className="text-[#4B1426]">{hero.updatedBy.name}</strong>, {formatDate(hero.updatedAt)}, {formatTime(hero.updatedAt)}.</>
          )}
        </>
      }
    >
      <div className="mb-6">
        <FormCard icon={Globe} title="Service Page" hint="Pick a service. Pages marked ✓ already have their own hero; the rest show the built-in one until saved.">
          <Field label="Select Service" required>
            <select
              value={slug ?? ''}
              disabled={optionsLoading}
              onChange={(e) => router.replace(`/dashboard/website/help-now/service-heroes?slug=${e.target.value}`)}
              className={`${FIELD_INPUT} cursor-pointer md:w-1/2`}
            >
              {options.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name} ({o.path}){o.saved ? `  ✓ Saved${o.status === 'INACTIVE' ? ' (inactive)' : ''}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </FormCard>
      </div>
      {body}
    </PageShell>
  );
}

export default function HelpNowServiceHeroesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>}>
      <ServiceHeroesInner />
    </Suspense>
  );
}
