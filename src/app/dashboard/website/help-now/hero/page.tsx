'use client';

import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Images, LayoutGrid, Plus, Sparkles } from 'lucide-react';

import { HELP_NOW_HOME_LIMITS, HelpNowHomeSaved, HeroSlide, useSaveHelpNowHomeSection } from '@/lib/hooks/useHelpNowHome';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { CARD, CARD_TITLE, FIELD_INPUT } from '@/components/registrations/shared/styles';
import {
  HelpNowSectionPage, ImageField, ItemControls, SaveBar, move, saveSection, usePickedImages, warn,
} from '@/components/help-now/HelpNowShared';

// Website Section → Help Now → Hero Slides: the big rotating banner at the
// top of helpnow.citycalls.in.

const blankSlide = (): HeroSlide => ({
  image: '',
  alt: '',
  badge: '',
  titleLine1: '',
  titleLine2: '',
  description: '',
  primaryButtonText: 'Book Service Now',
  primaryButtonLink: '#services',
  secondaryButtonText: 'Explore Process',
  secondaryButtonLink: '#how-it-works',
  active: true,
});

// Picked images are tracked per slide, so reordering moves them with it.
let nextSlideKey = 0;
const withKey = (slide: HeroSlide) => ({ ...slide, key: `slide-${nextSlideKey++}` });

