'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, Image as ImageIcon, Pencil, Save, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { getSeoMetaById, upsertSeoMeta, WEBSITE_PAGES, SeoStatus } from '@/lib/demoSeoStore';

// Field sizes match Hero Carousel's (dashboard/website/hero-slides) FIELD_SM
// / FIELD_LG / LABEL_SM / LABEL_LG convention exactly, so the two forms feel
// like the same admin panel at the same zoom level.
const FIELD_SM = 'w-full px-3 py-2 border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-xs shadow-sm';
const FIELD_LG = 'w-full px-4 py-3 border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-sm shadow-lg';
const LABEL_SM = 'block text-xs font-medium text-gray-700 mb-1';
const LABEL_LG = 'block text-sm font-medium text-gray-700 mb-2';

const emptyForm = {
  page: '',
  metaTitle: '',
  metaKeywords: '',
  metaDescription: '',
  openGraphTags: '',
  schemaMarkup: '',
  canonicalTag: '',
  ogImagePreview: null as string | null,
  status: 'Active' as SeoStatus,
};

function EditorToolbar({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    targetRef.current?.focus();
  };

  return (
    <div className="flex flex-wrap gap-1 border-b-2 border-gray-200 bg-gray-50 p-2">
      <button type="button" onClick={() => exec('bold')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs font-bold shadow-sm hover:bg-gray-100" title="Bold">B</button>
      <button type="button" onClick={() => exec('italic')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs italic shadow-sm hover:bg-gray-100" title="Italic">I</button>
      <button type="button" onClick={() => exec('underline')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs underline shadow-sm hover:bg-gray-100" title="Underline">U</button>
      <div className="mx-1 w-px bg-gray-300" />
      <button type="button" onClick={() => exec('justifyLeft')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs shadow-sm hover:bg-gray-100" title="Align Left">≡</button>
      <button type="button" onClick={() => exec('justifyCenter')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs shadow-sm hover:bg-gray-100" title="Align Center">≡</button>
      <button type="button" onClick={() => exec('justifyRight')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs shadow-sm hover:bg-gray-100" title="Align Right">≡</button>
      <div className="mx-1 w-px bg-gray-300" />
      <button type="button" onClick={() => exec('insertUnorderedList')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs shadow-sm hover:bg-gray-100" title="Bullet List">• List</button>
      <button type="button" onClick={() => exec('insertOrderedList')} className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs shadow-sm hover:bg-gray-100" title="Numbered List">1. List</button>
      <div className="mx-1 w-px bg-gray-300" />
      <select onChange={(e) => exec('formatBlock', e.target.value)} defaultValue="" className="rounded border-2 border-gray-300 bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-100">
        <option value="">Normal</option>
        <option value="h1">H1</option>
        <option value="h2">H2</option>
        <option value="h3">H3</option>
      </select>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) exec('createLink', url);
        }}
        className="rounded border-2 border-gray-300 bg-white px-3 py-1 text-xs shadow-sm hover:bg-gray-100"
        title="Insert Link"
      >
        🔗
      </button>
    </div>
  );
}

// Keyed by editId from the parent (below) so switching between "add" and
// "edit ⟨id⟩" — or between two different edits — remounts this form instead
// of needing an effect to re-sync state when the query param changes.
function AddSeoMetaForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const isEditMode = !!editId;

  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(() => {
    const existing = editId ? getSeoMetaById(editId) : undefined;
    if (!existing) return emptyForm;
    return {
      page: existing.page,
      metaTitle: existing.metaTitle,
      metaKeywords: existing.metaKeywords,
      metaDescription: existing.metaDescription,
      openGraphTags: existing.openGraphTags,
      schemaMarkup: existing.schemaMarkup,
      canonicalTag: existing.canonicalTag,
      ogImagePreview: existing.ogImagePreview,
      status: existing.status,
    };
  });
  const canonicalRef = useRef<HTMLDivElement>(null);

  // Seeds the contentEditable's DOM content from the loaded form once on
  // mount — a ref/DOM sync, not a setState call, so it belongs in an effect.
  useEffect(() => {
    if (canonicalRef.current) canonicalRef.current.innerHTML = form.canonicalTag || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, ogImagePreview: URL.createObjectURL(file) }));
  };

  const handleSave = () => {
    if (!form.page) {
      void Swal.fire({ icon: 'warning', title: 'Missing Page', text: 'Please select a page', confirmButtonColor: '#3e8914' });
      return;
    }

    setIsSaving(true);
    upsertSeoMeta({
      id: editId ?? form.page,
      ...form,
      updatedBy: 'Admin User',
      updatedAt: new Date().toISOString(),
    });

    void Swal.fire({
      icon: 'success',
      title: isEditMode ? 'Updated!' : 'Success!',
      text: `SEO data ${isEditMode ? 'updated' : 'added'} successfully`,
      confirmButtonColor: '#3e8914',
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      setIsSaving(false);
      if (isEditMode) {
        router.push('/dashboard/seo/meta-list');
      } else {
        setForm(emptyForm);
        if (canonicalRef.current) canonicalRef.current.innerHTML = '';
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="flex min-h-full flex-col p-6" style={{ zoom: 0.75 }}>
        <div className="mb-4 pb-3 border-b-2 border-black">
          <h1 className="text-xl font-bold text-[#3e8914] uppercase tracking-wide">
            {isEditMode ? 'Edit SEO Meta' : 'Add SEO Meta'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditMode ? 'Update SEO meta tags' : 'Add SEO meta tags for website pages'}
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
                value={form.page}
                disabled={isEditMode}
                onChange={(e) => setForm((prev) => ({ ...prev, page: e.target.value }))}
                className={`${FIELD_SM} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
              >
                <option value="">-- Select a Page --</option>
                {WEBSITE_PAGES.map((p) => (
                  <option key={p.path} value={p.path}>{p.name} ({p.path})</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">Meta Title</label>
                <span className={`text-[10px] font-bold ${form.metaTitle.length > 55 ? 'text-orange-500' : 'text-gray-400'}`}>{form.metaTitle.length}/65</span>
              </div>
              <input
                value={form.metaTitle}
                maxLength={65}
                onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                placeholder="Enter meta title"
                className={FIELD_SM}
              />
            </div>

            <div className="col-span-2">
              <label className={LABEL_SM}>Meta Keywords</label>
              <input
                value={form.metaKeywords}
                onChange={(e) => setForm((prev) => ({ ...prev, metaKeywords: e.target.value }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                placeholder="Enter meta description"
                className={`${FIELD_LG} resize-none`}
              />
            </div>

            <div className="col-span-2 md:col-span-4 space-y-2">
              <label className={LABEL_LG}>
                Open Graph Tags (HTML/Text) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.openGraphTags}
                onChange={(e) => setForm((prev) => ({ ...prev, openGraphTags: e.target.value }))}
                placeholder="Paste OG tags here..."
                rows={6}
                className="w-full overflow-auto rounded border-2 border-gray-200 bg-[#1e1e1e] p-4 font-mono text-[11px] text-[#d4d4d4] shadow-inner outline-none focus:ring-2 focus:ring-[#3e8914]"
              />
            </div>

            <div className="col-span-2 md:col-span-4 space-y-2">
              <label className={LABEL_LG}>
                Schema Markup (JSON-LD) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.schemaMarkup}
                onChange={(e) => setForm((prev) => ({ ...prev, schemaMarkup: e.target.value }))}
                placeholder="Paste JSON-LD schema here..."
                rows={10}
                className="w-full overflow-auto rounded border-2 border-gray-200 bg-[#1e1e1e] p-4 font-mono text-[11px] text-[#d4d4d4] shadow-inner outline-none focus:ring-2 focus:ring-[#3e8914]"
              />
            </div>

            <div className="col-span-2 md:col-span-4 space-y-2">
              <label className={LABEL_LG}>
                Canonical Tag <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-gray-200">
                <EditorToolbar targetRef={canonicalRef} />
                <div
                  ref={canonicalRef}
                  contentEditable
                  onInput={() => setForm((prev) => ({ ...prev, canonicalTag: canonicalRef.current?.innerHTML ?? '' }))}
                  onPaste={(e) => {
                    e.preventDefault();
                    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
                  }}
                  className="prose prose-sm min-h-[100px] max-w-none bg-white p-3 shadow-inner outline-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>
            </div>

            <div className="col-span-2 md:col-span-4">
              <label className={LABEL_LG}>OG Image</label>
              <div className="relative flex min-h-[100px] items-center justify-center rounded border-2 border-dashed border-gray-300 p-2 text-center transition-colors hover:bg-gray-50">
                <input type="file" onChange={handleImageUpload} accept="image/*" className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                {form.ogImagePreview ? (
                  <div className="relative w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.ogImagePreview} alt="OG Preview" className="h-24 w-full rounded object-cover shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, ogImagePreview: null }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as SeoStatus }))}
                className={FIELD_SM}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={handleSave}
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
  return <AddSeoMetaForm key={editId ?? 'new'} editId={editId} />;
}

export default function AddSeoMetaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><ImageIcon className="h-6 w-6 animate-pulse text-gray-300" /></div>}>
      <AddSeoMetaPageInner />
    </Suspense>
  );
}
