'use client';

import { useState } from 'react';
import { BookOpen, Eye, Images, Save, Target, Users } from 'lucide-react';
import Swal from 'sweetalert2';

import {
  CARD, CARD_TITLE, Highlighted, ImageField, INPUT, LABEL, LastSaved, PageFrame, SAVE_BUTTON, errorMessage, previewUrl, showToast,
} from '@/components/about-page/AboutPageUi';
import { AboutImage, AboutStory, AboutStoryInput, MAX_STORY_IMAGES, useAboutStory, useSaveAboutStory } from '@/lib/hooks/useAboutPage';
import { useUploadFile } from '@/lib/hooks/useFiles';

// Website Section → About Page → Our Story: "Rebuilding trust in home
// services" — the four photos, two paragraphs and the Mission / Team boxes.

function formFrom(data: AboutStory): AboutStoryInput {
  // Always four photo slots in the form.
  const images: AboutImage[] = Array.from({ length: MAX_STORY_IMAGES }, (_, i) => ({
    image: data.images?.[i]?.image ?? '',
    imageAlt: data.images?.[i]?.imageAlt ?? '',
  }));
  return {
    eyebrow: data.eyebrow ?? '',
    heading: data.heading ?? '',
    highlight: data.highlight ?? '',
    paragraphOne: data.paragraphOne ?? '',
    paragraphTwo: data.paragraphTwo ?? '',
    missionTitle: data.missionTitle ?? '',
    missionText: data.missionText ?? '',
    teamTitle: data.teamTitle ?? '',
    teamText: data.teamText ?? '',
    images,
  };
}

