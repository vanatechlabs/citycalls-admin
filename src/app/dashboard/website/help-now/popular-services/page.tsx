'use client';

import { useState } from 'react';
import { Eye, EyeOff, LayoutGrid, LayoutList, Sparkles, Type } from 'lucide-react';
import Swal from 'sweetalert2';

import { HELP_NOW_RATE_LIMITS, HELP_NOW_SERVICES, HelpNowHomeInputs, HelpNowHomeSaved, useSaveHelpNowHomeSection } from '@/lib/hooks/useHelpNowHome';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT } from '@/components/registrations/shared/styles';
import {
  HeadingFields, HelpNowSectionPage, Highlighted, ImageField, ItemControls, SaveBar, highlightMissing, move, saveSection, usePickedImages, warn,
} from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Popular Services: the "Choose Your Cleaning
// Service — one tap away." carousel on the home page. One card per service.
// A card's price is the service's real hourly rate: the website, the booking
// form and the payment all use it.

type PopularInput = HelpNowHomeInputs['popular'];
type Card = PopularInput['cards'][number];
const serviceOf = (slug: Card['slug']) => HELP_NOW_SERVICES.find((s) => s.slug === slug);

const defaultRate = (slug: Card['slug']) => serviceOf(slug)?.ratePerHour ?? HELP_NOW_RATE_LIMITS.min;
const rateValid = (rate: number | undefined) =>
  typeof rate === 'number' && Number.isInteger(rate) && rate >= HELP_NOW_RATE_LIMITS.min && rate <= HELP_NOW_RATE_LIMITS.max;

// Every service gets a card: saved ones in their order, then any service the
// saved list doesn't have yet (hidden until switched on). Cards saved before
// prices were editable get the default rate.
function cardsFrom(saved: Card[]): Card[] {
  const missing = HELP_NOW_SERVICES.filter((s) => !saved.some((c) => c.slug === s.slug))
    .map((s): Card => ({ slug: s.slug, ratePerHour: s.ratePerHour, description: '', image: '', alt: '', badge: '', active: false }));
  return [...saved.map((c) => ({ ...c, ratePerHour: c.ratePerHour ?? defaultRate(c.slug) })), ...missing];
}

// A new price changes what customers are charged, so it's confirmed first.
async function confirmPriceChange(lines: string[]) {
  const result = await Swal.fire({
    icon: 'question',
    title: 'Change booking prices?',
    html: `New bookings will be charged:<br><strong>${lines.join('<br>')}</strong>`,
    showCancelButton: true,
    confirmButtonText: 'Yes, update prices',
    confirmButtonColor: '#3e8914',
  });
  return result.isConfirmed;
}

