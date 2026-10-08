'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';
import { Check, Code, ExternalLink, FileText, Globe, Image as ImageIcon, Save, Share2, Trash2, Upload } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { Blog, BlogInput, BlogStatus, slugify, useBlogList, useSaveBlog } from '@/lib/hooks/useBlogs';
import { useUploadFile } from '@/lib/hooks/useFiles';
import { WEBSITE_ORIGIN } from '@/lib/hooks/useSeoMeta';
import { resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { FIELD_INPUT, FIELD_LABEL } from '@/components/registrations/shared/styles';
import { RichTextEditor } from './RichTextEditor';

// Add / edit a blog. Same fields and layout as the Design House admin's blog
// form (settings & SEO on the left, the article on the right), in CityCalls
// admin styling.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const EMPTY: BlogInput = {
  title: '', h1Title: '', slug: '', excerpt: '', content: '', author: 'CityCalls Team', category: '', metaKeywords: '',
  image: '', imageAlt: '', status: 'DRAFT', featured: false, metaTitle: '', metaDescription: '', canonicalTag: '',
  ogTitle: '', ogImage: '', openGraphTags: '', schemaMarkup: '',
};

const STATUS_STYLE: Record<BlogStatus, string> = {
  PUBLISHED: 'border-green-300 bg-green-50 text-green-700',
  DRAFT: 'border-amber-300 bg-amber-50 text-amber-700',
  ARCHIVED: 'border-red-300 bg-red-50 text-red-700',
};

function fromBlog(blog: Blog): BlogInput {
  const { title, h1Title, slug, excerpt, content, author, category, metaKeywords, image, imageAlt, status, featured,
    metaTitle, metaDescription, canonicalTag, ogTitle, ogImage, openGraphTags, schemaMarkup } = blog;
  return { title, h1Title, slug, excerpt, content, author, category, metaKeywords, image, imageAlt, status, featured,
    metaTitle, metaDescription, canonicalTag, ogTitle, ogImage, openGraphTags, schemaMarkup };
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || 'Please check the form and try again.';
}

const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();

type Picked = { file: File; preview: string } | null;