function StoryForm({ data }: { data: AboutStory }) {
  const save = useSaveAboutStory();
  const imageUpload = useUploadFile('CITYCALLS_ABOUT_PAGE', 'about-story', { skipGlobalToast: true });
  const [form, setForm] = useState<AboutStoryInput>(formFrom(data));
  const [files, setFiles] = useState<(File | null)[]>(Array(MAX_STORY_IMAGES).fill(null));
  const [previews, setPreviews] = useState<(string | null)[]>(formFrom(data).images.map((img) => (img.image ? previewUrl(img.image) : null)));
  const update = <K extends keyof AboutStoryInput>(key: K, value: AboutStoryInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);
  const saving = save.isPending || imageUpload.isPending;

  function setAlt(index: number, imageAlt: string) {
    setForm((prev) => ({ ...prev, images: prev.images.map((img, i) => (i === index ? { ...img, imageAlt } : img)) }));
  }

  function setFile(index: number, file: File) {
    const old = previews[index];
    if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
    setFiles((prev) => prev.map((f, i) => (i === index ? file : f)));
    setPreviews((prev) => prev.map((p, i) => (i === index ? URL.createObjectURL(file) : p)));
  }

  async function submit() {
    if (!form.heading.trim()) return showToast('warning', 'Heading is required');
    if (highlightMissing) return showToast('warning', 'Highlight text must be part of the heading');
    if (!form.paragraphOne.trim()) return showToast('warning', 'First paragraph is required');
    try {
      const images = await Promise.all(
        form.images.map(async (img, i) => {
          const file = files[i];
          return file ? { ...img, image: (await imageUpload.upload(file, 'WEBSITE_ABOUT_PAGE_IMAGE')).url } : img;
        })
      );
      await save.mutateAsync({ ...form, images: images.filter((img) => img.image) });
      setFiles(Array(MAX_STORY_IMAGES).fill(null));
      showToast('success', 'Our story saved');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save our story', text: errorMessage(error) });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className={CARD}>
          <h2 className={CARD_TITLE}><BookOpen className="h-5 w-5" /> Heading &amp; Story</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={LABEL}>Eyebrow</label>
              <input value={form.eyebrow} maxLength={60} onChange={(e) => update('eyebrow', e.target.value)} placeholder="Our Story" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Heading *</label>
              <input value={form.heading} maxLength={140} onChange={(e) => update('heading', e.target.value)} placeholder="Rebuilding trust in home services" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Highlight Text <span className="normal-case text-gray-400">(green)</span></label>
              <input
                value={form.highlight}
                maxLength={80}
                onChange={(e) => update('highlight', e.target.value)}
                placeholder="home services"
                className={`${INPUT} ${highlightMissing ? 'border-red-400' : ''}`}
              />
              {highlightMissing && <p className="mt-1 text-[10px] font-bold text-red-500">Must be part of the heading</p>}
            </div>
            <div className="md:col-span-3">
              <label className={LABEL}>Paragraph 1 *</label>
              <textarea rows={3} value={form.paragraphOne} maxLength={1000} onChange={(e) => update('paragraphOne', e.target.value)} className={`${INPUT} resize-none`} />
            </div>
            <div className="md:col-span-3">
              <label className={LABEL}>Paragraph 2</label>
              <textarea rows={3} value={form.paragraphTwo} maxLength={1000} onChange={(e) => update('paragraphTwo', e.target.value)} className={`${INPUT} resize-none`} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className={CARD}>
            <h2 className={CARD_TITLE}><Target className="h-5 w-5" /> Mission Box</h2>
            <label className={LABEL}>Title</label>
            <input value={form.missionTitle} maxLength={40} onChange={(e) => update('missionTitle', e.target.value)} placeholder="Our Mission" className={INPUT} />
            <label className={`${LABEL} mt-3`}>Text</label>
            <textarea rows={3} value={form.missionText} maxLength={300} onChange={(e) => update('missionText', e.target.value)} className={`${INPUT} resize-none`} />
          </div>
          <div className={CARD}>
            <h2 className={CARD_TITLE}><Users className="h-5 w-5" /> Team Box</h2>
            <label className={LABEL}>Title</label>
            <input value={form.teamTitle} maxLength={40} onChange={(e) => update('teamTitle', e.target.value)} placeholder="Our Team" className={INPUT} />
            <label className={`${LABEL} mt-3`}>Text</label>
            <textarea rows={3} value={form.teamText} maxLength={300} onChange={(e) => update('teamText', e.target.value)} className={`${INPUT} resize-none`} />
          </div>
        </div>

        <div className={CARD}>
          <h2 className={CARD_TITLE}><Images className="h-5 w-5" /> Story Photos <span className="text-xs font-semibold text-gray-400">(2 × 2 grid, square)</span></h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {form.images.map((img, i) => (
              <div key={i} className="space-y-2 border border-gray-200 bg-gray-50/60 p-3">
                <ImageField label={`Photo ${i + 1}`} preview={previews[i]} onFile={(file) => setFile(i, file)} hint="JPG, PNG or WebP up to 10 MB — square works best." />
                <div>
                  <label className={LABEL}>Alt Text</label>
                  <input value={img.imageAlt} maxLength={200} onChange={(e) => setAlt(i, e.target.value)} placeholder="e.g. Technician repairing a refrigerator" className={INPUT} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => void submit()} disabled={saving} className={SAVE_BUTTON}>
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Our Story'}
        </button>
      </div>

      {/* Live preview */}
      <div>
        <div className="sticky top-4 border-2 border-gray-200 bg-gray-50 p-6 shadow-sm">
          <h2 className={CARD_TITLE}><Eye className="h-5 w-5" /> Live Preview</h2>
          <div className="grid grid-cols-2 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src && <img src={src} alt={form.images[i]?.imageAlt} className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>
          {form.eyebrow && (
            <p className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2f6b0f]">
              <span className="h-px w-6 bg-[#3e8914]" /> {form.eyebrow}
            </p>
          )}
          <p className="mt-1 font-serif text-xl font-bold leading-tight text-slate-900">
            <Highlighted text={form.heading || 'Heading'} highlight={form.highlight} />
          </p>
          <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-gray-500">{form.paragraphOne}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[{ t: form.missionTitle, d: form.missionText, I: Target }, { t: form.teamTitle, d: form.teamText, I: Users }].map(({ t, d, I }, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-2.5">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-800"><I className="h-3.5 w-3.5 text-[#3e8914]" /> {t}</p>
                <p className="mt-1 line-clamp-3 text-[9px] text-gray-500">{d}</p>
              </div>
            ))}
          </div>
          <LastSaved data={data} />
        </div>
      </div>
    </div>
  );
}

export default function AboutStoryPage() {
  const { data, isLoading } = useAboutStory();
  return (
    <PageFrame title="Our Story" description="The About page's story block — four photos, the heading, two paragraphs and the Mission / Team boxes. The &quot;Why choose us&quot; cards below it come from Home Page → Why Choose Us.">
      {isLoading || !data ? <p className="py-10 text-center text-sm text-[#6c7587]">Loading...</p> : <StoryForm key={data.updatedAt ?? 'default'} data={data} />}
    </PageFrame>
  );
}
