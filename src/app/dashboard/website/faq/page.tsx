'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import { Edit, Pencil, HelpCircle, Image as ImageIcon, Plus, Save, Trash2, Type } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { usePermission } from '@/lib/hooks/useAuth';
import { Faq, FaqInput, FaqSectionInput, useDeleteFaq, useFaqs, useSaveFaq, useSaveFaqSection } from '@/lib/hooks/useFaqs';
import { useUploadFile } from '@/lib/hooks/useFiles';
import { resolveMediaUrl } from '@/lib/registrations/format';

// Website Section → FAQ: headings and question cards of the home page's
// "Frequently Asked Questions" accordion (the picture shows beside the open
// question).

const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Bundled /assets/ images live on the website; uploads on the API / Cloudinary.
function previewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('blob:')) return image;
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || 'Please try again.';
}

const emptyFaqForm = { question: '', answer: '', image: '', altText: '' };

export default function FaqManagementPage() {
  const { data, isLoading } = useFaqs();

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">FAQ Management</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage global FAQ headings and individual question cards.</p>
        </div>

        {isLoading || !data ? (
          <div className="flex min-h-[40vh] items-center justify-center"><HelpCircle className="h-6 w-6 animate-pulse text-gray-300" /></div>
        ) : (
          <FaqManager section={data.section} faqs={data.faqs} />
        )}
      </div>
    </div>
  );
}