export function BlogForm({ existing }: { existing?: Blog }) {
  const router = useRouter();
  const isEdit = !!existing;
  const [form, setForm] = useState<BlogInput>(existing ? fromBlog(existing) : EMPTY);
  // The slug follows the title until someone edits it by hand.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [image, setImage] = useState<Picked>(null);
  const [ogImage, setOgImage] = useState<Picked>(null);

  const saveBlog = useSaveBlog();
  const uploader = useUploadFile('CITYCALLS_BLOG', existing?._id ?? 'new', { skipGlobalToast: true });
  const saving = saveBlog.isPending || uploader.isPending;
  const { data: allBlogs = [] } = useBlogList();
  const categories = useMemo(() => [...new Set(allBlogs.map((b) => b.category))].sort(), [allBlogs]);

  const set = (patch: Partial<BlogInput>) => setForm((f) => ({ ...f, ...patch }));
  const imagePreview = image?.preview ?? (form.image ? resolveMediaUrl(form.image) : null);
  const ogPreview = ogImage?.preview ?? (form.ogImage ? resolveMediaUrl(form.ogImage) : null);

  function pick(e: React.ChangeEvent<HTMLInputElement>, setter: (p: Picked) => void, current: Picked) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 10 MB.', confirmButtonColor: '#3e8914' });
      return;
    }
    if (current) URL.revokeObjectURL(current.preview);
    setter({ file, preview: URL.createObjectURL(file) });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const warn = (text: string) => void Swal.fire({ icon: 'warning', title: 'Check the form', text, confirmButtonColor: '#3e8914' });
    if (form.title.trim().length < 3) return warn('Please enter the blog title.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return warn('URL slug can only use lowercase letters, numbers and dashes.');
    if (form.excerpt.trim().length < 10) return warn('Please write a short summary (at least 10 characters).');
    if (form.category.trim().length < 2) return warn('Please enter the blog category.');
    if (!imagePreview) return warn('Please upload the feature image.');
    if (!textOf(form.content)) return warn('Please write the blog content.');

    try {
      // Images need the blog's id, so they're uploaded after saving.
      // form.image / form.ogImage hold the already-saved URLs ('' when removed).
      let saved = await saveBlog.mutateAsync(existing ? { id: existing._id, ...form } : form);
      const media: Partial<BlogInput> = {};
      if (image) media.image = (await uploader.upload(image.file, 'WEBSITE_BLOG_IMAGE', saved._id)).url;
      if (ogImage) media.ogImage = (await uploader.upload(ogImage.file, 'WEBSITE_BLOG_OG_IMAGE', saved._id)).url;
      if (Object.keys(media).length) saved = await saveBlog.mutateAsync({ id: saved._id, ...media });

      await Swal.fire({
        icon: 'success',
        title: isEdit ? 'Blog updated!' : 'Blog created!',
        text: saved.status === 'PUBLISHED' ? 'It is live on the website.' : 'Saved — publish it when ready.',
        timer: 1600,
        showConfirmButton: false,
      });
      router.push('/dashboard/blogs/list');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save the blog', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  const counter = (len: number, max: number) => (
    <span className={`text-[10px] font-bold ${len > max ? 'text-red-500' : 'text-gray-400'}`}>{len}/{max}</span>
  );

  // Clicking the box opens its hidden file input (linked by id).
  const imageBox = (preview: string | null, inputId: string, onClear: () => void, label: string, tall = false) => (
    <label
      htmlFor={inputId}
      className={`group relative flex w-full cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed border-[#3e8914]/40 bg-[#3e8914]/[0.03] transition-colors hover:bg-[#3e8914]/[0.07] ${tall ? 'aspect-video' : 'h-28'}`}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            aria-label="Remove image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <span className="flex flex-col items-center gap-1.5 text-[#3e8914]">
          <Upload className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
          <span className="text-[9px] font-medium text-gray-400">JPG, PNG or WebP · up to 10 MB</span>
        </span>
      )}
    </label>
  );

  return (
    <form onSubmit={(e) => void submit(e)} className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <input id="blog-image" type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => pick(e, setImage, image)} />
      <input id="blog-og-image" type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => pick(e, setOgImage, ogImage)} />

      {/* ── Left: settings & SEO ── */}
      <div className="space-y-6 lg:col-span-1">
        <FormCard icon={Save} title="Configuration">
          <div className="space-y-3">
            <Field label="Publication Status">
              <select
                value={form.status}
                onChange={(e) => set({ status: e.target.value as BlogStatus })}
                className={`w-full border-2 px-2.5 py-2 text-[11px] font-bold uppercase tracking-widest outline-none ${STATUS_STYLE[form.status]}`}
              >
                <option value="PUBLISHED">● Published (Live)</option>
                <option value="DRAFT">○ Draft (Hidden)</option>
                <option value="ARCHIVED">○ Archived</option>
              </select>
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 border-2 border-gray-200 bg-gray-50 p-2.5">
              <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 accent-[#3e8914]" />
              <span className="text-[11px] font-bold uppercase tracking-tight text-gray-700">Mark as Featured</span>
            </label>
            {isEdit && form.status === 'PUBLISHED' && (
              <a href={`${WEBSITE_ORIGIN}/blogs/${existing.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                View on website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </FormCard>

        <FormCard icon={Globe} title="SEO Metadata">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between"><label className={FIELD_LABEL}>Meta Title</label>{counter(form.metaTitle.length, 65)}</div>
              <input value={form.metaTitle} maxLength={70} onChange={(e) => set({ metaTitle: e.target.value })} placeholder="Enter meta title" className={FIELD_INPUT} />
            </div>
            <div>
              <div className="flex items-center justify-between"><label className={FIELD_LABEL}>Meta Description (SEO)</label>{counter(form.metaDescription.length, 155)}</div>
              <textarea rows={3} value={form.metaDescription} maxLength={170} onChange={(e) => set({ metaDescription: e.target.value })} placeholder="Brief summary for search results..." className={`${FIELD_INPUT} resize-none`} />
            </div>
            <Field label="Canonical Tag">
              <input value={form.canonicalTag} onChange={(e) => set({ canonicalTag: e.target.value })} placeholder={`https://citycalls.in/blogs/${form.slug || 'blog-post'}`} className={FIELD_INPUT} />
            </Field>
          </div>
        </FormCard>

        <FormCard icon={Share2} title="Social Sharing">
          <div className="space-y-3">
            <Field label="OG Title">
              <input value={form.ogTitle} maxLength={200} onChange={(e) => set({ ogTitle: e.target.value })} placeholder="Enter OG title" className={FIELD_INPUT} />
            </Field>
            <div>
              <label className={FIELD_LABEL}>OG Image</label>
              {imageBox(ogPreview, 'blog-og-image', () => { if (ogImage) URL.revokeObjectURL(ogImage.preview); setOgImage(null); set({ ogImage: '' }); }, 'Drop Image Here')}
              <p className="mt-1 text-[10px] font-medium text-gray-400">Shown when the link is shared. Leave empty to use the feature image.</p>
            </div>
            <Field label="Additional OG Tags" hint='e.g. <meta property="og:type" content="article">'>
              <RichTextEditor code value={form.openGraphTags} onChange={(v) => set({ openGraphTags: v })} placeholder="Paste OG meta tags here..." minHeight="90px" />
            </Field>
          </div>
        </FormCard>

        <FormCard icon={Code} title="Schema Markup" hint="JSON-LD for Google rich results. The <script> tag is optional.">
          <RichTextEditor code value={form.schemaMarkup} onChange={(v) => set({ schemaMarkup: v })} placeholder='{"@context": "https://schema.org", ...}' minHeight="120px" />
        </FormCard>
      </div>

      {/* ── Right: the article ── */}
      <div className="lg:col-span-3">
        <FormCard icon={FileText} title="Blog Primary Content" hint="What readers see on citycalls.in/blogs.">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Blog Main Title" required>
                <input
                  value={form.title}
                  maxLength={200}
                  onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
                  placeholder="Enter blog title..."
                  className={FIELD_INPUT}
                />
              </Field>
              <Field label="Hero Title (H1 for SEO)" hint="Shown big at the top of the article. Leave empty to use the main title.">
                <input value={form.h1Title} maxLength={200} onChange={(e) => set({ h1Title: e.target.value })} placeholder="Enter hero title (H1 for SEO)..." className={FIELD_INPUT} />
              </Field>
              <Field label="Permalink / URL Slug" required hint={<>citycalls.in/blogs/<span className="font-bold text-[#3e8914]">{form.slug || '…'}</span></>}>
                <input
                  value={form.slug}
                  maxLength={160}
                  onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }}
                  placeholder="auto-generated-slug"
                  className={`${FIELD_INPUT} bg-gray-50 font-mono text-blue-600`}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between"><label className={FIELD_LABEL}>Short Summary <span className="text-red-500">*</span></label>{counter(form.excerpt.length, 500)}</div>
              <textarea rows={2} maxLength={500} value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} placeholder="Provide a brief summary for list views..." className={`${FIELD_INPUT} resize-none`} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Author Name">
                <input value={form.author} maxLength={80} onChange={(e) => set({ author: e.target.value })} placeholder="CityCalls Team" className={FIELD_INPUT} />
              </Field>
              <Field label="Blog Category" required hint="Pick an existing one or type a new category.">
                <input list="blog-categories" value={form.category} maxLength={80} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Home Appliance" className={FIELD_INPUT} />
                <datalist id="blog-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
            </div>

            <Field label="Meta Keywords (SEO)">
              <textarea rows={2} maxLength={500} value={form.metaKeywords} onChange={(e) => set({ metaKeywords: e.target.value })} placeholder="Enter keywords separated by commas..." className={`${FIELD_INPUT} resize-none`} />
            </Field>

            <div className="flex flex-col gap-5 border-2 border-gray-100 bg-gray-50/60 p-4 md:flex-row">
              <div className="w-full md:w-1/3">
                <label className={FIELD_LABEL}>Feature Image <span className="text-red-500">*</span></label>
                {imageBox(imagePreview, 'blog-image', () => { if (image) URL.revokeObjectURL(image.preview); setImage(null); set({ image: '' }); }, 'Upload Main Image', true)}
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <Field label="Image Alt Text (SEO)">
                  <input value={form.imageAlt} maxLength={200} onChange={(e) => set({ imageAlt: e.target.value })} placeholder="Describe the image..." className={FIELD_INPUT} />
                </Field>
                <p className="mt-2 text-[10px] font-medium italic text-gray-400">● Helps visually impaired users and improves search ranking.</p>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={FIELD_LABEL}>Detailed Blog Description <span className="text-red-500">*</span></label>
                <span className="border border-green-100 bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase text-green-600">Rich Text Active</span>
              </div>
              <RichTextEditor value={form.content} onChange={(v) => set({ content: v })} placeholder="Start writing your blog content here..." minHeight="420px" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => router.push('/dashboard/blogs/list')} className="rounded-[6px] bg-gray-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-[6px] bg-[#3e8914] px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_5px_12px_rgba(62,137,20,0.3)] transition-all hover:bg-[#347311] active:scale-95 disabled:opacity-60"
              >
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : isEdit ? <Check className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                {saving ? 'Saving…' : isEdit ? 'Update Blog Post' : 'Publish Blog Story'}
              </button>
            </div>
          </div>
        </FormCard>
      </div>
    </form>
  );
}
