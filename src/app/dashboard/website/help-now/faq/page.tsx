'use client';

import { useState } from 'react';
import { Eye, EyeOff, HelpCircle, LayoutGrid, Plus, Type } from 'lucide-react';

import { HELP_NOW_HOME_LIMITS, HelpNowHomeInputs, HelpNowHomeSaved, useSaveHelpNowHomeSection } from '@/lib/hooks/useHelpNowHome';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT } from '@/components/registrations/shared/styles';
import {
  HelpNowSectionPage, ImageField, ItemControls, SaveBar, StatusField, move, saveSection, usePickedImages, warn,
} from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Help Now FAQ: the home page's "Frequently
// Asked Questions" — headings, and question cards each with a preview image.

type FaqInput = HelpNowHomeInputs['faq'];
type Item = FaqInput['items'][number];
const blankItem = (): Item => ({ question: '', answer: '', image: '', alt: '', active: true });

// Picked images are tracked per item, so reordering moves them with it.
let nextKey = 0;
const withKey = (item: Item) => ({ ...item, key: `faq-${nextKey++}` });

function Heading({ heading, highlight }: { heading: string; highlight: string }) {
  const index = highlight ? heading.indexOf(highlight) : -1;
  if (index < 0) return <>{heading}</>;
  return <>{heading.slice(0, index)}<span className="text-[#f5a623]">{highlight}</span>{heading.slice(index + highlight.length)}</>;
}