function HeroForm({ saved }: { saved: HelpNowHomeSaved<'hero'> }) {
  // Keyed once, so typing never remounts a slide.
  const [initial] = useState(() => saved.slides.map(withKey));
  const [slides, setSlides] = useState(initial);
  const [previewIndex, setPreviewIndex] = useState(0);
  const images = usePickedImages(saved._id);
  const save = useSaveHelpNowHomeSection('hero');
  const saving = save.isPending || images.isUploading;

  const update = (index: number, patch: Partial<HeroSlide>) =>
    setSlides((prev) => prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)));
  const previewSlide = slides[Math.min(previewIndex, slides.length - 1)];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = slides.findIndex((s) => !s.titleLine1.trim());
    if (missing >= 0) return warn('Missing Title', `Slide ${missing + 1} needs a first title line.`);
    if (!slides.some((s) => s.active)) return warn('No Active Slide', 'Keep at least one slide active so the banner is never empty.');

    const ready = await Promise.all(
      slides.map(async ({ key, ...slide }) => ({ ...slide, image: await images.resolve(key, slide.image, 'WEBSITE_HERO_IMAGE') }))
    );
    if (await saveSection(save, { slides: ready }, 'Hero slides')) images.reset();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {slides.map((slide, index) => (
          <FormCard
            key={slide.key}
            icon={Images}
            title={`Slide ${index + 1}${slide.titleLine1 ? ` — ${slide.titleLine1}` : ''}`}
            hint={slide.active ? 'Shown in the banner rotation.' : 'Hidden — kept here but skipped on the website.'}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => update(index, { active: !slide.active })}
                  className={`flex h-7 items-center gap-1 border-2 px-2 text-[10px] font-bold ${slide.active ? 'border-[#3e8914]/40 bg-[#3e8914]/10 text-[#3e8914]' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                >
                  {slide.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {slide.active ? 'Active' : 'Hidden'}
                </button>
                <ItemControls
                  index={index}
                  count={slides.length}
                  label={`slide ${index + 1}`}
                  onMove={(by) => setSlides((prev) => move(prev, index, by))}
                  onRemove={slides.length > 1 ? () => { images.clear(slide.key); setSlides((prev) => prev.filter((_, i) => i !== index)); } : undefined}
                />
              </>
            }
          >
            <div className="space-y-4" onFocus={() => setPreviewIndex(index)}>
              <ImageField
                label={`slide ${index + 1} image`}
                preview={images.previewOf(slide.key, slide.image)}
                alt={slide.alt}
                onPick={(file) => images.pick(slide.key, file)}
                onClear={() => { images.clear(slide.key); update(index, { image: '' }); }}
                onAlt={(alt) => update(index, { alt })}
                altPlaceholder="e.g. Help Now maid washing dishes at the kitchen sink"
              />
              <Field label="Badge" hint='Small gold line above the title, e.g. "Premium Maid Services".'>
                <input value={slide.badge} maxLength={60} onChange={(e) => update(index, { badge: e.target.value })} placeholder="Premium Maid Services" className={FIELD_INPUT} />
              </Field>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Title Line 1" required hint="Shown in dark text.">
                  <input value={slide.titleLine1} maxLength={80} onChange={(e) => update(index, { titleLine1: e.target.value })} placeholder="Your Home," className={FIELD_INPUT} />
                </Field>
                <Field label="Title Line 2" hint="Shown in gold.">
                  <input value={slide.titleLine2} maxLength={80} onChange={(e) => update(index, { titleLine2: e.target.value })} placeholder="Our Priority." className={FIELD_INPUT} />
                </Field>
              </div>
              <Field label="Description">
                <textarea rows={2} value={slide.description} maxLength={300} onChange={(e) => update(index, { description: e.target.value })} className={`${FIELD_INPUT} resize-none`} />
              </Field>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2 border-2 border-gray-200 p-3">
                  <p className="text-xs font-bold text-gray-700">Gold Button</p>
                  <Field label="Text" hint="Leave empty to hide it.">
                    <input value={slide.primaryButtonText} maxLength={40} onChange={(e) => update(index, { primaryButtonText: e.target.value })} className={FIELD_INPUT} />
                  </Field>
                  <Field label="Link" hint="e.g. #services, /services/house-cleaning or https://…">
                    <input value={slide.primaryButtonLink} maxLength={500} onChange={(e) => update(index, { primaryButtonLink: e.target.value })} className={FIELD_INPUT} />
                  </Field>
                </div>
                <div className="space-y-2 border-2 border-gray-200 p-3">
                  <p className="text-xs font-bold text-gray-700">Outline Button</p>
                  <Field label="Text" hint="Leave empty to hide it.">
                    <input value={slide.secondaryButtonText} maxLength={40} onChange={(e) => update(index, { secondaryButtonText: e.target.value })} className={FIELD_INPUT} />
                  </Field>
                  <Field label="Link">
                    <input value={slide.secondaryButtonLink} maxLength={500} onChange={(e) => update(index, { secondaryButtonLink: e.target.value })} className={FIELD_INPUT} />
                  </Field>
                </div>
              </div>
            </div>
          </FormCard>
        ))}

        {slides.length < HELP_NOW_HOME_LIMITS.heroSlides && (
          <button
            type="button"
            onClick={() => { setSlides((prev) => [...prev, withKey(blankSlide())]); setPreviewIndex(slides.length); }}
            className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-2 text-xs font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Slide
          </button>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview — Slide {Math.min(previewIndex, slides.length - 1) + 1}</h2>
            {previewSlide && (
              <div className={`relative h-48 overflow-hidden bg-gray-100 ${previewSlide.active ? '' : 'opacity-50'}`}>
                {images.previewOf(previewSlide.key, previewSlide.image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images.previewOf(previewSlide.key, previewSlide.image)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent" />
                <div className="relative flex h-full flex-col justify-center p-4">
                  {previewSlide.badge && (
                    <p className="mb-1 flex items-center gap-1 text-[7px] font-bold uppercase tracking-[0.2em] text-[#d97706]">
                      <Sparkles className="h-2 w-2" /> {previewSlide.badge}
                    </p>
                  )}
                  <p className="text-[15px] font-extrabold leading-tight text-slate-900">{previewSlide.titleLine1 || 'Title line 1'}</p>
                  <p className="text-[15px] font-extrabold leading-tight text-[#d97706]">{previewSlide.titleLine2}</p>
                  {previewSlide.description && <p className="mt-1 line-clamp-2 max-w-[75%] text-[8px] text-slate-700">{previewSlide.description}</p>}
                  <div className="mt-2 flex gap-1.5">
                    {previewSlide.primaryButtonText && (
                      <span className="flex items-center gap-0.5 bg-[#f5a623] px-2 py-1 text-[7px] font-bold uppercase text-slate-900">
                        {previewSlide.primaryButtonText} <ArrowRight className="h-2 w-2" />
                      </span>
                    )}
                    {previewSlide.secondaryButtonText && (
                      <span className="border border-slate-900 bg-white px-2 py-1 text-[7px] font-bold uppercase text-slate-900">{previewSlide.secondaryButtonText}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <p className="mt-2 text-[10px] font-medium text-gray-400">Click into a slide&apos;s fields to preview it here.</p>
          </section>

          <SaveBar saving={saving} label="Save Hero Slides" onUndo={() => { images.reset(); setSlides(initial); }} />
        </div>
      </div>
    </form>
  );
}

export default function HelpNowHeroPage() {
  return (
    <HelpNowSectionPage
      section="hero"
      title="Hero Slides"
      description="The rotating banner at the top of the Help Now home page — image, alt text, badge, two-line title, description and two buttons per slide."
    >
      {(saved) => <HeroForm saved={saved} />}
    </HelpNowSectionPage>
  );
}
