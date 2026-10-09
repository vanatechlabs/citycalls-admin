'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import {
  BadgeCheck, CalendarCheck, ClipboardCheck, Clock, Edit, Footprints, Heading, Home, Image as ImageIcon, Info, PhoneCall, Plus,
  Save, ShieldCheck, Sparkles, ThumbsUp, Trash2, Truck, UserCheck, Wrench, type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  HOW_IT_WORKS_ICONS, HowItWorksIcon, HowItWorksSection, HowItWorksSectionInput, HowItWorksStatus, HowItWorksStep, HowItWorksStepInput,
  useDeleteHowItWorksStep, useHowItWorks, useSaveHowItWorksSection, useSaveHowItWorksStep,
} from '@/lib/hooks/useHowItWorks';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';

// Website Section → How It Works: the step cards that slide sideways on the
// home page (photo + icon + title + description), and the section heading.

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Default step photos are the website's own files (/assets/...).
const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const LABEL = 'mb-1 block text-xs font-bold uppercase text-gray-500';
const INPUT = 'w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]';
const CARD_TITLE = 'mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]';
const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-[6px] backdrop-blur-md border transition-all hover:scale-105 active:scale-95';

const ICONS: Record<HowItWorksIcon, LucideIcon> = {
  CalendarCheck, UserCheck, Wrench, ThumbsUp, PhoneCall, ClipboardCheck, Truck, ShieldCheck, BadgeCheck, Home, Clock, Sparkles,
};

const emptyStep: HowItWorksStepInput = {
  title: '', description: '', image: '', imageAlt: '', icon: 'CalendarCheck', sortOrder: 0, status: 'ACTIVE',
};

const pad = (n: number) => String(n).padStart(2, '0');

function previewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false });
}

function sectionForm(section: HowItWorksSection): HowItWorksSectionInput {
  return {
    eyebrow: section.eyebrow ?? '',
    heading: section.heading ?? '',
    highlight: section.highlight ?? '',
    description: section.description ?? '',
  };
}

