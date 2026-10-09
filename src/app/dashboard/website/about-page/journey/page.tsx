'use client';

import { useState } from 'react';
import {
  Award, Building2, Edit, Flag, Heart, Image as ImageIcon, Info, MapPin, Plus, Rocket, Route, Save, Sparkles, Star, Target, TrendingUp,
  Trophy, Users, type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import {
  CARD, CARD_TITLE, IconPicker, ImageField, INPUT, LABEL, ListHeadingCard, PageFrame, RowActions, SAVE_BUTTON, StatusSelect,
  confirmDelete, errorMessage, pad, previewUrl, showToast,
} from '@/components/about-page/AboutPageUi';
import {
  ABOUT_MILESTONE_ICONS, AboutMilestone, AboutMilestoneIcon, AboutMilestoneInput, AboutStatus,
  useAboutJourney, useDeleteAboutMilestone, useSaveAboutJourneySection, useSaveAboutMilestone,
} from '@/lib/hooks/useAboutPage';
import { useUploadFile } from '@/lib/hooks/useFiles';

// Website Section → About Page → Our Journey: the year-by-year milestones on
// the railway timeline at the bottom of the About page.

const ICONS: Record<AboutMilestoneIcon, LucideIcon> = {
  Flag, Users, Building2, Trophy, Rocket, Star, MapPin, Award, Sparkles, Target, TrendingUp, Heart,
};

const emptyMilestone: AboutMilestoneInput = {
  year: '', title: '', description: '', tag: '', icon: 'Flag', image: '', imageAlt: '', sortOrder: 0, status: 'ACTIVE',
};

export default function AboutJourneyPage() {
  const { data, isLoading } = useAboutJourney();
  const saveMilestone = useSaveAboutMilestone();
  const deleteMutation = useDeleteAboutMilestone();
  const saveSection = useSaveAboutJourneySection();
  const imageUpload = useUploadFile('CITYCALLS_ABOUT_MILESTONE', 'new', { skipGlobalToast: true });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AboutMilestoneInput>(emptyMilestone);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const milestones = data?.milestones ?? [];
  const nextOrder = milestones.length ? Math.max(...milestones.map((m) => m.sortOrder ?? 0)) + 1 : 1;
  const order = editingId ? form.sortOrder : form.sortOrder || nextOrder;
  const saving = saveMilestone.isPending || imageUpload.isPending;
  const PreviewIcon = ICONS[form.icon] ?? Flag;
  const update = <K extends keyof AboutMilestoneInput>(key: K, value: AboutMilestoneInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setEditingId(null);
    setForm({ ...emptyMilestone, sortOrder: nextOrder });
    setImageFile(null);
    setImagePreview(null);
  }

  function startEdit(m: AboutMilestone) {
    setEditingId(m._id);
    setForm({
      year: m.year, title: m.title, description: m.description ?? '', tag: m.tag ?? '', icon: m.icon,
      image: m.image ?? '', imageAlt: m.imageAlt ?? '', sortOrder: m.sortOrder ?? 0, status: m.status,
    });
    setImageFile(null);
    setImagePreview(m.image ? previewUrl(m.image) : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    if (form.year.trim().length < 2) return showToast('warning', 'Year is required');
    if (form.title.trim().length < 2) return showToast('warning', 'Milestone title is required');
    try {
      const payload = { ...form, year: form.year.trim(), title: form.title.trim(), sortOrder: order };
      // The image needs the milestone's id, so a new milestone is saved first.
      const saved = await saveMilestone.mutateAsync(editingId ? { id: editingId, ...payload } : payload);
      if (imageFile) {
        const uploaded = await imageUpload.upload(imageFile, 'WEBSITE_ABOUT_PAGE_IMAGE', saved._id);
        await saveMilestone.mutateAsync({ id: saved._id, image: uploaded.url });
      }
      showToast('success', editingId ? 'Milestone updated' : 'Milestone added');
      resetForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save milestone', text: errorMessage(error) });
    }
  }

  async function changeStatus(m: AboutMilestone, status: AboutStatus) {
    try {
      await saveMilestone.mutateAsync({ id: m._id, status });
      showToast('success', `Milestone ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } catch {
      showToast('error', 'Failed to change status');
    }
  }

  async function remove(m: AboutMilestone) {
    if (!(await confirmDelete(`Delete "${m.year} — ${m.title}"?`, 'It will be removed from the Our Journey timeline.'))) return;
    try {
      await deleteMutation.mutateAsync(m._id);
      if (editingId === m._id) resetForm();
      showToast('success', 'Milestone deleted');
    } catch {
      showToast('error', 'Failed to delete milestone');
    }
  }

  return (
    <PageFrame title="Our Journey" description="The year-by-year milestones on the About page's timeline — each with a photo, icon and tag — and the heading above them.">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Add / edit milestone */}
        <div className="space-y-6 lg:col-span-1">
          <div className={CARD}>
            <h2 className={CARD_TITLE}>
              {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingId ? 'Edit Milestone' : 'Add Milestone'}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <div>
                  <label className={LABEL}>Year *</label>
                  <input value={form.year} maxLength={12} onChange={(e) => update('year', e.target.value)} placeholder="2028" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Title *</label>
                  <input value={form.title} maxLength={80} onChange={(e) => update('title', e.target.value)} placeholder="e.g. The Beginning" className={INPUT} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Description</label>
                <textarea rows={3} value={form.description} maxLength={300} onChange={(e) => update('description', e.target.value)} placeholder="e.g. Started CityCalls with a mission to simplify home services." className={`${INPUT} resize-none`} />
                <p className="mt-1 text-right text-[10px] text-gray-400">{form.description.length}/300</p>
              </div>
              <div>
                <label className={LABEL}>Photo Tag</label>
                <input value={form.tag} maxLength={40} onChange={(e) => update('tag', e.target.value)} placeholder={`e.g. Milestone ${pad(order)} or Future Vision`} className={INPUT} />
              </div>
              <IconPicker icons={ABOUT_MILESTONE_ICONS} value={form.icon} onChange={(icon) => update('icon', icon)} map={ICONS} />
              <ImageField
                label="Milestone Photo"
                preview={imagePreview}
                hint="Uploads to Cloudinary — JPG, PNG, or WebP, up to 10 MB. A landscape photo works best."
                onFile={(file) => {
                  if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }}
              />
              <div>
                <label className={LABEL}>Image Alt Text</label>
                <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="e.g. CityCalls technician repairing a refrigerator" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Sort Order</label>
                  <input type="number" min={0} value={order} onChange={(e) => update('sortOrder', Number(e.target.value))} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Status</label>
                  <select value={form.status} onChange={(e) => update('status', e.target.value as AboutStatus)} className={INPUT}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Live preview — the website milestone */}
              <div className="flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3e8914] text-white ring-4 ring-[#3e8914]/10">
                  <PreviewIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="rounded-full border border-[#3e8914]/20 bg-[#3e8914]/10 px-2 py-0.5 text-[9px] font-black text-[#3e8914]">{form.year || 'Year'}</span>
                  <p className="mt-1 truncate text-[13px] font-extrabold text-slate-900">{form.title || 'Milestone title'}</p>
                  <p className="line-clamp-2 text-[10px] text-gray-500">{form.description || 'Short description'}</p>
                </div>
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="m-auto mt-4 h-5 w-5 text-gray-300" />
                  )}
                  {form.tag && <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[6px] font-bold uppercase text-white">{form.tag}</span>}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => void submit()} disabled={saving} className={`flex-1 ${SAVE_BUTTON}`}>
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : editingId ? 'Update Milestone' : 'Add Milestone'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">Cancel</button>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3 border border-blue-100 bg-blue-50 p-4">
              <Info className="h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
                Active milestones show top to bottom in sort order, alternating text and photo sides.
              </p>
            </div>
          </div>
        </div>

        {/* Milestones list */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
            <div className="border-b bg-[#233D4D] px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Route className="h-5 w-5 text-[#DE802B]" /> Milestones List</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#233D4D] text-center text-xs font-bold uppercase tracking-wider text-white">
                    <th className="px-5 py-3 text-left">No.</th>
                    <th className="px-5 py-3 text-left">Image</th>
                    <th className="px-5 py-3">Year</th>
                    <th className="px-5 py-3 text-left">Milestone</th>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">Loading milestones...</td></tr>
                  ) : milestones.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">No milestones yet — add one from the form.</td></tr>
                  ) : (
                    milestones.map((m, index) => {
                      const Icon = ICONS[m.icon] ?? Flag;
                      return (
                        <tr key={m._id} className={`transition-colors hover:bg-gray-50 ${editingId === m._id ? 'bg-blue-50/70' : ''}`}>
                          <td className="px-5 py-4 text-[12px] font-bold text-[#3e8914]">{pad(index + 1)}</td>
                          <td className="px-5 py-4">
                            <div className="flex h-12 w-[76px] items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-50">
                              {m.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={previewUrl(m.image)} alt={m.imageAlt || m.title} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="rounded-full border border-[#3e8914]/20 bg-[#3e8914]/10 px-2.5 py-0.5 text-[11px] font-black text-[#3e8914]">{m.year}</span>
                          </td>
                          <td className="max-w-[340px] px-5 py-4">
                            <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-tighter text-[#4B1426]">
                              <Icon className="h-3.5 w-3.5 text-[#3e8914]" /> {m.title}
                              {m.tag && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-gray-500">{m.tag}</span>}
                            </span>
                            {m.description && <span className="mt-0.5 block text-[11px] leading-snug text-[#6c7587]">{m.description}</span>}
                          </td>
                          <td className="px-5 py-4 text-center text-[11px] font-bold uppercase text-[#6c7587]">#{m.sortOrder}</td>
                          <td className="px-5 py-4 text-center">
                            <StatusSelect key={`${m._id}-${m.status}`} value={m.status} onChange={(s) => void changeStatus(m, s)} />
                          </td>
                          <td className="px-5 py-4"><RowActions onEdit={() => startEdit(m)} onDelete={() => void remove(m)} /></td>
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

      {data?.section && (
        <ListHeadingCard
          key={data.section.updatedAt ?? 'default'}
          section={data.section}
          saving={saveSection.isPending}
          onSave={(input) => saveSection.mutateAsync(input)}
          placeholder={{ eyebrow: 'Our Story & Growth', heading: 'Our Journey' }}
          preview={(f) => (
            <div className="text-center">
              {f.eyebrow && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3e8914]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[#3e8914]">
                  <Sparkles className="h-3 w-3" /> {f.eyebrow}
                </span>
              )}
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{f.heading || 'Heading'}</p>
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[#3e8914]" />
            </div>
          )}
        />
      )}
    </PageFrame>
  );
}
