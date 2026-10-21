'use client';

import { useState } from 'react';
import { CheckCircle2, LayoutGrid, LayoutTemplate, ListChecks, Plus, Trash2, Type } from 'lucide-react';

import { HELP_NOW_HOME_LIMITS, HelpNowHomeInputs, HelpNowHomeSaved, useSaveHelpNowHomeSection } from '@/lib/hooks/useHelpNowHome';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL } from '@/components/registrations/shared/styles';
import { HelpNowSectionPage, ImageField, SaveBar, StatusField, saveSection, usePickedImages, warn } from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → About HelpNow: the "A Part of CityCalls —
// Trusted by Thousands of Homes" section with its points and four cards.

type AboutInput = HelpNowHomeInputs['about'];
const DESCRIPTION_MAX = 700;

function formFrom(saved: HelpNowHomeSaved<'about'>): AboutInput {
  return {
    eyebrow: saved.eyebrow,
    heading: saved.heading,
    highlight: saved.highlight,
    headingLine2: saved.headingLine2,
    description: saved.description,
    points: [...saved.points],
    // Always four card slots — the website lays them out as a 2×2 grid.
    cards: Array.from({ length: HELP_NOW_HOME_LIMITS.aboutCards }, (_, i) => ({
      title: saved.cards[i]?.title ?? '',
      description: saved.cards[i]?.description ?? '',
      image: saved.cards[i]?.image ?? '',
      alt: saved.cards[i]?.alt ?? '',
    })),
    status: saved.status,
  };
}

function Heading({ heading, highlight }: { heading: string; highlight: string }) {
  const index = highlight ? heading.indexOf(highlight) : -1;
  if (index < 0) return <>{heading}</>;
  return <>{heading.slice(0, index)}<span className="text-[#f5a623]">{highlight}</span>{heading.slice(index + highlight.length)}</>;
}

