'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, LayoutTemplate, ListChecks, Plus, Save, X } from 'lucide-react';
import Swal from 'sweetalert2';

import {
  CARD, CARD_TITLE, Highlighted, ImageField, INPUT, LABEL, LastSaved, PageFrame, SAVE_BUTTON, errorMessage, previewUrl, showToast,
} from '@/components/about-page/AboutPageUi';
import { AboutHero, AboutHeroInput, MAX_HERO_POINTS, useAboutHero, useSaveAboutHero } from '@/lib/hooks/useAboutPage';
import { useUploadFile } from '@/lib/hooks/useFiles';

// Website Section → About Page → About Hero: the top block of /about
// ("Building Trust, One Service at a Time"), its points, buttons and photo.

function formFrom(data: AboutHero): AboutHeroInput {
  return {
    headingLine1: data.headingLine1 ?? '',
    headingLine2: data.headingLine2 ?? '',
    highlight: data.highlight ?? '',
    description: data.description ?? '',
    points: [...(data.points ?? [])],
    primaryButtonText: data.primaryButtonText ?? '',
    primaryButtonLink: data.primaryButtonLink ?? '',
    secondaryButtonText: data.secondaryButtonText ?? '',
    secondaryButtonLink: data.secondaryButtonLink ?? '',
    image: data.image ?? '',
    imageAlt: data.imageAlt ?? '',
  };
}

