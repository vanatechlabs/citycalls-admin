'use client';

import { useState, type ReactNode } from 'react';
import type { AxiosError } from 'axios';
import { Edit, Heading, Image as ImageIcon, Save, Trash2, type LucideIcon } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import type { AboutListHeading, AboutListHeadingInput, AboutStatus } from '@/lib/hooks/useAboutPage';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';

// Shared pieces for the Website Section → About Page screens, in the same
// look as Home Page → Our Services / Popular Packages.

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Default images are the website's own files (/assets/...).
const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export const LABEL = 'mb-1 block text-xs font-bold uppercase text-gray-500';
export const INPUT = 'w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]';
export const CARD = 'border-2 border-gray-200 bg-white p-6 shadow-sm';
export const CARD_TITLE = 'mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]';
export const SAVE_BUTTON =
  'flex w-full items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60';
const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-[6px] backdrop-blur-md border transition-all hover:scale-105 active:scale-95';

export const pad = (n: number) => String(n).padStart(2, '0');

export function previewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

export function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

export function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false });
}

// Checks a picked image; returns the file when it's usable.
export function pickImage(e: React.ChangeEvent<HTMLInputElement>): File | null {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return null;
  if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
    showToast('warning', 'Use a JPG, PNG or WebP image up to 10 MB');
    return null;
  }
  return file;
}

export function PageFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">{title}</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">{description}</p>
        </div>
        <div style={{ zoom: 0.75 }}>{children}</div>
      </div>
    </div>
  );
}

// Thumbnail + file input + hint.
export function ImageField({
  label = 'Image', preview, onFile, hint = 'Uploads to Cloudinary — JPG, PNG, or WebP, up to 10 MB.', wide = false,
}: { label?: string; preview: string | null; onFile: (file: File) => void; hint?: string; wide?: boolean }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex items-center gap-3">
        <div className={`flex ${wide ? 'h-14 w-24' : 'h-14 w-20'} shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50`}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          type="file"
          accept={IMAGE_TYPES.join(',')}
          onChange={(e) => {
            const file = pickImage(e);
            if (file) onFile(file);
          }}
          className="min-w-0 flex-1 border-2 border-gray-300 px-3 py-2 text-xs font-semibold outline-none focus:border-[#134698]"
        />
      </div>
      <p className="mt-1 text-[10px] text-gray-400">{hint}</p>
    </div>
  );
}

export function IconPicker<T extends string>({
  icons, value, onChange, map,
}: { icons: readonly T[]; value: T; onChange: (icon: T) => void; map: Record<T, LucideIcon> }) {
  return (
    <div>
      <label className={LABEL}>Icon</label>
      <div className="grid grid-cols-6 gap-1.5">
        {icons.map((name) => {
          const Icon: LucideIcon = map[name];
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={`flex aspect-square items-center justify-center border-2 transition-colors ${active ? 'border-[#3e8914] bg-[#3e8914] text-white' : 'border-gray-200 bg-white text-[#3e8914] hover:border-[#3e8914]/50'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatusSelect({ value, onChange }: { value: AboutStatus; onChange: (status: AboutStatus) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AboutStatus)}
      className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
        value === 'ACTIVE' ? 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]' : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      }}
    >
      <option value="ACTIVE" className="bg-white font-bold text-[#23714a]">Active</option>
      <option value="INACTIVE" className="bg-white font-bold text-[#dc2626]">Inactive</option>
    </select>
  );
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-center gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        title="Edit"
        className={`${ICON_BUTTON} bg-blue-500/10 text-blue-600 border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] hover:bg-blue-500/20 hover:border-blue-400/50`}
      >
        <Edit className="h-4 w-4 text-blue-600" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete"
        className={`${ICON_BUTTON} bg-red-500/10 text-red-600 border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] hover:bg-red-500/20 hover:border-red-400/50`}
      >
        <Trash2 className="h-4 w-4 text-red-600" />
      </button>
    </div>
  );
}

export function LastSaved({ data }: { data?: { updatedBy?: { name: string }; updatedAt?: string } }) {
  if (!data?.updatedBy || !data.updatedAt) return null;
  return (
    <p className="mt-4 text-[10px] font-medium text-gray-400">
      Last saved by <strong className="text-[#4B1426]">{data.updatedBy.name}</strong>, {formatDate(data.updatedAt)}, {formatTime(data.updatedAt)}
    </p>
  );
}

// Heading text with the highlighted part in green.
export function Highlighted({ text, highlight }: { text: string; highlight: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="text-[#3e8914] underline decoration-2 underline-offset-4">{highlight}</span>
      {text.slice(at + highlight.length)}
    </>
  );
}

export async function confirmDelete(title: string, text: string) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete it',
  });
  return result.isConfirmed;
}

// Eyebrow + heading form above a list (values, journey); keyed by updatedAt
// by the caller so a save reloads it.
export function ListHeadingCard({
  section, onSave, saving, placeholder, preview,
}: {
  section: AboutListHeading;
  onSave: (input: AboutListHeadingInput) => Promise<unknown>;
  saving: boolean;
  placeholder: AboutListHeadingInput;
  preview: (form: AboutListHeadingInput) => ReactNode;
}) {
  const [form, setForm] = useState<AboutListHeadingInput>({ eyebrow: section.eyebrow ?? '', heading: section.heading ?? '' });

  async function save() {
    if (!form.heading.trim()) return showToast('warning', 'Heading is required');
    try {
      await onSave(form);
      showToast('success', 'Section heading saved');
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save heading', text: errorMessage(error) });
    }
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className={`${CARD} lg:col-span-2`}>
        <h2 className={CARD_TITLE}><Heading className="h-5 w-5" /> Section Heading</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Eyebrow</label>
            <input value={form.eyebrow} maxLength={60} onChange={(e) => setForm((p) => ({ ...p, eyebrow: e.target.value }))} placeholder={placeholder.eyebrow} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Heading *</label>
            <input value={form.heading} maxLength={140} onChange={(e) => setForm((p) => ({ ...p, heading: e.target.value }))} placeholder={placeholder.heading} className={INPUT} />
          </div>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving} className={`mt-5 ${SAVE_BUTTON}`}>
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Heading'}
        </button>
      </div>
      <div className="border-2 border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h2 className={CARD_TITLE}>Heading Preview</h2>
        {preview(form)}
        <LastSaved data={section} />
      </div>
    </div>
  );
}
