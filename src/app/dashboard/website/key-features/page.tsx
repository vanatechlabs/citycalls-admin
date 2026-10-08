'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import {
  Award, BadgeCheck, CheckCircle2, ChevronDown, ChevronUp, Clock, Edit, Pencil, HandCoins, Headphones, Heart, Home, IndianRupee, Leaf,
  ListChecks, PhoneCall, Plus, Save, ShieldCheck, Sparkles, Star, ThumbsUp, Timer, Trash2, Truck, Type, Users, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { usePermission } from '@/lib/hooks/useAuth';
import {
  KEY_FEATURE_ICONS, KeyFeature, KeyFeatureIcon, KeyFeaturesSectionInput,
  useDeleteKeyFeature, useKeyFeatures, useSaveKeyFeature, useSaveKeyFeaturesSection,
} from '@/lib/hooks/useKeyFeatures';

// Website Section → Why Choose Us: the heading and feature cards on
// the home and About pages. Same layout as FAQ Management.

const ICONS: Record<KeyFeatureIcon, LucideIcon> = {
  BadgeCheck, HandCoins, Timer, Home, Wrench, ShieldCheck, Clock, Star, ThumbsUp, Users,
  Sparkles, Award, Headphones, Truck, IndianRupee, Zap, Heart, CheckCircle2, PhoneCall, Leaf,
};

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || 'Please try again.';
}

const emptyForm = { title: '', description: '', icon: 'BadgeCheck' as KeyFeatureIcon };

export default function KeyFeaturesPage() {
  const { data, isLoading } = useKeyFeatures();
  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Why Choose Us</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">The &ldquo;Why choose us&rdquo; heading and cards on the home and About pages.</p>
        </div>
        {isLoading || !data ? (
          <div className="flex min-h-[40vh] items-center justify-center"><ListChecks className="h-6 w-6 animate-pulse text-gray-300" /></div>
        ) : (
          <KeyFeaturesManager section={data.section} features={data.features} />
        )}
      </div>
    </div>
  );
}