function HeroForm({ data }: { data: AboutHero }) {
  const save = useSaveAboutHero();
  const imageUpload = useUploadFile('CITYCALLS_ABOUT_PAGE', 'about-hero', { skipGlobalToast: true });
  const [form, setForm] = useState<AboutHeroInput>(formFrom(data));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(data.image ? previewUrl(data.image) : null);
  const update = <K extends keyof AboutHeroInput>(key: K, value: AboutHeroInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const highlightMissing = !!form.highlight && !form.headingLine1.includes(form.highlight) && !form.headingLine2.includes(form.highlight);
  const saving = save.isPending || imageUpload.isPending;

  function setPoint(index: number, value: string) {
    setForm((prev) => ({ ...prev, points: prev.points.map((p, i) => (i === index ? value : p)) }));
  }

  async function submit() {
    if (!form.headingLine1.trim()) return showToast('warning', 'Heading line 1 is required');
    if (highlightMissing) return showToast('warning', 'Highlight text must be part of the heading');
    try {
      let image = form.image;
      if (imageFile) image = (await imageUpload.upload(imageFile, 'WEBSITE_ABOUT_PAGE_IMAGE')).url;
      await save.mutateAsync({ ...form, image, points: form.points.map((p) => p.trim()).filter(Boolean) });
      setImageFile(null);
      showToast('success', 'About hero saved');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save about hero', text: errorMessage(error) });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className={CARD}>
          <h2 className={CARD_TITLE}><LayoutTemplate className="h-5 w-5" /> Heading &amp; Text</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={LABEL}>Heading Line 1 *</label>
              <input value={form.headingLine1} maxLength={80} onChange={(e) => update('headingLine1', e.target.value)} placeholder="Building Trust," className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Heading Line 2</label>
              <input value={form.headingLine2} maxLength={80} onChange={(e) => update('headingLine2', e.target.value)} placeholder="One Service at a Time" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Highlight Text <span className="normal-case text-gray-400">(green)</span></label>
              <input
                value={form.highlight}
                maxLength={40}
                onChange={(e) => update('highlight', e.target.value)}
                placeholder="Service"
                className={`${INPUT} ${highlightMissing ? 'border-red-400' : ''}`}
              />
              {highlightMissing && <p className="mt-1 text-[10px] font-bold text-red-500">Must be part of line 1 or line 2</p>}
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Description</label>
              <textarea rows={3} value={form.description} maxLength={600} onChange={(e) => update('description', e.target.value)} className={`${INPUT} resize-none`} />
              <p className="mt-1 text-right text-[10px] text-gray-400">{form.description.length}/600</p>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <h2 className={CARD_TITLE}><ListChecks className="h-5 w-5" /> Key Points <span className="text-xs font-semibold text-gray-400">({form.points.length}/{MAX_HERO_POINTS})</span></h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {form.points.map((point, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#3e8914]/10 text-[11px] font-black text-[#3e8914]">{index + 1}</span>
                <input value={point} maxLength={80} onChange={(e) => setPoint(index, e.target.value)} placeholder="e.g. Transparent Pricing" className={INPUT} />
                <button
                  type="button"
                  title="Remove"
                  onClick={() => setForm((prev) => ({ ...prev, points: prev.points.filter((_, i) => i !== index) }))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-red-200 text-red-500 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {form.points.length < MAX_HERO_POINTS && (
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, points: [...prev.points, ''] }))}
              className="mt-3 flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-4 py-2 text-xs font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
            >
              <Plus className="h-4 w-4" /> Add Point
            </button>
          )}
        </div>

        <div className={CARD}>
          <h2 className={CARD_TITLE}><ArrowRight className="h-5 w-5" /> Buttons &amp; Image</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={LABEL}>Green Button Text</label>
              <input value={form.primaryButtonText} maxLength={40} onChange={(e) => update('primaryButtonText', e.target.value)} placeholder="Explore Services" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Green Button Link</label>
              <input value={form.primaryButtonLink} maxLength={300} onChange={(e) => update('primaryButtonLink', e.target.value)} placeholder="/" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>White Button Text</label>
              <input value={form.secondaryButtonText} maxLength={40} onChange={(e) => update('secondaryButtonText', e.target.value)} placeholder="Contact Us" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>White Button Link</label>
              <input value={form.secondaryButtonLink} maxLength={300} onChange={(e) => update('secondaryButtonLink', e.target.value)} placeholder="/contact" className={INPUT} />
            </div>
            <ImageField
              label="Hero Image"
              preview={imagePreview}
              wide
              hint="Uploads to Cloudinary — JPG, PNG, or WebP, up to 10 MB. A cut-out (transparent PNG) or square photo works best."
              onFile={(file) => {
                if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }}
            />
            <div>
              <label className={LABEL}>Image Alt Text</label>
              <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="e.g. Smiling CityCalls technician in uniform" className={INPUT} />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-gray-400">Leave a button&apos;s text empty to hide that button.</p>
        </div>

        <button type="button" onClick={() => void submit()} disabled={saving} className={SAVE_BUTTON}>
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save About Hero'}
        </button>
      </div>

      {/* Live preview */}
      <div>
        <div className="sticky top-4 border-2 border-gray-200 bg-[#f8fbfa] p-6 shadow-sm">
          <h2 className={CARD_TITLE}><Eye className="h-5 w-5" /> Live Preview</h2>
          <p className="font-serif text-2xl font-bold leading-tight text-slate-900">
            <Highlighted text={form.headingLine1 || 'Heading'} highlight={form.highlight} />
            {form.headingLine2 && <><br /><Highlighted text={form.headingLine2} highlight={form.highlight} /></>}
          </p>
          <div className="my-3 h-1 w-12 rounded-full bg-[#3e8914]" />
          {form.description && <p className="text-[11px] leading-relaxed text-gray-600">{form.description}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {form.points.filter((p) => p.trim()).map((point, i) => (
              <span key={i} className="flex items-start gap-1.5 text-[10px] font-bold text-slate-800">
                <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-[#3e8914]" /> {point}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {form.primaryButtonText && <span className="rounded-full bg-[#3e8914] px-4 py-1.5 text-[10px] font-bold text-white">{form.primaryButtonText}</span>}
            {form.secondaryButtonText && <span className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-bold text-slate-800">{form.secondaryButtonText}</span>}
          </div>
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt={form.imageAlt} className="mx-auto mt-4 max-h-56 object-contain" />
          )}
          <LastSaved data={data} />
        </div>
      </div>
    </div>
  );
}

export default function AboutHeroPage() {
  const { data, isLoading } = useAboutHero();
  return (
    <PageFrame title="About Hero" description="The top of the About page — two-line heading, description, key points, buttons and the photo on the right.">
      {isLoading || !data ? <p className="py-10 text-center text-sm text-[#6c7587]">Loading...</p> : <HeroForm key={data.updatedAt ?? 'default'} data={data} />}
    </PageFrame>
  );
}
