'use client';

import { useState } from 'react';
import { LayoutGrid, Plus, Rows3 } from 'lucide-react';

import { HELP_NOW_HOME_LIMITS, HelpNowHomeInputs, HelpNowHomeSaved, useSaveHelpNowHomeSection } from '@/lib/hooks/useHelpNowHome';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT } from '@/components/registrations/shared/styles';
import {
  HelpNowSectionPage, ImageField, ItemControls, SaveBar, StatusField, move, saveSection, usePickedImages, warn,
} from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Service Cards: the tall photo panels that
// widen on hover ("DISH WASHING — Utensil Care", "KITCHEN CLEANING …").

type Card = HelpNowHomeInputs['services']['cards'][number];
const blankCard = (): Card => ({ title: '', subtitle: '', subtitle2: '', description: '', image: '', alt: '' });

// Picked images are tracked per card, so reordering moves them with it.
let nextCardKey = 0;
const withKey = (card: Card) => ({ ...card, key: `card-${nextCardKey++}` });

function ServicesForm({ saved }: { saved: HelpNowHomeSaved<'services'> }) {
  // Keyed once, so typing never remounts a card.
  const [initialCards] = useState(() => saved.cards.map(withKey));
  const [cards, setCards] = useState(initialCards);
  const [status, setStatus] = useState(saved.status);
  const images = usePickedImages(saved._id);
  const save = useSaveHelpNowHomeSection('services');
  const saving = save.isPending || images.isUploading;

  const update = (index: number, patch: Partial<Card>) => setCards((prev) => prev.map((card, i) => (i === index ? { ...card, ...patch } : card)));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = cards.findIndex((card) => !card.title.trim());
    if (missing >= 0) return warn('Missing Title', `Card ${missing + 1} needs a title.`);
    const ready = await Promise.all(
      cards.map(async ({ key, ...card }) => ({ ...card, image: await images.resolve(key, card.image, 'WEBSITE_SERVICE_CARD_IMAGE') }))
    );
    if (await saveSection(save, { cards: ready, status }, 'Service cards')) images.reset();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {cards.map((card, index) => (
          <FormCard
            key={card.key}
            icon={Rows3}
            title={`Card ${index + 1}${card.title ? ` — ${[card.title, card.subtitle].filter(Boolean).join(' ')}` : ''}`}
            actions={
              <ItemControls
                index={index}
                count={cards.length}
                label={`card ${index + 1}`}
                onMove={(by) => setCards((prev) => move(prev, index, by))}
                onRemove={cards.length > 1 ? () => { images.clear(card.key); setCards((prev) => prev.filter((_, i) => i !== index)); } : undefined}
              />
            }
          >
            <div className="space-y-4">
              <ImageField
                label={`card ${index + 1} image`}
                preview={images.previewOf(card.key, card.image)}
                alt={card.alt}
                onPick={(file) => images.pick(card.key, file)}
                onClear={() => { images.clear(card.key); update(index, { image: '' }); }}
                onAlt={(alt) => update(index, { alt })}
                altPlaceholder="e.g. Help Now maid washing dishes in a modern kitchen"
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Title (line 1)" required>
                  <input value={card.title} maxLength={40} onChange={(e) => update(index, { title: e.target.value })} placeholder="Kitchen" className={FIELD_INPUT} />
                </Field>
                <Field label="Line 2">
                  <input value={card.subtitle} maxLength={40} onChange={(e) => update(index, { subtitle: e.target.value })} placeholder="Cleaning" className={FIELD_INPUT} />
                </Field>
                <Field label="Line 3">
                  <input value={card.subtitle2} maxLength={40} onChange={(e) => update(index, { subtitle2: e.target.value })} placeholder="Sanitization" className={FIELD_INPUT} />
                </Field>
              </div>
              <Field label="Description" hint="Appears on the right when the card is hovered.">
                <textarea rows={2} value={card.description} maxLength={200} onChange={(e) => update(index, { description: e.target.value })} className={`${FIELD_INPUT} resize-none`} />
              </Field>
            </div>
          </FormCard>
        ))}

        {cards.length < HELP_NOW_HOME_LIMITS.serviceCards && (
          <button
            type="button"
            onClick={() => setCards((prev) => [...prev, withKey(blankCard())])}
            className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-2 text-xs font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Card
          </button>
        )}
        <div className="md:w-1/3">
          <StatusField value={status} onChange={setStatus} where="service cards section" />
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`flex h-40 overflow-hidden ${status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {cards.map((card) => {
                const preview = images.previewOf(card.key, card.image);
                return (
                  <div key={card.key} className="relative flex-1 overflow-hidden bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {preview && <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5 right-1 font-serif text-[7px] font-bold uppercase leading-tight text-white">
                      <p>{card.title}</p>
                      {card.subtitle && <p className="pl-1">{card.subtitle}</p>}
                      {card.subtitle2 && <p className="pl-2">{card.subtitle2}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <SaveBar saving={saving} label="Save Service Cards" onUndo={() => { images.reset(); setCards(initialCards); setStatus(saved.status); }} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowServiceCardsPage() {
  return (
    <HelpNowSectionPage
      section="services"
      title="Service Cards"
      description="The tall photo cards on the Help Now home page that widen on hover — title lines, description, image and alt text."
    >
      {(saved) => <ServicesForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