function FaqManager({ section, faqs }: { section: FaqSectionInput; faqs: Faq[] }) {
  const canEdit = usePermission('marketing', 'edit');
  const saveSection = useSaveFaqSection();
  const saveFaq = useSaveFaq();
  const deleteFaqMutation = useDeleteFaq();
  const uploader = useUploadFile('CITYCALLS_FAQ', 'new', { skipGlobalToast: true });

  const [headings, setHeadings] = useState<FaqSectionInput>({
    subheading: section.subheading, heading: section.heading, highlightedWord: section.highlightedWord, description: section.description,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState(emptyFaqForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const saving = saveFaq.isPending || uploader.isPending;

  async function saveHeadings() {
    try {
      await saveSection.mutateAsync(headings);
      void Swal.fire({ icon: 'success', title: 'Headings updated', timer: 1300, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save headings', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 5 MB.', confirmButtonColor: '#3e8914' });
      return;
    }
    if (faqForm.image.startsWith('blob:')) URL.revokeObjectURL(faqForm.image);
    setImageFile(file);
    setFaqForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  }

  function resetFaqForm() {
    if (faqForm.image.startsWith('blob:')) URL.revokeObjectURL(faqForm.image);
    setEditingId(null);
    setImageFile(null);
    setFaqForm(emptyFaqForm);
  }

  async function submitFaq() {
    if (!faqForm.question.trim() || !faqForm.answer.trim() || !faqForm.image.trim()) {
      void Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Question, Answer, and Image are required', confirmButtonColor: '#3e8914' });
      return;
    }
    try {
      // A picked file is uploaded after saving (it needs the FAQ's id).
      const fields: Partial<FaqInput> = {
        question: faqForm.question,
        answer: faqForm.answer,
        altText: faqForm.altText,
        ...(imageFile ? {} : { image: faqForm.image }),
      };
      if (!editingId) fields.sortOrder = faqs.reduce((max, f) => Math.max(max, f.sortOrder), 0) + 1;
      const saved = await saveFaq.mutateAsync(editingId ? { id: editingId, ...fields } : fields);
      if (imageFile) {
        const uploaded = await uploader.upload(imageFile, 'WEBSITE_FAQ_IMAGE', saved._id);
        await saveFaq.mutateAsync({ id: saved._id, image: uploaded.url });
      }
      void Swal.fire({ icon: 'success', title: editingId ? 'FAQ updated' : 'FAQ added', timer: 1300, showConfirmButton: false });
      resetFaqForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save FAQ', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  function startEdit(faq: Faq) {
    resetFaqForm();
    setEditingId(faq._id);
    setFaqForm({ question: faq.question, answer: faq.answer, image: faq.image, altText: faq.altText });
  }

  async function toggleStatus(faq: Faq) {
    try {
      await saveFaq.mutateAsync({ id: faq._id, status: faq.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not change status', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  async function deleteFaq(faq: Faq) {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteFaqMutation.mutateAsync(faq._id);
      if (editingId === faq._id) resetFaqForm();
      void Swal.fire({ icon: 'success', title: 'FAQ deleted', timer: 1200, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not delete FAQ', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  const headingField = (label: string, key: keyof FaqSectionInput, textarea = false) => (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-tight text-gray-700">{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          value={headings[key]}
          disabled={!canEdit}
          onChange={(e) => setHeadings((prev) => ({ ...prev, [key]: e.target.value }))}
          className="w-full resize-none border-2 border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#3e8914]"
        />
      ) : (
        <input
          value={headings[key]}
          disabled={!canEdit}
          onChange={(e) => setHeadings((prev) => ({ ...prev, [key]: e.target.value }))}
          className="w-full border-2 border-gray-300 px-4 py-2 outline-none focus:border-[#3e8914]"
        />
      )}
    </div>
  );

  return (
    <div style={{ zoom: 0.75 }}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {/* Section Headings */}
          <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#3e8914]">
              <Type className="h-5 w-5" /> Section Headings
            </h2>
            <div className="space-y-4">
              {headingField('Subheading', 'subheading')}
              {headingField('Main Heading', 'heading')}
              {headingField('Highlight Word', 'highlightedWord')}
              {headingField('Short Description', 'description', true)}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void saveHeadings()}
                  disabled={saveSection.isPending}
                  className="flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> {saveSection.isPending ? 'Saving…' : 'Save Headings'}
                </button>
              )}
            </div>
          </div>

          {/* Add/Edit FAQ */}
          {canEdit && (
            <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]">
                {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingId ? 'Edit FAQ Item' : 'Add New FAQ'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500">Question</label>
                  <input
                    value={faqForm.question}
                    maxLength={200}
                    onChange={(e) => setFaqForm((prev) => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter question text..."
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#3e8914]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500">Answer</label>
                  <textarea
                    value={faqForm.answer}
                    maxLength={1500}
                    onChange={(e) => setFaqForm((prev) => ({ ...prev, answer: e.target.value }))}
                    placeholder="Enter clear and concise answer..."
                    rows={4}
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#3e8914]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Preview Image</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-100">
                      {faqForm.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl(faqForm.image)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                      <input type="file" accept={IMAGE_TYPES.join(',')} onChange={handleImageFile} className="absolute inset-0 cursor-pointer opacity-0" title="Upload image" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        value={faqForm.image.startsWith('blob:') ? imageFile?.name ?? '' : faqForm.image}
                        readOnly={faqForm.image.startsWith('blob:')}
                        onChange={(e) => { setImageFile(null); setFaqForm((prev) => ({ ...prev, image: e.target.value })); }}
                        placeholder="Image URL..."
                        className="w-full border-b border-gray-300 px-2 py-1 text-[10px] outline-none"
                      />
                      <input
                        value={faqForm.altText}
                        maxLength={200}
                        onChange={(e) => setFaqForm((prev) => ({ ...prev, altText: e.target.value }))}
                        placeholder="Alt Text (SEO)..."
                        className="w-full border-b border-gray-300 px-2 py-1 text-[10px] outline-none"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">Click the box to upload (JPG, PNG, WebP up to 5 MB), or paste an image URL.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void submitFaq()}
                    disabled={saving}
                    className="flex-1 bg-[#DE802B] py-2 font-bold text-white transition-colors hover:bg-[#c66d21] disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : editingId ? 'Update FAQ' : 'Add FAQ'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetFaqForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Items List */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-[#233D4D] px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <HelpCircle className="h-5 w-5 text-[#DE802B]" /> FAQ Items List
              </h2>
              <span className="text-xs font-semibold text-slate-200">{faqs.filter((f) => f.status === 'ACTIVE').length} of {faqs.length} shown on website</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                    <th className="px-6 py-3 text-left">No.</th>
                    <th className="px-6 py-3 text-left">Preview</th>
                    <th className="px-6 py-3 text-left">Question</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {faqs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No FAQs found. Add your first item using the form.</td>
                    </tr>
                  ) : (
                    faqs.map((faq, index) => (
                      <tr key={faq._id} className={`transition-colors hover:bg-gray-50 ${editingId === faq._id ? 'bg-[#3e8914]/5' : ''}`}>
                        <td className="px-6 py-4 font-bold text-[#3e8914]">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="h-10 w-12 overflow-hidden rounded border border-gray-200 bg-gray-100">
                            {faq.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={previewUrl(faq.image)} alt={faq.altText} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-full w-full p-2 text-gray-300" />
                            )}
                          </div>
                        </td>
                        <td className="max-w-sm px-6 py-4">
                          <div className="truncate font-medium text-gray-900">{faq.question}</div>
                          <div className="truncate text-xs text-gray-500">{faq.answer}</div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => void toggleStatus(faq)}
                            className={`rounded-[4px] border px-2 py-0.5 text-[11px] font-bold disabled:cursor-not-allowed ${
                              faq.status === 'ACTIVE' ? 'border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]' : 'border-[#fca5a5] bg-[#fee2e2] text-[#dc2626]'
                            }`}
                            title={canEdit ? 'Click to switch' : undefined}
                          >
                            {faq.status}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {canEdit && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button type="button" onClick={() => startEdit(faq)} title="Edit FAQ" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95">
                                <Pencil className="h-[12px] w-[12px] text-blue-600" />
                              </button>
                              <button type="button" onClick={() => void deleteFaq(faq)} title="Delete FAQ" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95">
                                <Trash2 className="h-[12px] w-[12px] text-red-600" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