function KeyFeaturesManager({ section, features }: { section: KeyFeaturesSectionInput; features: KeyFeature[] }) {
  const canEdit = usePermission('marketing', 'edit');
  const saveSection = useSaveKeyFeaturesSection();
  const saveFeature = useSaveKeyFeature();
  const deleteFeature = useDeleteKeyFeature();

  const [heading, setHeading] = useState<KeyFeaturesSectionInput>({
    eyebrow: section.eyebrow, heading: section.heading, highlight: section.highlight, description: section.description,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const highlightMissing = !!heading.highlight && !heading.heading.includes(heading.highlight);

  async function saveHeading() {
    if (highlightMissing) {
      void Swal.fire({ icon: 'warning', title: 'Check highlight', text: 'Highlight text must be part of the heading.', confirmButtonColor: '#3e8914' });
      return;
    }
    try {
      await saveSection.mutateAsync(heading);
      void Swal.fire({ icon: 'success', title: 'Heading updated', timer: 1300, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save heading', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit() {
    if (form.title.trim().length < 2) {
      void Swal.fire({ icon: 'warning', title: 'Missing Title', text: 'Please enter the feature title.', confirmButtonColor: '#3e8914' });
      return;
    }
    try {
      const fields = { title: form.title.trim(), description: form.description.trim(), icon: form.icon };
      if (editingId) await saveFeature.mutateAsync({ id: editingId, ...fields });
      else await saveFeature.mutateAsync({ ...fields, sortOrder: features.reduce((max, f) => Math.max(max, f.sortOrder), 0) + 1 });
      void Swal.fire({ icon: 'success', title: editingId ? 'Feature updated' : 'Feature added', timer: 1300, showConfirmButton: false });
      resetForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save feature', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  function startEdit(f: KeyFeature) {
    setEditingId(f._id);
    setForm({ title: f.title, description: f.description, icon: f.icon });
  }

  // Swap places with the card above / below.
  async function move(index: number, dir: -1 | 1) {
    const a = features[index];
    const b = features[index + dir];
    if (!a || !b) return;
    try {
      await Promise.all([
        saveFeature.mutateAsync({ id: a._id, sortOrder: b.sortOrder === a.sortOrder ? a.sortOrder + dir : b.sortOrder }),
        saveFeature.mutateAsync({ id: b._id, sortOrder: a.sortOrder }),
      ]);
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not change order', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  async function toggleStatus(f: KeyFeature) {
    try {
      await saveFeature.mutateAsync({ id: f._id, status: f.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not change status', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  async function remove(f: KeyFeature) {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${f.title}" from the website?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteFeature.mutateAsync(f._id);
      if (editingId === f._id) resetForm();
      void Swal.fire({ icon: 'success', title: 'Feature deleted', timer: 1200, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not delete', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  const headingInput = (label: string, key: keyof KeyFeaturesSectionInput, textarea = false, error = false) => (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-tight text-gray-700">{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          value={heading[key]}
          disabled={!canEdit}
          onChange={(e) => setHeading((p) => ({ ...p, [key]: e.target.value }))}
          className="w-full resize-none border-2 border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#3e8914]"
        />
      ) : (
        <input
          value={heading[key]}
          disabled={!canEdit}
          onChange={(e) => setHeading((p) => ({ ...p, [key]: e.target.value }))}
          className={`w-full border-2 px-4 py-2 outline-none focus:border-[#3e8914] ${error ? 'border-red-400' : 'border-gray-300'}`}
        />
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-500">Must be part of the heading.</p>}
    </div>
  );

  const PreviewIcon = ICONS[form.icon];

  return (
    <div style={{ zoom: 0.75 }}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {/* Heading */}
          <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#3e8914]"><Type className="h-5 w-5" /> Section Heading</h2>
            <div className="space-y-4">
              {headingInput('Small Text', 'eyebrow')}
              {headingInput('Main Heading', 'heading')}
              {headingInput('Highlight Text (green)', 'highlight', false, highlightMissing)}
              {headingInput('Description', 'description', true)}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void saveHeading()}
                  disabled={saveSection.isPending}
                  className="flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> {saveSection.isPending ? 'Saving…' : 'Save Heading'}
                </button>
              )}
            </div>
          </div>

          {/* Add / edit feature */}
          {canEdit && (
            <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]">
                {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingId ? 'Edit Feature' : 'Add New Feature'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500">Title</label>
                  <input
                    value={form.title}
                    maxLength={60}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Verified technicians"
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#3e8914]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-gray-500">One-line Description</label>
                    <span className={`text-[11px] font-bold ${form.description.length > 45 ? 'text-amber-600' : 'text-gray-400'}`}>{form.description.length}/120</span>
                  </div>
                  <input
                    value={form.description}
                    maxLength={120}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Background-checked, trained, rated."
                    className="w-full border-2 border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#3e8914]"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Shown on one line — keep it under ~45 characters so it isn&apos;t cut off.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Icon</label>
                  <div className="grid grid-cols-10 gap-1.5">
                    {KEY_FEATURE_ICONS.map((name) => {
                      const Icon = ICONS[name];
                      const active = form.icon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          title={name}
                          onClick={() => setForm((p) => ({ ...p, icon: name }))}
                          className={`flex aspect-square items-center justify-center border-2 transition-colors ${active ? 'border-[#3e8914] bg-[#3e8914] text-white' : 'border-gray-200 bg-white text-[#3e8914] hover:border-[#3e8914]/50'}`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live preview — the website card */}
                <div className="flex items-center gap-3 rounded-xl bg-[#14181c] px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                    <PreviewIcon className="h-5 w-5 text-[#7cb342]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold uppercase tracking-wide text-white">{form.title || 'Feature title'}</span>
                    <span className="block truncate text-[13px] text-white/60">{form.description || 'One-line description'}</span>
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => void submit()} disabled={saveFeature.isPending} className="flex-1 bg-[#DE802B] py-2 font-bold text-white transition-colors hover:bg-[#c66d21] disabled:opacity-60">
                    {saveFeature.isPending ? 'Saving…' : editingId ? 'Update Feature' : 'Add Feature'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">Cancel</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature list */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-[#233D4D] px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><ListChecks className="h-5 w-5 text-[#DE802B]" /> Why Choose Us — Features List</h2>
              <span className="text-xs font-semibold text-slate-200">{features.filter((f) => f.status === 'ACTIVE').length} of {features.length} shown on website</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                    <th className="px-6 py-3">No.</th>
                    <th className="px-6 py-3">Icon</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {features.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No features yet. Add one using the form.</td></tr>
                  ) : (
                    features.map((f, index) => {
                      const Icon = ICONS[f.icon] ?? BadgeCheck;
                      return (
                        <tr key={f._id} className={`transition-colors hover:bg-gray-50 ${editingId === f._id ? 'bg-[#3e8914]/5' : ''}`}>
                          <td className="px-6 py-4 font-bold text-[#3e8914]">{String(index + 1).padStart(2, '0')}</td>
                          <td className="px-6 py-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#3e8914]/30 bg-[#3e8914]/10"><Icon className="h-5 w-5 text-[#3e8914]" /></span>
                          </td>
                          <td className="max-w-sm px-6 py-4">
                            <div className="truncate font-bold uppercase tracking-wide text-gray-900">{f.title}</div>
                            <div className="truncate text-sm text-gray-500">{f.description || '—'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => void toggleStatus(f)}
                              className={`rounded-[4px] border px-2 py-0.5 text-[11px] font-bold disabled:cursor-not-allowed ${f.status === 'ACTIVE' ? 'border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]' : 'border-[#fca5a5] bg-[#fee2e2] text-[#dc2626]'}`}
                              title={canEdit ? 'Click to switch' : undefined}
                            >
                              {f.status}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            {canEdit && (
                              <div className="flex items-center justify-center gap-1.5">
                                <button type="button" disabled={index === 0 || saveFeature.isPending} onClick={() => void move(index, -1)} title="Move up" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-slate-500/10 text-slate-600 backdrop-blur-md border border-slate-400/30 shadow-[0_2px_6px_rgba(71,85,105,0.12)] transition-all hover:bg-slate-500/20 hover:border-slate-400/50 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30">
                                  <ChevronUp className="h-[13px] w-[13px]" />
                                </button>
                                <button type="button" disabled={index === features.length - 1 || saveFeature.isPending} onClick={() => void move(index, 1)} title="Move down" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-slate-500/10 text-slate-600 backdrop-blur-md border border-slate-400/30 shadow-[0_2px_6px_rgba(71,85,105,0.12)] transition-all hover:bg-slate-500/20 hover:border-slate-400/50 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30">
                                  <ChevronDown className="h-[13px] w-[13px]" />
                                </button>
                                <button type="button" onClick={() => startEdit(f)} title="Edit Feature" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95">
                                  <Pencil className="h-[12px] w-[12px] text-blue-600" />
                                </button>
                                <button type="button" onClick={() => void remove(f)} title="Delete Feature" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95">
                                  <Trash2 className="h-[12px] w-[12px] text-red-600" />
                                </button>
                              </div>
                            )}
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
    </div>
  );
}
