'use client';

import { useState } from 'react';
import {
  BadgeCheck, BookOpen, Clock, Heart, Home, LayoutGrid, ListOrdered, Plus, ShieldCheck, Sparkles, Star, Users, Zap,
  type LucideIcon,
} from 'lucide-react';

import {
  HELP_NOW_HOME_LIMITS, HelpNowHomeInputs, HelpNowHomeSaved, MARQUEE_ICONS, MarqueeIcon, useSaveHelpNowHomeSection,
} from '@/lib/hooks/useHelpNowHome';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT } from '@/components/registrations/shared/styles';
import { HelpNowSectionPage, ItemControls, SaveBar, StatusField, move, saveSection, warn } from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Marquee Strip: the gold scrolling strip under
// the hero ("Book trusted maids by the hour ✦ Flexible timings ✦ …").

const ICONS: Record<MarqueeIcon, LucideIcon> = { BookOpen, Clock, ShieldCheck, Star, Sparkles, BadgeCheck, Heart, Home, Zap, Users };

function MarqueeForm({ saved }: { saved: HelpNowHomeSaved<'marquee'> }) {
  const initial: HelpNowHomeInputs['marquee'] = { items: saved.items, status: saved.status };
  const [form, setForm] = useState(initial);
  const save = useSaveHelpNowHomeSection('marquee');

  const updateItem = (index: number, patch: Partial<HelpNowHomeInputs['marquee']['items'][number]>) =>
    setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items = form.items.filter((item) => item.label.trim());
    if (!items.length) return warn('No Items', 'Add at least one line of text to the strip.');
    await saveSection(save, { ...form, items }, 'Marquee strip');
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={ListOrdered} title="Strip Items" hint={`Up to ${HELP_NOW_HOME_LIMITS.marqueeItems} short lines, each with an icon. They scroll in this order and repeat.`}>
          <div className="space-y-2">
            {/* Icon · icon picker (fixed) · text (takes the rest) · controls. On
                phones the text drops to its own full-width line. */}
            <div className="hidden grid-cols-[32px_150px_minmax(0,1fr)_auto] gap-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:grid">
              <span />
              <span>Icon</span>
              <span>Text</span>
              <span className="w-[92px]" />
            </div>
            {form.items.map((item, index) => {
              const Icon = ICONS[item.icon];
              return (
                <div key={index} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[32px_150px_minmax(0,1fr)_auto]">
                  <span className="flex h-8 w-8 items-center justify-center border-2 border-[#f5a623]/40 bg-[#f5a623]/10 text-[#b5730f]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <select
                    value={item.icon}
                    onChange={(e) => updateItem(index, { icon: e.target.value as MarqueeIcon })}
                    className={`${FIELD_INPUT} cursor-pointer`}
                    aria-label={`Icon for item ${index + 1}`}
                  >
                    {MARQUEE_ICONS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <input
                    value={item.label}
                    maxLength={60}
                    onChange={(e) => updateItem(index, { label: e.target.value })}
                    placeholder="e.g. Same-day home cleaning in Delhi NCR"
                    className={`${FIELD_INPUT} col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto`}
                    aria-label={`Text for item ${index + 1}`}
                  />
                  <ItemControls
                    index={index}
                    count={form.items.length}
                    label={`item ${index + 1}`}
                    onMove={(by) => setForm((prev) => ({ ...prev, items: move(prev.items, index, by) }))}
                    onRemove={form.items.length > 1 ? () => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) })) : undefined}
                  />
                </div>
              );
            })}
            {form.items.length < HELP_NOW_HOME_LIMITS.marqueeItems && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { label: '', icon: 'Sparkles' }] }))}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-1.5 text-[11px] font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            )}
          </div>
          <div className="mt-5 md:w-1/3">
            <StatusField value={form.status} onChange={(status) => setForm((prev) => ({ ...prev, status }))} where="strip" />
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`overflow-hidden bg-[#f5a623] py-2 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2">
                {form.items.filter((item) => item.label).map((item, i) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <span key={i} className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-wider text-slate-900">
                      <Icon className="h-2.5 w-2.5" /> {item.label} <span className="ml-1">✦</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-gray-400">On the website the strip scrolls sideways under the hero.</p>
          </section>
          <SaveBar saving={save.isPending} label="Save Marquee Strip" onUndo={() => setForm(initial)} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowMarqueePage() {
  return (
    <HelpNowSectionPage section="marquee" title="Marquee Strip" description="The gold scrolling strip under the Help Now hero — its lines of text and their icons.">
      {(saved) => <MarqueeForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