// Section heading form; keyed by updatedAt so a save reloads it.
function SectionHeadingCard({ section }: { section: HowItWorksSection }) {
  const [form, setForm] = useState<HowItWorksSectionInput>(sectionForm(section));
  const saveSection = useSaveHowItWorksSection();
  const update = <K extends keyof HowItWorksSectionInput>(key: K, value: HowItWorksSectionInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const highlightMissing = !!form.highlight && !form.heading.includes(form.highlight);
  const index = form.highlight ? form.heading.indexOf(form.highlight) : -1;

  async function save() {
    if (!form.heading.trim()) return showToast('warning', 'Heading is required');
    if (highlightMissing) return showToast('warning', 'Highlight text must be part of the heading');
    try {
      await saveSection.mutateAsync(form);
      showToast('success', 'Section heading saved');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save heading', text: errorMessage(error) });
    }
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="border-2 border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className={CARD_TITLE}><Heading className="h-5 w-5" /> Section Heading</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Eyebrow</label>
            <input value={form.eyebrow} maxLength={60} onChange={(e) => update('eyebrow', e.target.value)} placeholder="Interactive Walkthrough" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Heading *</label>
            <input value={form.heading} maxLength={140} onChange={(e) => update('heading', e.target.value)} placeholder="How It Works" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Highlight Text <span className="normal-case text-gray-400">(green, underlined)</span></label>
            <input
              value={form.highlight}
              maxLength={80}
              onChange={(e) => update('highlight', e.target.value)}
              placeholder="Works"
              className={`${INPUT} ${highlightMissing ? 'border-red-400' : ''}`}
            />
            {highlightMissing && <p className="mt-1 text-[10px] font-bold text-red-500">Must be part of the heading</p>}
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Description</label>
            <textarea rows={2} value={form.description} maxLength={400} onChange={(e) => update('description', e.target.value)} className={`${INPUT} resize-none`} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saveSection.isPending}
          className="mt-5 flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saveSection.isPending ? 'Saving...' : 'Save Heading'}
        </button>
      </div>

      <div className="border-2 border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h2 className={CARD_TITLE}><Info className="h-5 w-5" /> Heading Preview</h2>
        {form.eyebrow && (
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3e8914]/20 bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#3e8914]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3e8914]" /> {form.eyebrow}
          </span>
        )}
        <p className="text-xl font-black uppercase leading-tight tracking-tight text-slate-900">
          {index < 0 ? form.heading || 'Heading' : (
            <>{form.heading.slice(0, index)}<span className="text-[#3e8914] underline decoration-2 underline-offset-4">{form.highlight}</span>{form.heading.slice(index + form.highlight.length)}</>
          )}
        </p>
        {form.description && <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{form.description}</p>}
        {section.updatedBy && (
          <p className="mt-4 text-[10px] font-medium text-gray-400">
            Last saved by <strong className="text-[#4B1426]">{section.updatedBy.name}</strong>, {formatDate(section.updatedAt)}, {formatTime(section.updatedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const { data, isLoading } = useHowItWorks();
  const saveStep = useSaveHowItWorksStep();
  const deleteStepMutation = useDeleteHowItWorksStep();
  const imageUpload = useUploadFile('CITYCALLS_HOW_IT_WORKS', 'new', { skipGlobalToast: true });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HowItWorksStepInput>(emptyStep);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const steps = data?.steps ?? [];
  const isSaving = saveStep.isPending || imageUpload.isPending;
  // Next free position, so new steps go to the end unless changed.
  const nextOrder = steps.length ? Math.max(...steps.map((s) => s.sortOrder ?? 0)) + 1 : 1;
  const activeSteps = steps.filter((s) => s.status === 'ACTIVE');
  const PreviewIcon = ICONS[form.icon] ?? CalendarCheck;

  const update = <K extends keyof HowItWorksStepInput>(key: K, value: HowItWorksStepInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setEditingId(null);
    setForm({ ...emptyStep, sortOrder: nextOrder });
    setImageFile(null);
    setImagePreview(null);
  }

  function startEdit(step: HowItWorksStep) {
    setEditingId(step._id);
    setForm({
      title: step.title, description: step.description ?? '', image: step.image ?? '', imageAlt: step.imageAlt ?? '',
      icon: step.icon, sortOrder: step.sortOrder ?? 0, status: step.status,
    });
    setImageFile(null);
    setImagePreview(step.image ? previewUrl(step.image) : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      showToast('warning', 'Use a JPG, PNG or WebP image up to 10 MB');
      return;
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function submitStep() {
    if (form.title.trim().length < 2) return showToast('warning', 'Step title is required');

    try {
      const payload = { ...form, title: form.title.trim(), sortOrder: editingId ? form.sortOrder : form.sortOrder || nextOrder };
      // The image needs the step's id, so a new step is saved first.
      const saved = await saveStep.mutateAsync(editingId ? { id: editingId, ...payload } : payload);
      if (imageFile) {
        const uploaded = await imageUpload.upload(imageFile, 'WEBSITE_HOW_IT_WORKS_IMAGE', saved._id);
        await saveStep.mutateAsync({ id: saved._id, image: uploaded.url });
      }
      showToast('success', editingId ? 'Step updated' : 'Step added');
      resetForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save step', text: errorMessage(error) });
    }
  }

  async function changeStatus(step: HowItWorksStep, status: HowItWorksStatus) {
    try {
      await saveStep.mutateAsync({ id: step._id, status });
      showToast('success', `Step ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } catch {
      showToast('error', 'Failed to change status');
    }
  }

  async function deleteStep(step: HowItWorksStep) {
    const result = await Swal.fire({
      title: `Delete "${step.title}" step?`,
      text: 'It will be removed from the home page How It Works section.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteStepMutation.mutateAsync(step._id);
      if (editingId === step._id) resetForm();
      showToast('success', 'Step deleted');
    } catch {
      showToast('error', 'Failed to delete step');
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">How It Works</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
            The step cards that slide sideways on the home page as visitors scroll — each with a photo, icon, title and short description.
          </p>
        </div>

        <div style={{ zoom: 0.75 }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Add / edit step */}
            <div className="space-y-6 lg:col-span-1">
              <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                <h2 className={CARD_TITLE}>
                  {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? 'Edit Step' : 'Add Step'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Step Title *</label>
                    <input value={form.title} maxLength={60} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Book a Service" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Short Description</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      maxLength={200}
                      onChange={(e) => update('description', e.target.value)}
                      placeholder="e.g. Select your preferred date & time, and instantly book our service online."
                      className={`${INPUT} resize-none`}
                    />
                    <p className="mt-1 text-right text-[10px] text-gray-400">{form.description.length}/200</p>
                  </div>
                  <div>
                    <label className={LABEL}>Icon</label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {HOW_IT_WORKS_ICONS.map((name) => {
                        const Icon = ICONS[name];
                        const active = form.icon === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            title={name}
                            onClick={() => update('icon', name)}
                            className={`flex aspect-square items-center justify-center border-2 transition-colors ${active ? 'border-[#3e8914] bg-[#3e8914] text-white' : 'border-gray-200 bg-white text-[#3e8914] hover:border-[#3e8914]/50'}`}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Step Image</label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept={IMAGE_TYPES.join(',')}
                        onChange={handleImageFile}
                        className="min-w-0 flex-1 border-2 border-gray-300 px-3 py-2 text-xs font-semibold outline-none focus:border-[#134698]"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">Uploads to Cloudinary — JPG, PNG, or WebP, up to 10 MB. A landscape photo (16:10, e.g. 1200×750) works best.</p>
                  </div>
                  <div>
                    <label className={LABEL}>Image Alt Text</label>
                    <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="e.g. Customer booking a service on a phone" className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Sort Order</label>
                      <input type="number" min={0} value={editingId ? form.sortOrder : form.sortOrder || nextOrder} onChange={(e) => update('sortOrder', Number(e.target.value))} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Status</label>
                      <select value={form.status} onChange={(e) => update('status', e.target.value as HowItWorksStatus)} className={INPUT}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Live preview — the website card */}
                  <div className="overflow-hidden rounded-[14px] bg-white p-1.5" style={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgb(209, 213, 219) 0px 0px 0px 1px inset' }}>
                    <div className="grid grid-cols-[1.1fr_1fr] gap-1.5">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-gray-100">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col justify-center px-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#5aa832] to-[#2f6b0f] text-white">
                          <PreviewIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#3e8914]">Step {pad(editingId ? form.sortOrder : form.sortOrder || nextOrder)}</span>
                        <span className="truncate text-[12px] font-extrabold text-slate-900">{form.title || 'Step title'}</span>
                        <span className="line-clamp-2 text-[9px] leading-snug text-gray-500">{form.description || 'Short description'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void submitStep()}
                      disabled={isSaving}
                      className="flex flex-1 items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : editingId ? 'Update Step' : 'Add Step'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={resetForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-3 border border-blue-100 bg-blue-50 p-4">
                  <Info className="h-5 w-5 shrink-0 text-blue-600" />
                  <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
                    Active steps show in sort order and are numbered automatically (Step 01, 02, ...). Keep 3–6 steps so the scroll stays short.
                  </p>
                </div>
              </div>
            </div>

            {/* Steps list */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b bg-[#233D4D] px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Footprints className="h-5 w-5 text-[#DE802B]" /> Steps List
                  </h2>
                  <span className="text-xs font-bold text-white/70">{activeSteps.length} active of {steps.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#233D4D] text-center text-xs font-bold uppercase tracking-wider text-white">
                        <th className="px-5 py-3 text-left">No.</th>
                        <th className="px-5 py-3 text-left">Image</th>
                        <th className="px-5 py-3 text-left">Step</th>
                        <th className="px-5 py-3">Icon</th>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">Loading steps...</td></tr>
                      ) : steps.length === 0 ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">No steps yet — add one from the form.</td></tr>
                      ) : (
                        steps.map((step, index) => {
                          const Icon = ICONS[step.icon] ?? CalendarCheck;
                          return (
                            <tr key={step._id} className={`transition-colors hover:bg-gray-50 ${editingId === step._id ? 'bg-blue-50/70' : ''}`}>
                              <td className="px-5 py-4 text-[12px] font-bold text-[#3e8914]">{pad(index + 1)}</td>
                              <td className="px-5 py-4">
                                <div className="flex h-12 w-[76px] items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-50">
                                  {step.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={previewUrl(step.image)} alt={step.imageAlt || step.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <ImageIcon className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                              </td>
                              <td className="max-w-[340px] px-5 py-4">
                                <span className="block text-[12px] font-bold uppercase tracking-tighter text-[#4B1426]">{step.title}</span>
                                {step.description && <span className="mt-0.5 block text-[11px] leading-snug text-[#6c7587]">{step.description}</span>}
                              </td>
                              <td className="px-5 py-4">
                                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#3e8914]/10 text-[#3e8914]" title={step.icon}>
                                  <Icon className="h-4 w-4" />
                                </span>
                              </td>
                              <td className="px-5 py-4 text-center text-[11px] font-bold uppercase text-[#6c7587]">#{step.sortOrder}</td>
                              <td className="px-5 py-4 text-center">
                                <select
                                  key={`${step._id}-${step.status}`}
                                  value={step.status}
                                  onChange={(e) => void changeStatus(step, e.target.value as HowItWorksStatus)}
                                  className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                                    step.status === 'ACTIVE'
                                      ? 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]'
                                      : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                                  }`}
                                  style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                  }}
                                >
                                  <option value="ACTIVE" className="bg-white font-bold text-[#23714a]">Active</option>
                                  <option value="INACTIVE" className="bg-white font-bold text-[#dc2626]">Inactive</option>
                                </select>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(step)}
                                    title="Edit"
                                    className={`${ICON_BUTTON} bg-blue-500/10 text-blue-600 border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] hover:bg-blue-500/20 hover:border-blue-400/50`}
                                  >
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteStep(step)}
                                    title="Delete"
                                    className={`${ICON_BUTTON} bg-red-500/10 text-red-600 border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] hover:bg-red-500/20 hover:border-red-400/50`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {data?.section && <SectionHeadingCard key={data.section.updatedAt} section={data.section} />}
        </div>
      </div>
    </div>
  );
}
