'use client';

import { useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  Award, Clock, Hash, House, Image as ImageIcon, LayoutGrid, MapPin, Plus, RotateCcw, Save, ShieldCheck, Star, ThumbsUp,
  Timer, Trash2, Upload, Users, Wrench, X, type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  COUNTER_ICONS, CounterIcon, CounterItem, CountersStatus, HomeCounters, HomeCountersInput, MAX_COUNTERS,
  useHomeCounters, useSaveHomeCounters,
} from '@/lib/hooks/useHomeCounters';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Default images are the website's own files (/assets/...).
const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

// Same icons the website draws on each card.
const ICONS: Record<CounterIcon, { icon: LucideIcon; label: string }> = {
  users: { icon: Users, label: 'People' },
  'shield-check': { icon: ShieldCheck, label: 'Shield' },
  timer: { icon: Timer, label: 'Timer' },
  star: { icon: Star, label: 'Star' },
  award: { icon: Award, label: 'Award' },
  'thumbs-up': { icon: ThumbsUp, label: 'Thumbs up' },
  wrench: { icon: Wrench, label: 'Wrench' },
  house: { icon: House, label: 'Home' },
  clock: { icon: Clock, label: 'Clock' },
  'map-pin': { icon: MapPin, label: 'Location' },
};

function previewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

// 10000 → "10,000"; 4.8 stays "4.8".
const formatValue = (value: number) => (Number.isInteger(value) ? value.toLocaleString('en-IN') : String(value));

type Picked = { file: File; preview: string } | null;
const emptyCounter: CounterItem = { value: 0, suffix: '+', label: '', icon: 'users', image: '', imageAlt: '' };

