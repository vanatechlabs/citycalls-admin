'use client';

import { useState } from 'react';
import {
  Award, BadgeCheck, Clock, Edit, HandCoins, Heart, Info, Plus, Save, ShieldCheck, Sparkles, Star, Target, ThumbsUp, Users, Wrench,
  Gem, type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import {
  CARD, CARD_TITLE, IconPicker, INPUT, LABEL, ListHeadingCard, PageFrame, RowActions, SAVE_BUTTON, StatusSelect, confirmDelete,
  errorMessage, pad, showToast,
} from '@/components/about-page/AboutPageUi';
import {
  ABOUT_VALUE_ICONS, AboutStatus, AboutValue, AboutValueIcon, AboutValueInput,
  useAboutValues, useDeleteAboutValue, useSaveAboutValue, useSaveAboutValuesSection,
} from '@/lib/hooks/useAboutPage';

// Website Section → About Page → Our Values: the "What we stand for" cards.

const ICONS: Record<AboutValueIcon, LucideIcon> = {
  ShieldCheck, Heart, Users, Award, Star, ThumbsUp, BadgeCheck, Sparkles, Clock, Wrench, HandCoins, Target,
};

const emptyValue: AboutValueInput = { title: '', description: '', icon: 'ShieldCheck', sortOrder: 0, status: 'ACTIVE' };

export default function AboutValuesPage() {
  const { data, isLoading } = useAboutValues();
  const saveValue = useSaveAboutValue();
  const deleteMutation = useDeleteAboutValue();
  const saveSection = useSaveAboutValuesSection();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AboutValueInput>(emptyValue);
  const values = data?.values ?? [];
  const nextOrder = values.length ? Math.max(...values.map((v) => v.sortOrder ?? 0)) + 1 : 1;
  const order = editingId ? form.sortOrder : form.sortOrder || nextOrder;
  const PreviewIcon = ICONS[form.icon] ?? ShieldCheck;
  const update = <K extends keyof AboutValueInput>(key: K, value: AboutValueInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyValue, sortOrder: nextOrder });
  }

  function startEdit(v: AboutValue) {
    setEditingId(v._id);
    setForm({ title: v.title, description: v.description ?? '', icon: v.icon, sortOrder: v.sortOrder ?? 0, status: v.status });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    if (form.title.trim().length < 2) return showToast('warning', 'Value title is required');
    try {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim(), sortOrder: order };
      await saveValue.mutateAsync(editingId ? { id: editingId, ...payload } : payload);
      showToast('success', editingId ? 'Value updated' : 'Value added');
      resetForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save value', text: errorMessage(error) });
    }
  }

  async function changeStatus(v: AboutValue, status: AboutStatus) {
    try {
      await saveValue.mutateAsync({ id: v._id, status });
      showToast('success', `Value ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } catch {
      showToast('error', 'Failed to change status');
    }
  }

  async function remove(v: AboutValue) {
    if (!(await confirmDelete(`Delete "${v.title}"?`, 'It will be removed from the About page.'))) return;
    try {
      await deleteMutation.mutateAsync(v._id);
      if (editingId === v._id) resetForm();
      showToast('success', 'Value deleted');
    } catch {
      showToast('error', 'Failed to delete value');
    }
  }

  return (
    <PageFrame title="Our Values" description="The &quot;What we stand for&quot; cards on the About page — icon, title and a short line each — and the heading above them.">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Add / edit value */}
        <div className="space-y-6 lg:col-span-1">
          <div className={CARD}>
            <h2 className={CARD_TITLE}>
              {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingId ? 'Edit Value' : 'Add Value'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Title *</label>
                <input value={form.title} maxLength={60} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Trust first" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Description</label>
                <textarea rows={3} value={form.description} maxLength={200} onChange={(e) => update('description', e.target.value)} placeholder="e.g. Every pro is verified before their first job." className={`${INPUT} resize-none`} />
                <p className="mt-1 text-right text-[10px] text-gray-400">{form.description.length}/200</p>
              </div>
              <IconPicker icons={ABOUT_VALUE_ICONS} value={form.icon} onChange={(icon) => update('icon', icon)} map={ICONS} />
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

              {/* Live preview — the website card */}
              <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-4">
                <span className="absolute right-3 top-1 text-[40px] font-black leading-none text-[#94d052]/20">{pad(order)}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#4D4D4D]/10 bg-[#4D4D4D]/5">
                  <PreviewIcon className="h-5 w-5 text-[#4D4D4D]" />
                </span>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7cb342]">Value {pad(order)}</p>
                <p className="text-sm font-bold uppercase tracking-wider text-[#4D4D4D]">{form.title || 'Value title'}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{form.description || 'Short description'}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => void submit()} disabled={saveValue.isPending} className={`flex-1 ${SAVE_BUTTON}`}>
                  <Save className="h-4 w-4" /> {saveValue.isPending ? 'Saving...' : editingId ? 'Update Value' : 'Add Value'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">Cancel</button>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3 border border-blue-100 bg-blue-50 p-4">
              <Info className="h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
                Active values show 4 per row in sort order and are numbered automatically (Value 01, 02, ...).
              </p>
            </div>
          </div>
        </div>

        {/* Values list */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
            <div className="border-b bg-[#233D4D] px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Gem className="h-5 w-5 text-[#DE802B]" /> Values List</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#233D4D] text-center text-xs font-bold uppercase tracking-wider text-white">
                    <th className="px-5 py-3 text-left">No.</th>
                    <th className="px-5 py-3">Icon</th>
                    <th className="px-5 py-3 text-left">Value</th>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-[#6c7587]">Loading values...</td></tr>
                  ) : values.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-[#6c7587]">No values yet — add one from the form.</td></tr>
                  ) : (
                    values.map((v, index) => {
                      const Icon = ICONS[v.icon] ?? ShieldCheck;
                      return (
                        <tr key={v._id} className={`transition-colors hover:bg-gray-50 ${editingId === v._id ? 'bg-blue-50/70' : ''}`}>
                          <td className="px-5 py-4 text-[12px] font-bold text-[#3e8914]">{pad(index + 1)}</td>
                          <td className="px-5 py-4">
                            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-[#3e8914]/10 text-[#3e8914]" title={v.icon}><Icon className="h-4 w-4" /></span>
                          </td>
                          <td className="max-w-[380px] px-5 py-4">
                            <span className="block text-[12px] font-bold uppercase tracking-tighter text-[#4B1426]">{v.title}</span>
                            {v.description && <span className="mt-0.5 block text-[11px] leading-snug text-[#6c7587]">{v.description}</span>}
                          </td>
                          <td className="px-5 py-4 text-center text-[11px] font-bold uppercase text-[#6c7587]">#{v.sortOrder}</td>
                          <td className="px-5 py-4 text-center">
                            <StatusSelect key={`${v._id}-${v.status}`} value={v.status} onChange={(s) => void changeStatus(v, s)} />
                          </td>
                          <td className="px-5 py-4"><RowActions onEdit={() => startEdit(v)} onDelete={() => void remove(v)} /></td>
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
          placeholder={{ eyebrow: 'What we stand for', heading: 'Four values, non-negotiable.' }}
          preview={(f) => (
            <div className="text-center">
              {f.eyebrow && (
                <p className="mb-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2f6b0f]">
                  <span className="h-px w-6 bg-[#3e8914]" /> {f.eyebrow} <span className="h-px w-6 bg-[#3e8914]" />
                </p>
              )}
              <p className="font-serif text-xl font-bold leading-tight text-slate-900">{f.heading || 'Heading'}</p>
            </div>
          )}
        />
      )}
    </PageFrame>
  );
}
