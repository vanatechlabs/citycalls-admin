'use client';

import { useState } from 'react';
import { Eye, ImageIcon, Info, Save } from 'lucide-react';
import Swal from 'sweetalert2';

import {
  CARD, CARD_TITLE, ImageField, INPUT, LABEL, LastSaved, PageFrame, SAVE_BUTTON, errorMessage, previewUrl, showToast,
} from '@/components/about-page/AboutPageUi';
import { AboutParallax, AboutParallaxInput, AboutStatus, useAboutParallax, useSaveAboutParallax } from '@/lib/hooks/useAboutPage';
import { useUploadFile } from '@/lib/hooks/useFiles';

// Website Section → About Page → Parallax Image: the full-width photo that
// drifts as you scroll, between "What we stand for" and "Our Journey".

function ParallaxForm({ data }: { data: AboutParallax }) {
  const save = useSaveAboutParallax();
  const imageUpload = useUploadFile('CITYCALLS_ABOUT_PAGE', 'about-parallax', { skipGlobalToast: true });
  const [form, setForm] = useState<AboutParallaxInput>({ image: data.image ?? '', imageAlt: data.imageAlt ?? '', status: data.status ?? 'ACTIVE' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(data.image ? previewUrl(data.image) : null);
  const saving = save.isPending || imageUpload.isPending;

  async function submit() {
    if (!form.image && !imageFile) return showToast('warning', 'Choose an image');
    try {
      let image = form.image;
      if (imageFile) image = (await imageUpload.upload(imageFile, 'WEBSITE_ABOUT_PAGE_IMAGE')).url;
      await save.mutateAsync({ ...form, image });
      setImageFile(null);
      showToast('success', 'Parallax image saved');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save parallax image', text: errorMessage(error) });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-1">
        <div className={CARD}>
          <h2 className={CARD_TITLE}><ImageIcon className="h-5 w-5" /> Parallax Image</h2>
          <div className="space-y-4">
            <ImageField
              label="Image *"
              preview={imagePreview}
              wide
              hint="Uploads to Cloudinary — JPG, PNG, or WebP, up to 10 MB. Use a wide landscape photo (e.g. 1920×800)."
              onFile={(file) => {
                if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }}
            />
            <div>
              <label className={LABEL}>Image Alt Text</label>
              <input value={form.imageAlt} maxLength={200} onChange={(e) => setForm((p) => ({ ...p, imageAlt: e.target.value }))} placeholder="e.g. CityCalls expert at work in a living room" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AboutStatus }))} className={INPUT}>
                <option value="ACTIVE">Active — show the image</option>
                <option value="INACTIVE">Inactive — hide the image</option>
              </select>
            </div>
            <button type="button" onClick={() => void submit()} disabled={saving} className={SAVE_BUTTON}>
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Parallax Image'}
            </button>
          </div>
          <div className="mt-6 flex gap-3 border border-blue-100 bg-blue-50 p-4">
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
              The photo is shown as a 300px tall strip that moves slower than the page — keep the subject near the middle.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="border-2 border-gray-200 bg-gray-50 p-6 shadow-sm">
          <h2 className={CARD_TITLE}><Eye className="h-5 w-5" /> Live Preview</h2>
          <div className={`relative h-[260px] overflow-hidden bg-black ${form.status === 'INACTIVE' ? 'opacity-40' : ''}`}>
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt={form.imageAlt} className="h-full w-full object-cover object-center brightness-[0.85] contrast-[1.05]" />
            )}
            <div className="absolute inset-0 bg-black/10" />
            {form.status === 'INACTIVE' && (
              <span className="absolute left-3 top-3 bg-red-600 px-2 py-1 text-[10px] font-bold uppercase text-white">Hidden on website</span>
            )}
          </div>
          {form.imageAlt && <p className="mt-2 text-[11px] text-gray-500"><strong>Alt:</strong> {form.imageAlt}</p>}
          <LastSaved data={data} />
        </div>
      </div>
    </div>
  );
}

export default function AboutParallaxPage() {
  const { data, isLoading } = useAboutParallax();
  return (
    <PageFrame title="Parallax Image" description="The full-width photo below &quot;What we stand for&quot; on the About page — it drifts slowly as visitors scroll.">
      {isLoading || !data ? <p className="py-10 text-center text-sm text-[#6c7587]">Loading...</p> : <ParallaxForm key={data.updatedAt ?? 'default'} data={data} />}
    </PageFrame>
  );
}
