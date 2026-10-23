'use client';

import { useState } from 'react';
import {
  BadgeCheck, BadgePercent, CalendarClock, Clock, Info, LayoutGrid, ListChecks, Plus, ShieldCheck, Sparkles, Star, Type, Wallet,
  type LucideIcon,
} from 'lucide-react';

import { HELP_NOW_HOME_LIMITS, HelpNowHomeInputs, HelpNowHomeSaved, PERK_ICONS, PerkIcon, useSaveHelpNowHomeSection } from '@/lib/hooks/useHelpNowHome';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT } from '@/components/registrations/shared/styles';
import {
  HeadingFields, HelpNowSectionPage, Highlighted, ItemControls, SaveBar, highlightMissing, move, saveSection, warn,
} from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Pricing Section: the text around the home
// page's "Fair Pricing" calculator. The rates, hours and coupons inside it
// come from the booking system, so the shown price is always what's charged.

const ICONS: Record<PerkIcon, LucideIcon> = { BadgeCheck, Wallet, BadgePercent, CalendarClock, ShieldCheck, Clock, Sparkles, Star };
type PricingInput = HelpNowHomeInputs['pricing'];
type Perk = PricingInput['perks'][number];

function PricingForm({ saved }: { saved: HelpNowHomeSaved<'pricing'> }) {
  const [initial] = useState<PricingInput>(() => ({
    eyebrow: saved.eyebrow,
    heading: saved.heading,
    highlight: saved.highlight,
    description: saved.description,
    perks: saved.perks.map((perk) => ({ ...perk })),
    note: saved.note,
    status: saved.status,
  }));
  const [form, setForm] = useState(initial);
  const save = useSaveHelpNowHomeSection('pricing');

  const update = (index: number, patch: Partial<Perk>) =>
    setForm((prev) => ({ ...prev, perks: prev.perks.map((perk, i) => (i === index ? { ...perk, ...patch } : perk)) }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the section heading.');
    if (highlightMissing(form)) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    const missing = form.perks.findIndex((perk) => !perk.title.trim());
    if (missing >= 0) return warn('Incomplete Perk', `Perk ${missing + 1} needs a title — or remove it.`);
    await saveSection(save, form, 'Pricing section');
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <p className="flex items-start gap-2 border-l-4 border-[#3e8914] bg-[#3e8914]/5 px-3 py-2 text-[11px] font-medium text-gray-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3e8914]" />
          Hourly rates, hours and coupons in the calculator come from the booking system, so the price shown is always the price charged. This page edits the text around it.
        </p>

        <FormCard icon={Type} title="Section Headings" hint="The small label, heading and line above the calculator.">
          <HeadingFields
            value={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            where="Pricing section"
            placeholders={{ eyebrow: 'Fair Pricing', heading: 'Know your price before you book', highlight: 'before you book' }}
          />
        </FormCard>

        <FormCard icon={ListChecks} title="What Every Booking Includes" hint={`Up to ${HELP_NOW_HOME_LIMITS.pricingPerks} small tiles under the calculator.`}>
          <div className="space-y-2">
            {form.perks.map((perk, index) => {
              const Icon = ICONS[perk.icon];
              return (
                <div key={index} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[32px_140px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <span className="flex h-8 w-8 items-center justify-center border-2 border-[#f5a623]/40 bg-[#f5a623]/10 text-[#b5730f]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <select value={perk.icon} onChange={(e) => update(index, { icon: e.target.value as PerkIcon })} className={`${FIELD_INPUT} cursor-pointer`} aria-label={`Icon for perk ${index + 1}`}>
                    {PERK_ICONS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <input value={perk.title} maxLength={40} onChange={(e) => update(index, { title: e.target.value })} placeholder="Title, e.g. Verified helpers" className={`${FIELD_INPUT} col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto`} aria-label={`Perk ${index + 1} title`} />
                  <input value={perk.text} maxLength={60} onChange={(e) => update(index, { text: e.target.value })} placeholder="Line, e.g. Background-checked & trained" className={`${FIELD_INPUT} col-span-3 row-start-3 sm:col-span-1 sm:row-start-auto`} aria-label={`Perk ${index + 1} line`} />
                  <ItemControls
                    index={index}
                    count={form.perks.length}
                    label={`perk ${index + 1}`}
                    onMove={(by) => setForm((prev) => ({ ...prev, perks: move(prev.perks, index, by) }))}
                    onRemove={() => setForm((prev) => ({ ...prev, perks: prev.perks.filter((_, i) => i !== index) }))}
                  />
                </div>
              );
            })}
            {form.perks.length < HELP_NOW_HOME_LIMITS.pricingPerks && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, perks: [...prev.perks, { icon: 'BadgeCheck', title: '', text: '' }] }))}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-1.5 text-[11px] font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Perk
              </button>
            )}
          </div>
          <div className="mt-5">
            <Field label="Note Under the Calculator">
              <input value={form.note} maxLength={200} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Rates are per helper, per hour…" className={FIELD_INPUT} />
            </Field>
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`bg-[#f9f9f9] p-3 text-center ring-1 ring-gray-100 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {form.eyebrow && <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-[#f5a623]">{form.eyebrow}</p>}
              <p className="mt-1 text-[13px] font-semibold leading-snug text-[#1a1a1a]"><Highlighted heading={form.heading || 'Heading'} highlight={form.highlight} /></p>
              {form.description && <p className="mt-1 text-[8px] text-slate-500">{form.description}</p>}
              <div className="mt-3 grid grid-cols-2 gap-1.5 text-left">
                {form.perks.map((perk, i) => {
                  const Icon = ICONS[perk.icon];
                  return (
                    <div key={i} className="rounded bg-[#fffaf0] p-1.5 ring-1 ring-[#f5a623]/15">
                      <Icon className="h-3 w-3 text-[#e08e0b]" />
                      <p className="mt-1 text-[8px] font-semibold text-slate-900">{perk.title || '—'}</p>
                      <p className="text-[7px] text-slate-500">{perk.text}</p>
                    </div>
                  );
                })}
              </div>
              {form.note && <p className="mt-2 text-[7px] text-slate-400">{form.note}</p>}
            </div>
          </section>
          <SaveBar saving={save.isPending} label="Save Pricing Section" onUndo={() => setForm(initial)} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowPricingPage() {
  return (
    <HelpNowSectionPage
      section="pricing"
      title="Pricing Section"
      description={'The text around the Help Now home page\'s "Fair Pricing" calculator — headings, the perk tiles and the note under it.'}
    >
      {(saved) => <PricingForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