function FaqForm({ saved }: { saved: HelpNowHomeSaved<'faq'> }) {
  const [initialItems] = useState(() => saved.items.map(withKey));
  const [items, setItems] = useState(initialItems);
  const [headings, setHeadings] = useState({
    eyebrow: saved.eyebrow,
    heading: saved.heading,
    highlight: saved.highlight,
    description: saved.description,
    status: saved.status,
  });
  const [openKey, setOpenKey] = useState<string | null>(initialItems[0]?.key ?? null);
  const images = usePickedImages(saved._id);
  const save = useSaveHelpNowHomeSection('faq');
  const saving = save.isPending || images.isUploading;
  const highlightMissing = !!headings.highlight && !headings.heading.includes(headings.highlight);

  const update = (index: number, patch: Partial<Item>) => setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  function undo() {
    images.reset();
    setItems(initialItems);
    setHeadings({ eyebrow: saved.eyebrow, heading: saved.heading, highlight: saved.highlight, description: saved.description, status: saved.status });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!headings.heading.trim()) return warn('Missing Heading', 'Please enter the section heading.');
    if (highlightMissing) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    const missing = items.findIndex((item) => !item.question.trim() || !item.answer.trim());
    if (missing >= 0) return warn('Incomplete FAQ', `FAQ ${missing + 1} needs both a question and an answer.`);

    const ready = await Promise.all(
      items.map(async ({ key, ...item }) => ({ ...item, image: await images.resolve(key, item.image, 'WEBSITE_FAQ_IMAGE') }))
    );
    if (await saveSection(save, { ...headings, items: ready }, 'FAQ')) images.reset();
  }

  const shown = items.filter((item) => item.active).length;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Type} title="Section Headings" hint="The small label, heading and line above the questions.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Subheading">
                <input value={headings.eyebrow} maxLength={60} onChange={(e) => setHeadings((h) => ({ ...h, eyebrow: e.target.value }))} placeholder="Support & Info" className={FIELD_INPUT} />
              </Field>
              <StatusField value={headings.status} onChange={(status) => setHeadings((h) => ({ ...h, status }))} where="FAQ section" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Main Heading" required className="md:col-span-2">
                <input value={headings.heading} maxLength={120} onChange={(e) => setHeadings((h) => ({ ...h, heading: e.target.value }))} placeholder="Frequently Asked Questions" className={FIELD_INPUT} />
              </Field>
              <Field label="Highlight Word" hint={highlightMissing ? <span className="text-red-500">Must be part of the heading</span> : 'Shown in gold.'}>
                <input value={headings.highlight} maxLength={60} onChange={(e) => setHeadings((h) => ({ ...h, highlight: e.target.value }))} placeholder="Questions" className={`${FIELD_INPUT} ${highlightMissing ? 'border-red-400' : ''}`} />
              </Field>
            </div>
            <Field label="Short Description">
              <textarea rows={2} value={headings.description} maxLength={300} onChange={(e) => setHeadings((h) => ({ ...h, description: e.target.value }))} className={`${FIELD_INPUT} resize-none`} />
            </Field>
          </div>
        </FormCard>

        <FormCard icon={HelpCircle} title="FAQ Items" hint={`${shown} of ${items.length} shown on the website. Each answer shows its image beside the list.`}>
          <div className="space-y-3">
            {items.map((item, index) => {
              const open = openKey === item.key;
              return (
                <div key={item.key} className="border-2 border-gray-200">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                    <button type="button" onClick={() => setOpenKey(open ? null : item.key)} className="min-w-0 flex-1 text-left">
                      <span className="mr-2 text-[11px] font-bold text-gray-400">{index + 1}.</span>
                      <span className="text-xs font-bold text-gray-800">{item.question || 'New question'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => update(index, { active: !item.active })}
                      className={`flex h-7 items-center gap-1 border-2 px-2 text-[10px] font-bold ${item.active ? 'border-[#3e8914]/40 bg-[#3e8914]/10 text-[#3e8914]' : 'border-gray-200 bg-white text-gray-500'}`}
                    >
                      {item.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {item.active ? 'Active' : 'Hidden'}
                    </button>
                    <ItemControls
                      index={index}
                      count={items.length}
                      label={`FAQ ${index + 1}`}
                      onMove={(by) => setItems((prev) => move(prev, index, by))}
                      onRemove={() => { images.clear(item.key); setItems((prev) => prev.filter((_, i) => i !== index)); }}
                    />
                  </div>
                  {open && (
                    <div className="space-y-3 p-3">
                      <Field label="Question" required>
                        <input value={item.question} maxLength={200} onChange={(e) => update(index, { question: e.target.value })} placeholder="Enter question text..." className={FIELD_INPUT} />
                      </Field>
                      <Field label="Answer" required>
                        <textarea rows={3} value={item.answer} maxLength={1000} onChange={(e) => update(index, { answer: e.target.value })} placeholder="Enter clear and concise answer..." className={`${FIELD_INPUT} resize-none`} />
                      </Field>
                      <ImageField
                        label={`FAQ ${index + 1} image`}
                        preview={images.previewOf(item.key, item.image)}
                        alt={item.alt}
                        onPick={(file) => images.pick(item.key, file)}
                        onClear={() => { images.clear(item.key); update(index, { image: '' }); }}
                        onAlt={(alt) => update(index, { alt })}
                        altPlaceholder="e.g. Help Now maid arriving for a home visit"
                      />
                      <p className="text-[10px] font-medium text-gray-400">JPG, PNG or WebP up to 5 MB.</p>
                    </div>
                  )}
                </div>
              );
            })}
            {items.length < HELP_NOW_HOME_LIMITS.faqItems && (
              <button
                type="button"
                onClick={() => {
                  const item = withKey(blankItem());
                  setItems((prev) => [...prev, item]);
                  setOpenKey(item.key);
                }}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-2 text-xs font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add FAQ
              </button>
            )}
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`bg-white p-3 text-center ring-1 ring-gray-100 ${headings.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {headings.eyebrow && <p className="text-[7px] font-bold uppercase tracking-[0.25em] text-[#b5730f]">{headings.eyebrow}</p>}
              <p className="mt-1 text-[13px] font-extrabold uppercase leading-snug text-slate-900">
                <Heading heading={headings.heading || 'Heading'} highlight={headings.highlight} />
              </p>
              {headings.description && <p className="mt-1 text-[8px] text-gray-600">{headings.description}</p>}
              <ul className="mt-3 space-y-1 text-left">
                {items.filter((item) => item.active).map((item) => (
                  <li key={item.key} className="rounded border border-gray-200 px-2 py-1 text-[8px] font-bold text-slate-800">{item.question || '—'}</li>
                ))}
              </ul>
            </div>
          </section>
          <SaveBar saving={saving} label="Save FAQ" onUndo={undo} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowFaqPage() {
  return (
    <HelpNowSectionPage
      section="faq"
      title="Help Now FAQ"
      description="The Help Now home page's Frequently Asked Questions — headings, and each question with its answer, preview image and alt text."
    >
      {(saved) => <FaqForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