// Keyed by updatedAt, so a save remounts it with fresh state.
function CountersForm({ existing }: { existing: HomeCounters }) {
  const initialForm: HomeCountersInput = { items: existing.items.map((i) => ({ ...i })), status: existing.status ?? 'ACTIVE' };
  const [form, setForm] = useState<HomeCountersInput>(initialForm);
  const [picked, setPicked] = useState<Picked[]>(initialForm.items.map(() => null));
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);
  const saveCounters = useSaveHomeCounters();
  const imageUpload = useUploadFile('HOME_COUNTERS', existing._id, { skipGlobalToast: true });
  const isSaving = saveCounters.isPending || imageUpload.isPending;

  const imagePreview = (i: number) => picked[i]?.preview ?? previewUrl(form.items[i]?.image ?? '');

  function updateItem(index: number, patch: Partial<CounterItem>) {
    setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  }

  function setPickedAt(index: number, value: Picked) {
    setPicked((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]!.preview);
      return prev.map((p, i) => (i === index ? value : p));
    });
  }

  function handleImagePick(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG or WebP image up to 10 MB.' });
      return;
    }
    setPickedAt(index, { file, preview: URL.createObjectURL(file) });
  }

  function addCounter() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyCounter }] }));
    setPicked((prev) => [...prev, null]);
  }

  function removeCounter(index: number) {
    if (picked[index]) URL.revokeObjectURL(picked[index]!.preview);
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    setPicked((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    picked.forEach((p) => p && URL.revokeObjectURL(p.preview));
    setPicked(initialForm.items.map(() => null));
    setForm(initialForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const warn = (title: string, text: string) => void Swal.fire({ icon: 'warning', title, text, confirmButtonColor: '#3e8914' });
    if (form.items.length === 0) return warn('No counters', 'Add at least one counter.');
    if (form.items.some((item) => !item.label.trim())) return warn('Check Counters', 'Every counter needs a label.');
    if (form.items.some((item) => !(item.value >= 0))) return warn('Check Counters', 'Every counter needs a number (0 or more).');

    try {
      // Upload newly picked images first, then save everything in one go.
      const items = await Promise.all(
        form.items.map(async (item, i) => {
          const file = picked[i]?.file;
          if (!file) return item;
          const uploaded = await imageUpload.upload(file, 'WEBSITE_COUNTER_IMAGE');
          return { ...item, image: uploaded.url };
        })
      );
      await saveCounters.mutateAsync({ ...form, items });
      picked.forEach((p) => p && URL.revokeObjectURL(p.preview));
      void Swal.fire({ icon: 'success', title: 'Updated!', text: 'Counters saved successfully', timer: 1500, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save counters', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={Hash} title="Counter Cards" hint={`Up to ${MAX_COUNTERS} cards. The number counts up from 0 when the section comes into view.`}>
          <div className="space-y-4">
            {form.items.map((item, index) => {
              const Icon = ICONS[item.icon]?.icon ?? Users;
              const preview = imagePreview(index);
              return (
                <div key={index} className="min-w-0 border-2 border-gray-200 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-gray-200 text-[11px] font-bold text-gray-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#3e8914]/30 bg-[#3e8914]/5 text-[#3e8914]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-700">
                      {formatValue(item.value)}{item.suffix} {item.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCounter(index)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label={`Remove counter ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Field label="Number" required className="min-w-0">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.value}
                        onChange={(e) => updateItem(index, { value: Number(e.target.value) })}
                        className={FIELD_INPUT}
                      />
                    </Field>
                    <Field label="After Number" className="min-w-0" hint='e.g. "+", "%", " min", "★"'>
                      <input value={item.suffix} maxLength={10} onChange={(e) => updateItem(index, { suffix: e.target.value })} placeholder="+" className={FIELD_INPUT} />
                    </Field>
                    <Field label="Label" required className="min-w-0">
                      <input value={item.label} maxLength={60} onChange={(e) => updateItem(index, { label: e.target.value })} placeholder="Happy Customers" className={FIELD_INPUT} />
                    </Field>
                    <Field label="Icon" className="min-w-0">
                      <select value={item.icon} onChange={(e) => updateItem(index, { icon: e.target.value as CounterIcon })} className={`${FIELD_INPUT} cursor-pointer`}>
                        {COUNTER_ICONS.map((key) => <option key={key} value={key}>{ICONS[key].label}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr] md:items-start">
                    <div className="flex items-start gap-2">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputs.current[index]?.click()}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputs.current[index]?.click()}
                        className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#3e8914]/40 bg-[#3e8914]/[0.03] text-center transition-colors hover:bg-[#3e8914]/[0.07]"
                      >
                        <input
                          ref={(el) => { fileInputs.current[index] = el; }}
                          type="file"
                          accept={IMAGE_TYPES.join(',')}
                          onChange={(e) => handleImagePick(index, e)}
                          className="hidden"
                        />
                        <Upload className="h-4 w-4 text-[#3e8914]" />
                        <span className="mt-1 text-[10px] font-bold text-gray-700">{preview ? 'Change Image' : 'Upload Image'}</span>
                      </div>
                      {preview && (
                        <div className="relative border-2 border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preview} alt={item.imageAlt || item.label} className="h-20 w-28 object-cover" />
                          <button
                            type="button"
                            onClick={() => { setPickedAt(index, null); updateItem(index, { image: '' }); }}
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
                            aria-label="Remove image"
                          >
                            <X className="h-2.5 w-2.5" strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                    <Field label="Image Alt Text" className="min-w-0" hint="Describes the background image for Google and screen readers.">
                      <input
                        value={item.imageAlt}
                        maxLength={200}
                        onChange={(e) => updateItem(index, { imageAlt: e.target.value })}
                        placeholder="e.g. CityCalls technician repairing a refrigerator"
                        className={FIELD_INPUT}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
            {form.items.length < MAX_COUNTERS && (
              <button
                type="button"
                onClick={addCounter}
                className="flex items-center gap-1.5 border-2 border-dashed border-[#3e8914]/40 px-3 py-1.5 text-[11px] font-bold text-[#3e8914] hover:bg-[#3e8914]/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Counter
              </button>
            )}
          </div>
        </FormCard>

        <FormCard icon={ImageIcon} title="Status" hint="Inactive hides the whole counters section on the home page.">
          <Field label="Status" className="md:w-1/3">
            <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as CountersStatus }))} className={`${FIELD_INPUT} cursor-pointer`}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><LayoutGrid className="h-4 w-4" /> Live Preview</h2>
            <div className={`grid grid-cols-2 gap-2 ${form.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
              {form.items.map((item, i) => {
                const Icon = ICONS[item.icon]?.icon ?? Users;
                const preview = imagePreview(i);
                return (
                  <div key={i} className="relative h-24 overflow-hidden rounded-lg bg-slate-700">
                    {preview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/45" />
                    <div className="relative flex h-full flex-col justify-between p-2 text-white">
                      <Icon className="h-3.5 w-3.5" />
                      <div>
                        <p className="text-[15px] font-semibold leading-none">
                          {formatValue(item.value)}<span className="text-[10px] text-[#9ad35a]">{item.suffix}</span>
                        </p>
                        <p className="mt-1 truncate text-[7px] font-semibold uppercase tracking-wider text-white/90">{item.label || 'Label'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] font-medium text-gray-400">
              {form.status === 'ACTIVE' ? 'Shown on the home page, below Our Services.' : 'Inactive — hidden from the home page.'}
            </p>
          </section>

          <div className="flex gap-2">
            <button type="button" onClick={resetForm} disabled={isSaving} className={SECONDARY_BUTTON}>
              <RotateCcw className="h-3.5 w-3.5" /> Undo Changes
            </button>
            <button type="submit" disabled={isSaving} className={`${PRIMARY_BUTTON} flex-1`}>
              {isSaving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
              {isSaving ? 'Saving...' : 'Save Counters'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function CountersPage() {
  const { data, isLoading, isError } = useHomeCounters();

  let body;
  if (isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><Hash className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (isError || !data) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Could not load the counters.</div>;
  } else {
    body = <CountersForm key={data.updatedAt} existing={data} />;
  }

  return (
    <PageShell
      title="Counters"
      description={
        <>
          Edit the home page&apos;s number cards — value, label, icon and background image.
          {data?.updatedBy && (
            <> Last updated by <strong className="text-[#4B1426]">{data.updatedBy.name}</strong>, {formatDate(data.updatedAt)}, {formatTime(data.updatedAt)}.</>
          )}
        </>
      }
    >
      {body}
    </PageShell>
  );
}