function AboutForm({ saved }: { saved: HelpNowHomeSaved<'about'> }) {
  const initial = formFrom(saved);
  const [form, setForm] = useState<AboutInput>(initial);
  const images = usePickedImages(saved._id);
  const save = useSaveHelpNowHomeSection('about');
  const saving = save.isPending || images.isUploading;
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);

  const update = <K extends keyof AboutInput>(key: K, value: AboutInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateCard = (index: number, patch: Partial<AboutInput['cards'][number]>) =>
    setForm((prev) => ({ ...prev, cards: prev.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)) }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the section heading.');
    if (highlightMissing) return warn('Check Highlight', 'Highlight text must be part of the first heading line.');
    const filled = form.cards.map((card, i) => ({ card, i })).filter(({ card, i }) => card.title.trim() || card.image || images.picked[`card-${i}`]);
    const untitled = filled.find(({ card }) => !card.title.trim());
    if (untitled) return warn('Missing Card Title', `Card ${untitled.i + 1} needs a title (or clear its image to drop it).`);

    const cards = await Promise.all(
      filled.map(async ({ card, i }) => ({ ...card, image: await images.resolve(`card-${i}`, card.image, 'WEBSITE_ABOUT_IMAGE') }))
    );
    if (await saveSection(save, { ...form, cards }, 'About HelpNow')) images.reset();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Type} title="Section Text" hint="The small label, two-line heading and paragraph on the left.">
          <div className="space-y-4">
            <Field label="Eyebrow" hint='Small label above the heading, e.g. "About HelpNow".'>
              <input value={form.eyebrow} maxLength={60} onChange={(e) => update('eyebrow', e.target.value)} className={FIELD_INPUT} />
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Heading — Line 1" required className="md:col-span-2">
                <input value={form.heading} maxLength={120} onChange={(e) => update('heading', e.target.value)} placeholder="A Part of CityCalls —" className={FIELD_INPUT} />
              </Field>
              <Field label="Gold Text" hint={highlightMissing ? <span className="text-red-500">Must be part of line 1</span> : 'Part of line 1 shown in gold.'}>
                <input value={form.highlight} maxLength={60} onChange={(e) => update('highlight', e.target.value)} placeholder="CityCalls" className={`${FIELD_INPUT} ${highlightMissing ? 'border-red-400' : ''}`} />
              </Field>
            </div>
            <Field label="Heading — Line 2">
              <input value={form.headingLine2} maxLength={120} onChange={(e) => update('headingLine2', e.target.value)} placeholder="Trusted by Thousands of Homes" className={FIELD_INPUT} />
            </Field>
            <div>
              <div className="flex items-center justify-between">
                <label className={FIELD_LABEL}>Description</label>
                <span className="mb-1 text-[10px] font-bold text-gray-400">{form.description.length}/{DESCRIPTION_MAX}</span>
              </div>
              <textarea rows={4} value={form.description} maxLength={DESCRIPTION_MAX} onChange={(e) => update('description', e.target.value)} className={`${FIELD_INPUT} resize-none`} />
            </div>
          </div>
        </FormCard>

        <FormCard icon={ListChecks} title="Key Points" hint={`Up to ${HELP_NOW_HOME_LIMITS.aboutPoints} points shown with a tick under the paragraph.`}>
          <div className="space-y-2">
            {form.points.map((point, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-gray-200 text-[11px] font-bold text-gray-500">{index + 1}</span>
                <input
                  value={point}
                  maxLength={140}
                  onChange={(e) => update('points', form.points.map((p, i) => (i === index ? e.target.value : p)))}
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
            {form.points.length < HELP_NOW_HOME_LIMITS.aboutPoints && (
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

        <FormCard icon={LayoutTemplate} title="Cards" hint="The four photo cards on the right (2 × 2). Leave a card empty to drop it.">
          <div className="space-y-4">
            {form.cards.map((card, index) => (
              <div key={index} className="space-y-3 border-2 border-gray-200 p-3">
                <p className="text-xs font-bold text-gray-700">Card {index + 1}</p>
                <ImageField
                  label={`card ${index + 1} image`}
                  preview={images.previewOf(`card-${index}`, card.image)}
                  alt={card.alt}
                  onPick={(file) => images.pick(`card-${index}`, file)}
                  onClear={() => { images.clear(`card-${index}`); updateCard(index, { image: '' }); }}
                  onAlt={(alt) => updateCard(index, { alt })}
                  altPlaceholder="e.g. Help Now maid mopping a living room floor"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Title">
                    <input value={card.title} maxLength={80} onChange={(e) => updateCard(index, { title: e.target.value })} className={FIELD_INPUT} />
                  </Field>
                  <Field label="Text">
                    <input value={card.description} maxLength={200} onChange={(e) => updateCard(index, { description: e.target.value })} className={FIELD_INPUT} />
                  </Field>
                </div>
              </div>
            ))}
            <div className="md:w-1/3">
              <StatusField value={form.status} onChange={(status) => update('status', status)} where="About section" />
            </div>
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`bg-white p-3 ring-1 ring-gray-100 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {form.eyebrow && <p className="mb-1 text-[7px] font-bold uppercase tracking-[0.25em] text-[#f5a623]">{form.eyebrow}</p>}
              <p className="text-[13px] font-extrabold leading-snug text-slate-900">
                <Heading heading={form.heading || 'Heading'} highlight={form.highlight} />
                {form.headingLine2 && <><br />{form.headingLine2}</>}
              </p>
              {form.description && <p className="mt-1.5 line-clamp-3 text-[8px] leading-relaxed text-gray-700">{form.description}</p>}
              <ul className="mt-2 space-y-0.5">
                {form.points.filter(Boolean).map((point, i) => (
                  <li key={i} className="flex items-center gap-1 text-[7.5px] font-medium text-gray-700">
                    <CheckCircle2 className="h-2 w-2 shrink-0 text-[#f5a623]" /> {point}
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {form.cards.map((card, i) => {
                  const preview = images.previewOf(`card-${i}`, card.image);
                  return (card.title || preview) && (
                    <div key={i} className="overflow-hidden rounded-md border border-gray-100">
                      <div className="h-12 bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <p className="px-1 pt-1 text-[7px] font-bold leading-tight text-slate-900">{card.title}</p>
                      <p className="line-clamp-2 px-1 pb-1 text-[6.5px] text-gray-500">{card.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <SaveBar saving={saving} label="Save About HelpNow" onUndo={() => { images.reset(); setForm(initial); }} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowAboutPage() {
  return (
    <HelpNowSectionPage
      section="about"
      title="About HelpNow"
      description="The Help Now home page's About section — label, heading, paragraph, key points and the four photo cards with alt text."
    >
      {(saved) => <AboutForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
