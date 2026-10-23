'use client';

import { useState } from 'react';
import {
  CalendarDays, CheckCircle2, ClipboardList, Clock, CreditCard, Home, LayoutGrid, ListOrdered, MapPin, Plus, ShieldCheck, Sparkles, Type, UserCheck,
  type LucideIcon,
} from 'lucide-react';

import { HELP_NOW_HOME_LIMITS, HelpNowHomeInputs, HelpNowHomeSaved, STEP_ICONS, StepIcon, useSaveHelpNowHomeSection } from '@/lib/hooks/useHelpNowHome';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT } from '@/components/registrations/shared/styles';
import {
  HeadingFields, HelpNowSectionPage, Highlighted, ItemControls, SaveBar, highlightMissing, move, saveSection, warn,
} from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Booking Steps: the home page's "Simple Steps
// to Book" timeline. Steps are numbered 01, 02… in this order.

const ICONS: Record<StepIcon, LucideIcon> = { Home, CalendarDays, MapPin, CreditCard, CheckCircle2, ClipboardList, UserCheck, Sparkles, Clock, ShieldCheck };
type StepsInput = HelpNowHomeInputs['steps'];
type Step = StepsInput['items'][number];

function StepsForm({ saved }: { saved: HelpNowHomeSaved<'steps'> }) {
  const [initial] = useState<StepsInput>(() => ({
    eyebrow: saved.eyebrow,
    heading: saved.heading,
    highlight: saved.highlight,
    items: saved.items.map((item) => ({ ...item })),
    status: saved.status,
  }));
  const [form, setForm] = useState(initial);
  const save = useSaveHelpNowHomeSection('steps');

  const update = (index: number, patch: Partial<Step>) =>
    setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.heading.trim()) return warn('Missing Heading', 'Please enter the section heading.');
    if (highlightMissing(form)) return warn('Check Highlight', 'Highlight text must be part of the heading.');
    const missing = form.items.findIndex((item) => !item.title.trim());
    if (missing >= 0) return warn('Incomplete Step', `Step ${missing + 1} needs a title.`);
    await saveSection(save, form, 'Booking steps');
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Type} title="Section Headings" hint="The small label and heading above the steps.">
          <HeadingFields
            value={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            where="Booking Steps section"
            placeholders={{ eyebrow: 'Your Guide', heading: 'Simple Steps to Book House Help', highlight: 'House Help' }}
          />
        </FormCard>

        <FormCard icon={ListOrdered} title="Steps" hint={`${HELP_NOW_HOME_LIMITS.steps} steps at most, at least 2. A gold line fills across them as the visitor scrolls.`}>
          <div className="space-y-3">
            {form.items.map((item, index) => {
              const Icon = ICONS[item.icon];
              return (
                <div key={index} className="space-y-2 border-2 border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#f5a623] bg-[#f5a623]/10 text-[#b5730f]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-extrabold text-gray-500">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1" />
                    <ItemControls
                      index={index}
                      count={form.items.length}
                      label={`step ${index + 1}`}
                      onMove={(by) => setForm((prev) => ({ ...prev, items: move(prev.items, index, by) }))}
                      onRemove={form.items.length > 2 ? () => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) })) : undefined}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[150px_minmax(0,1fr)]">
                    <Field label="Icon">
                      <select value={item.icon} onChange={(e) => update(index, { icon: e.target.value as StepIcon })} className={`${FIELD_INPUT} cursor-pointer`}>
                        {STEP_ICONS.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </Field>
                    <Field label="Title" required>
                      <input value={item.title} maxLength={60} onChange={(e) => update(index, { title: e.target.value })} placeholder="e.g. Choose Service" className={FIELD_INPUT} />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea rows={2} value={item.description} maxLength={200} onChange={(e) => update(index, { description: e.target.value })} className={`${FIELD_INPUT} resize-none`} />
                  </Field>
                </div>
              );
            })}
            {form.items.length < HELP_NOW_HOME_LIMITS.steps && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { icon: 'CheckCircle2', title: '', description: '' }] }))}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-2 text-xs font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Step
              </button>
            )}
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`bg-[#fffbf2] p-3 text-center ring-1 ring-gray-100 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {form.eyebrow && <p className="text-[7px] font-bold uppercase tracking-[0.18em] text-[#f5a623]">{form.eyebrow}</p>}
              <p className="mt-1 text-[13px] font-extrabold leading-snug text-[#1a1a1a]"><Highlighted heading={form.heading || 'Heading'} highlight={form.highlight} /></p>
              <ol className="mt-3 space-y-1.5 text-left">
                {form.items.map((item, i) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#f5a623] bg-white"><Icon className="h-2.5 w-2.5 text-[#f5a623]" /></span>
                      <span>
                        <span className="block text-[8px] font-bold text-slate-900">{String(i + 1).padStart(2, '0')} · {item.title || '—'}</span>
                        <span className="block text-[7px] text-slate-500">{item.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
          <SaveBar saving={save.isPending} label="Save Booking Steps" onUndo={() => setForm(initial)} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowBookingStepsPage() {
  return (
    <HelpNowSectionPage
      section="steps"
      title="Booking Steps"
      description={'The Help Now home page\'s "Simple Steps to Book" timeline — headings, and each step\'s icon, title and description.'}
    >
      {(saved) => <StepsForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
