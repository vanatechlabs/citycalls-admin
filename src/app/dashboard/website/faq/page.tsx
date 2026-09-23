'use client';

import { useMemo, useState } from 'react';
import { Edit, HelpCircle, Image as ImageIcon, Plus, Save, Trash2, Type } from 'lucide-react';
import Swal from 'sweetalert2';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  image: string;
  altText: string;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const defaultFaqs: FaqItem[] = [
  {
    id: uid(),
    question: 'What areas does CityCalls cover?',
    answer: 'We currently serve all major neighborhoods across the city, with same-day slots in most zones.',
    image: '/assets/faq/f1.png',
    altText: 'CityCalls service coverage',
  },
  {
    id: uid(),
    question: 'How do I book a technician?',
    answer: 'Pick a service, choose a slot, and confirm — a verified technician is assigned within minutes.',
    image: '/assets/faq/f2.png',
    altText: 'Booking a CityCalls technician',
  },
];

const emptyHeadings = {
  subheading: 'FAQ',
  heading: 'Frequently Asked Questions',
  highlightedWord: 'Questions',
};

const emptyFaqForm = {
  question: '',
  answer: '',
  image: '',
  altText: '',
};

export default function FaqManagementPage() {
  const [headings, setHeadings] = useState(emptyHeadings);
  const [savingHeadings, setSavingHeadings] = useState(false);

  const [faqs, setFaqs] = useState<FaqItem[]>(defaultFaqs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState(emptyFaqForm);

  const previewSrc = useMemo(() => faqForm.image, [faqForm.image]);

  function saveHeadings() {
    setSavingHeadings(true);
    setTimeout(() => {
      setSavingHeadings(false);
      void Swal.fire({ icon: 'success', title: 'Headings updated', timer: 1300, showConfirmButton: false });
    }, 300);
  }

  function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFaqForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  }

  function saveFaq() {
    if (!faqForm.question.trim() || !faqForm.answer.trim() || !faqForm.image.trim()) {
      void Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Question, Answer, and Image are required', confirmButtonColor: '#3e8914' });
      return;
    }

    const payload: FaqItem = { id: editingId ?? uid(), ...faqForm };
    setFaqs((prev) => (editingId ? prev.map((f) => (f.id === editingId ? payload : f)) : [...prev, payload]));
    resetFaqForm();
    void Swal.fire({ icon: 'success', title: editingId ? 'FAQ updated' : 'FAQ added', timer: 1300, showConfirmButton: false });
  }

  function startEdit(faq: FaqItem) {
    setEditingId(faq.id);
    setFaqForm({ question: faq.question, answer: faq.answer, image: faq.image, altText: faq.altText });
  }

  function resetFaqForm() {
    setEditingId(null);
    setFaqForm(emptyFaqForm);
  }

  async function deleteFaq(faq: FaqItem) {
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
    setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
    if (editingId === faq.id) resetFaqForm();
    void Swal.fire({ icon: 'success', title: 'FAQ deleted', timer: 1200, showConfirmButton: false });
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="bg-white p-6 shadow-md min-h-screen">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">FAQ Management</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage global FAQ headings and individual question cards.</p>
        </div>

        <div style={{ zoom: 0.75 }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              {/* Section Headings */}
              <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#3e8914]">
                  <Type className="h-5 w-5" /> Section Headings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-tight text-gray-700">Subheading</label>
                    <input
                      value={headings.subheading}
                      onChange={(e) => setHeadings((prev) => ({ ...prev, subheading: e.target.value }))}
                      className="w-full border-2 border-gray-300 px-4 py-2 outline-none focus:border-[#3e8914]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-tight text-gray-700">Main Heading</label>
                    <input
                      value={headings.heading}
                      onChange={(e) => setHeadings((prev) => ({ ...prev, heading: e.target.value }))}
                      className="w-full border-2 border-gray-300 px-4 py-2 outline-none focus:border-[#3e8914]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-tight text-gray-700">Highlight Word</label>
                    <input
                      value={headings.highlightedWord}
                      onChange={(e) => setHeadings((prev) => ({ ...prev, highlightedWord: e.target.value }))}
                      className="w-full border-2 border-gray-300 px-4 py-2 outline-none focus:border-[#3e8914]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveHeadings}
                    disabled={savingHeadings}
                    className="flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" /> Save Headings
                  </button>
                </div>
              </div>

              {/* Add/Edit FAQ */}
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
                      onChange={(e) => setFaqForm((prev) => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter question text..."
                      className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#3e8914]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500">Answer</label>
                    <textarea
                      value={faqForm.answer}
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
                        {previewSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        )}
                        <input type="file" onChange={handleImageFile} className="absolute inset-0 cursor-pointer opacity-0" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          value={faqForm.image}
                          onChange={(e) => setFaqForm((prev) => ({ ...prev, image: e.target.value }))}
                          placeholder="Image URL..."
                          className="w-full border-b border-gray-300 px-2 py-1 text-[10px] outline-none"
                        />
                        <input
                          value={faqForm.altText}
                          onChange={(e) => setFaqForm((prev) => ({ ...prev, altText: e.target.value }))}
                          placeholder="Alt Text (SEO)..."
                          className="w-full border-b border-gray-300 px-2 py-1 text-[10px] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={saveFaq}
                      className="flex-1 bg-[#DE802B] py-2 font-bold text-white transition-colors hover:bg-[#c66d21]"
                    >
                      {editingId ? 'Update FAQ' : 'Add FAQ'}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetFaqForm}
                        className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Items List */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                <div className="border-b bg-[#233D4D] px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <HelpCircle className="h-5 w-5 text-[#DE802B]" /> FAQ Items List
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                        <th className="px-6 py-3 text-left">No.</th>
                        <th className="px-6 py-3 text-left">Preview</th>
                        <th className="px-6 py-3 text-left">Question</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {faqs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            No FAQs found. Add your first item using the form.
                          </td>
                        </tr>
                      ) : (
                        faqs.map((faq, index) => (
                          <tr key={faq.id} className="transition-colors hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold text-[#3e8914]">{index + 1}</td>
                            <td className="px-6 py-4">
                              <div className="h-10 w-12 overflow-hidden rounded border border-gray-200 bg-gray-100">
                                {faq.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={faq.image} alt={faq.altText} className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-full w-full p-2 text-gray-300" />
                                )}
                              </div>
                            </td>
                            <td className="max-w-sm px-6 py-4 font-medium text-gray-900">
                              <div className="truncate">{faq.question}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-2">
                                <button type="button" onClick={() => startEdit(faq)} title="Edit" className="p-2 text-blue-600 transition-colors hover:bg-blue-50">
                                  <Edit className="h-5 w-5" />
                                </button>
                                <button type="button" onClick={() => deleteFaq(faq)} title="Delete" className="p-2 text-red-600 transition-colors hover:bg-red-50">
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
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
      </div>
    </div>
  );
}
