'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import { CheckCircle2, Globe, Image as ImageIcon, Link2, Pencil, Save, Upload, X, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  useSaveSeoMeta, useSeoMeta, useSeoPageOptions, SeoMeta, SeoStatus, WEBSITE_ORIGIN,
} from '@/lib/hooks/useSeoMeta';
import { resolveMediaUrl } from '@/lib/registrations/format';

// Field sizes match Hero Carousel's (dashboard/website/hero-slides) FIELD_SM
// / FIELD_LG / LABEL_SM / LABEL_LG convention exactly, so the two forms feel
// like the same admin panel at the same zoom level.
const FIELD_SM = 'w-full px-3 py-2 border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-xs shadow-sm';
const FIELD_LG = 'w-full px-4 py-3 border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-sm shadow-lg';
const LABEL_SM = 'block text-xs font-medium text-gray-700 mb-1';
const LABEL_LG = 'block text-sm font-medium text-gray-700 mb-2';
const CODE_AREA = 'w-full overflow-auto rounded border-2 border-gray-200 bg-[#1e1e1e] p-4 font-mono text-[11px] text-[#d4d4d4] shadow-inner outline-none focus:ring-2 focus:ring-[#3e8914]';

interface FormState {
  pagePath: string;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  openGraphTags: string;
  schemaMarkup: string;
  canonicalUrl: string;
  ogImage: string;
  status: SeoStatus;
}

const emptyForm: FormState = {
  pagePath: '', metaTitle: '', metaKeywords: '', metaDescription: '',
  openGraphTags: '', schemaMarkup: '', canonicalUrl: '', ogImage: '', status: 'ACTIVE',
};

function formFromMeta(meta: SeoMeta): FormState {
  return {
    pagePath: meta.pagePath,
    metaTitle: meta.metaTitle ?? '',
    metaKeywords: meta.metaKeywords ?? '',
    metaDescription: meta.metaDescription ?? '',
    openGraphTags: meta.openGraphTags ?? '',
    schemaMarkup: meta.schemaMarkup ?? '',
    canonicalUrl: meta.canonicalUrl ?? '',
    ogImage: meta.ogImage ?? '',
    status: meta.status,
  };
}