function PopularForm({ saved }: { saved: HelpNowHomeSaved<'popular'> }) {
  const [initial] = useState<PopularInput>(() => ({
    eyebrow: saved.eyebrow,
    heading: saved.heading,
    highlight: saved.highlight,
    description: saved.description,
    cards: cardsFrom(saved.cards),
    status: saved.status,
  }));
  const [form, setForm] = useState(initial);
  const [openSlug, setOpenSlug] = useState<string | null>(initial.cards[0]?.slug ?? null);
  const images = usePickedImages(saved._id);
  const save = useSaveHelpNowHomeSection('popular');
  const saving = save.isPending || images.isUploading;

  const update = (index: number, patch: Partial<Card>) =>
    setForm((prev) => ({ ...prev, cards: prev.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)) }));

  function undo() {
    images.reset();
    setForm(initial);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the section heading.');
    if (highlightMissing(form)) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    if (!form.cards.some((c) => c.active)) return warn('No Service Shown', 'Keep at least one service card active.');
    const badRate = form.cards.find((c) => !rateValid(c.ratePerHour));
    if (badRate) {
      return warn('Check Price', `${serviceOf(badRate.slug)?.name ?? badRate.slug}: price must be a whole number from ₹${HELP_NOW_RATE_LIMITS.min} to ₹${HELP_NOW_RATE_LIMITS.max} per hour.`);
    }
    const changed = form.cards.filter((c) => c.ratePerHour !== initial.cards.find((i) => i.slug === c.slug)?.ratePerHour);
    if (changed.length) {
      const ok = await confirmPriceChange(changed.map((c) => `${serviceOf(c.slug)?.name}: ₹${c.ratePerHour}/hr`));
      if (!ok) return;
    }

    const cards = await Promise.all(
      form.cards.map(async (card) => ({ ...card, image: await images.resolve(card.slug, card.image, 'WEBSITE_SERVICE_CARD_IMAGE') }))
    );
    if (await saveSection(save, { ...form, cards }, 'Popular services')) images.reset();
  }

  const shown = form.cards.filter((c) => c.active);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Type} title="Section Headings" hint="The small label, heading and line above the service cards.">
          <HeadingFields
            value={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            where="Popular Services section"
            placeholders={{ eyebrow: 'Our Popular Services', heading: 'Choose Your Cleaning Service — one tap away.', highlight: '— one tap away.' }}
          />
        </FormCard>

        <FormCard icon={LayoutList} title="Service Cards" hint={`${shown.length} of ${form.cards.length} shown, in this order. A card's price is the real booking rate per helper, per hour.`}>
          <div className="space-y-3">
            {form.cards.map((card, index) => {
              const service = serviceOf(card.slug);
              const open = openSlug === card.slug;
              return (
                <div key={card.slug} className="border-2 border-gray-200">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                    <button type="button" onClick={() => setOpenSlug(open ? null : card.slug)} className="min-w-0 flex-1 text-left">
                      <span className="mr-2 text-[11px] font-bold text-gray-400">{index + 1}.</span>
                      <span className="text-xs font-bold text-gray-800">{service?.name ?? card.slug}</span>
                      <span className={`ml-2 text-[10px] font-bold ${rateValid(card.ratePerHour) ? 'text-emerald-600' : 'text-red-500'}`}>₹{card.ratePerHour ?? '—'}/hr</span>
                      {card.badge && <span className="ml-2 bg-[#f5a623]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#b5730f]">{card.badge}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => update(index, { active: !card.active })}
                      className={`flex h-7 items-center gap-1 border-2 px-2 text-[10px] font-bold ${card.active ? 'border-[#3e8914]/40 bg-[#3e8914]/10 text-[#3e8914]' : 'border-gray-200 bg-white text-gray-500'}`}
                    >
                      {card.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {card.active ? 'Active' : 'Hidden'}
                    </button>
                    <ItemControls
                      index={index}
                      count={form.cards.length}
                      label={service?.name ?? card.slug}
                      onMove={(by) => setForm((prev) => ({ ...prev, cards: move(prev.cards, index, by) }))}
                    />
                  </div>
                  {open && (
                    <div className="space-y-3 p-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Field
                          label="Price (₹ per hour)"
                          required
                          hint={rateValid(card.ratePerHour)
                            ? `Per helper. Charged in bookings too (default ₹${defaultRate(card.slug)}).`
                            : <span className="text-red-500">Whole rupees, ₹{HELP_NOW_RATE_LIMITS.min}–₹{HELP_NOW_RATE_LIMITS.max}</span>}
                        >
                          <div className="flex">
                            <span className="flex items-center border-2 border-r-0 border-gray-300 bg-gray-50 px-2 text-xs font-bold text-gray-500">₹</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={HELP_NOW_RATE_LIMITS.min}
                              max={HELP_NOW_RATE_LIMITS.max}
                              step={1}
                              value={card.ratePerHour ?? ''}
                              onChange={(e) => update(index, { ratePerHour: e.target.value === '' ? undefined : Number(e.target.value) })}
                              className={`${FIELD_INPUT} ${rateValid(card.ratePerHour) ? '' : 'border-red-400'}`}
                            />
                            <span className="flex items-center border-2 border-l-0 border-gray-300 bg-gray-50 px-2 text-xs font-bold text-gray-500">/hr</span>
                          </div>
                        </Field>
                        <Field label="Badge" hint='Ribbon on the image, e.g. "Most Booked". Empty hides it.'>
                          <input value={card.badge} maxLength={24} onChange={(e) => update(index, { badge: e.target.value })} placeholder="Most Booked" className={FIELD_INPUT} />
                        </Field>
                      </div>
                      <div>
                        <Field label="Short Description" hint="Two lines on the card.">
                          <textarea rows={2} value={card.description} maxLength={160} onChange={(e) => update(index, { description: e.target.value })} className={`${FIELD_INPUT} resize-none`} />
                        </Field>
                      </div>
                      <ImageField
                        label={`${service?.name ?? card.slug} card image`}
                        preview={images.previewOf(card.slug, card.image)}
                        alt={card.alt}
                        onPick={(file) => images.pick(card.slug, file)}
                        onClear={() => { images.clear(card.slug); update(index, { image: '' }); }}
                        onAlt={(alt) => update(index, { alt })}
                        altPlaceholder={`e.g. Help Now helper doing ${service?.name.toLowerCase() ?? 'home cleaning'} in a Delhi NCR home`}
                      />
                      <p className="text-[10px] font-medium text-gray-400">JPG, PNG or WebP up to 10 MB, roughly 4:3. On hover the card shows the next card&apos;s image.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`bg-slate-50 p-3 ring-1 ring-gray-100 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {form.eyebrow && <p className="text-[7px] font-bold uppercase tracking-[0.25em] text-[#b5730f]">{form.eyebrow}</p>}
              <p className="mt-1 font-serif text-[13px] leading-snug text-slate-900"><Highlighted heading={form.heading || 'Heading'} highlight={form.highlight} /></p>
              {form.description && <p className="mt-1 text-[8px] text-slate-500">{form.description}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {shown.slice(0, 4).map((card) => {
                  const service = serviceOf(card.slug);
                  const src = images.previewOf(card.slug, card.image);
                  return (
                    <div key={card.slug} className="overflow-hidden rounded border border-slate-200 bg-white">
                      <div className="relative aspect-[4/3] bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
                        {card.badge && <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-[#f5a623] px-1 text-[6px] font-bold uppercase text-white"><Sparkles className="h-1.5 w-1.5" />{card.badge}</span>}
                      </div>
                      <div className="p-1.5">
                        <p className="text-[8px] font-bold uppercase text-slate-900">{service?.name}</p>
                        <p className="line-clamp-2 text-[6.5px] text-slate-500">{card.description}</p>
                        <p className="mt-0.5 text-[7px] font-semibold text-emerald-600">₹{card.ratePerHour ?? service?.ratePerHour}/hr</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {shown.length > 4 && <p className="mt-1.5 text-[8px] font-medium text-gray-400">+{shown.length - 4} more in the carousel</p>}
            </div>
          </section>
          <SaveBar saving={saving} label="Save Popular Services" onUndo={undo} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowPopularServicesPage() {
  return (
    <HelpNowSectionPage
      section="popular"
      title="Popular Services"
      description="The Help Now home page's service carousel — headings, and each service card's text, image, alt text, badge and order."
    >
      {(saved) => <PopularForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