// null = empty (fine), true = valid JSON object/array, false = invalid.
function jsonLdState(value: string): boolean | null {
  if (!value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

// Keyed by the loaded entry's id (see below) so switching between "add" and
// "edit ⟨id⟩" remounts this form with fresh state instead of syncing it.
function SeoMetaForm({ existing }: { existing?: SeoMeta }) {
  const router = useRouter();
  const isEditMode = !!existing;

  const [form, setForm] = useState<FormState>(() => (existing ? formFromMeta(existing) : emptyForm));
  const [ogFile, setOgFile] = useState<{ file: File; preview: string } | null>(null);
  const { data: pageGroups = [], isLoading: pagesLoading } = useSeoPageOptions();
  const saveMeta = useSaveSeoMeta();
  const ogUpload = useUploadFile('SEO_META', existing?._id ?? 'new', { skipGlobalToast: true });
  const isSaving = saveMeta.isPending || ogUpload.isPending;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const jsonValid = jsonLdState(form.schemaMarkup);
  const selectedPage = pageGroups.flatMap((g) => g.pages).find((p) => p.path === form.pagePath);
  const ogPreview = ogFile?.preview ?? (form.ogImage ? resolveMediaUrl(form.ogImage) : null);

  async function handlePageChange(path: string) {
    const page = pageGroups.flatMap((g) => g.pages).find((p) => p.path === path);
    // One SEO entry per page — offer to edit the existing one instead.
    if (!isEditMode && page?.seoMetaId) {
      const result = await Swal.fire({
        icon: 'info',
        title: 'SEO already added',
        text: `"${page.name}" already has SEO. Do you want to edit it?`,
        showCancelButton: true,
        confirmButtonText: 'Edit SEO',
        confirmButtonColor: '#3e8914',
      });
      if (result.isConfirmed) router.push(`/dashboard/seo/add-meta?editId=${page.seoMetaId}`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      pagePath: path,
      // Pre-fill the canonical for the chosen page if it's still empty.
      canonicalUrl: prev.canonicalUrl || (path ? `${WEBSITE_ORIGIN}${path === '/' ? '' : path}` : ''),
    }));
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 5 MB (1200×630 recommended).' });
      return;
    }
    if (ogFile) URL.revokeObjectURL(ogFile.preview);
    setOgFile({ file, preview: URL.createObjectURL(file) });
  }

  function clearImage() {
    if (ogFile) URL.revokeObjectURL(ogFile.preview);
    setOgFile(null);
    update('ogImage', '');
  }

  async function handleSave() {
    if (!form.pagePath) {
      void Swal.fire({ icon: 'warning', title: 'Missing Page', text: 'Please select a page', confirmButtonColor: '#3e8914' });
      return;
    }
    if (jsonValid === false) {
      void Swal.fire({ icon: 'warning', title: 'Invalid Schema Markup', text: 'Schema markup must be valid JSON-LD.', confirmButtonColor: '#3e8914' });
      return;
    }

    try {
      const { pagePath, ...fields } = form;
      let saved = await saveMeta.mutateAsync(existing ? { id: existing._id, ...fields } : { pagePath, ...fields });

      // The image needs the entry's id, so it's uploaded after saving.
      if (ogFile) {
        const uploaded = await ogUpload.upload(ogFile.file, 'WEBSITE_SEO_OG_IMAGE', saved._id);
        saved = await saveMeta.mutateAsync({ id: saved._id, ogImage: uploaded.url });
      }

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Updated!' : 'Success!',
        text: `SEO data ${isEditMode ? 'updated' : 'added'} successfully`,
        confirmButtonColor: '#3e8914',
        timer: 1500,
        showConfirmButton: false,
      });
      if (isEditMode) {
        router.push('/dashboard/seo/meta-list');
      } else {
        if (ogFile) URL.revokeObjectURL(ogFile.preview);
        setOgFile(null);
        setForm(emptyForm);
      }
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save SEO', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="flex min-h-full flex-col p-6" style={{ zoom: 0.75 }}>
        <div className="mb-4 pb-3 border-b-2 border-black">
          <h1 className="text-xl font-bold text-[#3e8914] uppercase tracking-wide">
            {isEditMode ? 'Edit SEO Meta' : 'Add SEO Meta'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditMode ? `Update SEO meta tags for ${existing.pageName} (${existing.pagePath})` : 'Add SEO meta tags for website pages'}
          </p>
        </div>

        <div className="bg-white border-2 border-gray-200 p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-100">
            <div className="p-2 bg-[#3e8914]/10">
              <Globe className="w-4 h-4 text-[#3e8914]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">SEO Information</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-4">
              <label className={LABEL_SM}>Select Page <span className="text-red-500">*</span></label>
              <select
                value={form.pagePath}
                disabled={isEditMode || pagesLoading}
                onChange={(e) => void handlePageChange(e.target.value)}
                className={`${FIELD_SM} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`}
              >
                <option value="">{pagesLoading ? 'Loading pages...' : '-- Select a Page --'}</option>
                {isEditMode && !selectedPage && <option value={form.pagePath}>{existing.pageName} ({form.pagePath})</option>}
                {pageGroups.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.pages.map((p) => (
                      <option key={p.path} value={p.path}>
                        {p.name} ({p.path}){p.seoMetaId ? '  ✓ SEO added' : ''}{p.inactive ? '  — inactive in navbar' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-gray-400">
                Website pages plus every service from Navbar List (grouped by menu). Pages marked ✓ already have SEO.
              </p>
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Meta Title</label>
                <span className={`text-[10px] font-bold ${form.metaTitle.length > 55 ? 'text-orange-500' : 'text-gray-400'}`}>{form.metaTitle.length}/65</span>
              </div>
              <input
                value={form.metaTitle}
                maxLength={65}
                onChange={(e) => update('metaTitle', e.target.value)}
                placeholder="Enter meta title"
                className={FIELD_SM}
              />
            </div>

            <div className="col-span-2">
              <label className={LABEL_SM}>Meta Keywords</label>
              <input
                value={form.metaKeywords}
                maxLength={500}
                onChange={(e) => update('metaKeywords', e.target.value)}
                placeholder="Enter meta keywords (comma separated)"
                className={FIELD_SM}
              />
            </div>

            <div className="col-span-2 md:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Meta Description</label>
                <span className={`text-[10px] font-bold ${form.metaDescription.length > 145 ? 'text-red-500' : 'text-gray-400'}`}>{form.metaDescription.length}/155</span>
              </div>
              <textarea
                value={form.metaDescription}
                maxLength={155}
                rows={3}
                onChange={(e) => update('metaDescription', e.target.value)}
                placeholder="Enter meta description"
                className={`${FIELD_LG} resize-none`}
              />
            </div>

            <div className="col-span-2 md:col-span-4 space-y-2">
              <label className={LABEL_LG}>Open Graph Tags (HTML/Text)</label>
              <textarea
                value={form.openGraphTags}
                onChange={(e) => update('openGraphTags', e.target.value)}
                placeholder={'<meta property="og:title" content="AC Repair in Ghaziabad | CityCalls" />\n<meta property="og:description" content="..." />\n<meta name="twitter:card" content="summary_large_image" />'}
                rows={6}
                maxLength={5000}
                className={CODE_AREA}
              />
              <p className="text-[10px] text-gray-400">
                Used on the website: og:title, og:description, og:url, og:type, og:site_name, og:image and twitter:card / title / description / image.
              </p>
            </div>

            <div className="col-span-2 md:col-span-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Schema Markup (JSON-LD)</label>
                {jsonValid === true && <span className="flex items-center gap-1 text-[11px] font-bold text-[#3e8914]"><CheckCircle2 className="h-3.5 w-3.5" /> Valid JSON</span>}
                {jsonValid === false && <span className="flex items-center gap-1 text-[11px] font-bold text-red-600"><XCircle className="h-3.5 w-3.5" /> Invalid JSON</span>}
              </div>
              <textarea
                value={form.schemaMarkup}
                onChange={(e) => update('schemaMarkup', e.target.value)}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Service",\n  "name": "AC Repair",\n  "provider": { "@type": "LocalBusiness", "name": "CityCalls" }\n}'}
                rows={10}
                maxLength={20000}
                className={`${CODE_AREA} ${jsonValid === false ? 'ring-2 ring-red-500' : ''}`}
              />
              <p className="text-[10px] text-gray-400">Paste only the JSON (without the &lt;script&gt; tag).</p>
            </div>

            <div className="col-span-2 md:col-span-4">
              <label className={LABEL_LG}>Canonical URL</label>
              <div className="flex gap-2">
                <input
                  value={form.canonicalUrl}
                  onChange={(e) => update('canonicalUrl', e.target.value.trim())}
                  placeholder={`${WEBSITE_ORIGIN}/services/ac-service`}
                  className={FIELD_SM}
                />
                <button
                  type="button"
                  disabled={!form.pagePath}
                  onClick={() => update('canonicalUrl', `${WEBSITE_ORIGIN}${form.pagePath === '/' ? '' : form.pagePath}`)}
                  className="flex shrink-0 items-center gap-1.5 border-2 border-gray-300 bg-gray-50 px-3 text-xs font-bold text-gray-700 hover:border-[#3e8914] hover:text-[#3e8914] disabled:opacity-50"
                >
                  <Link2 className="h-3.5 w-3.5" /> Use page URL
                </button>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">The preferred full URL of this page. Leave as the page&apos;s own URL unless it duplicates another page.</p>
            </div>

            <div className="col-span-2 md:col-span-4">
              <label className={LABEL_LG}>OG Image <span className="text-[10px] font-normal text-gray-400">(1200×630 recommended)</span></label>
              <div className="relative flex min-h-[100px] items-center justify-center rounded border-2 border-dashed border-gray-300 p-2 text-center transition-colors hover:bg-gray-50">
                <input type="file" onChange={handleImageUpload} accept="image/jpeg,image/png,image/webp" className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                {ogPreview ? (
                  <div className="relative w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ogPreview} alt="OG Preview" className="h-24 w-full rounded object-cover shadow-sm" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -right-2 -top-2 z-20 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <Upload className="mx-auto h-6 w-6 text-gray-300" />
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-tighter text-gray-400">Upload OG Image</span>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className={LABEL_SM}>Status</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value as SeoStatus)}
                className={`${FIELD_SM} font-bold text-white [&>option]:bg-white [&>option]:text-gray-800 ${
                  form.status === 'ACTIVE' ? 'border-[#3e8914] bg-[#3e8914]' : 'border-red-600 bg-red-600'
                }`}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="px-6 py-3 bg-[#3e8914] hover:bg-[#347311] text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 uppercase tracking-wider text-sm disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isEditMode ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? (isEditMode ? 'Updating...' : 'Saving...') : isEditMode ? 'Update SEO Data' : 'Save SEO Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddSeoMetaPageInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const { data: existing, isLoading, isError } = useSeoMeta(editId);

  if (editId && isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  }
  if (editId && (isError || !existing)) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm font-bold text-red-600">SEO entry not found.</div>;
  }
  return <SeoMetaForm key={existing?._id ?? 'new'} existing={existing} />;
}

export default function AddSeoMetaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>}>
      <AddSeoMetaPageInner />
    </Suspense>
  );
}
