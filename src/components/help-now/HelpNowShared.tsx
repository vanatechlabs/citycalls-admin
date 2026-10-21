'use client';

import { useRef, useState, type ReactNode } from 'react';
import type { AxiosError } from 'axios';
import { ArrowDown, ArrowUp, Info, RotateCcw, Save, Trash2, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile, type FileCategory } from '@/lib/hooks/useFiles';
import {
  HelpNowHomeInputs, HelpNowHomeSaved, HelpNowHomeSection, HelpNowSectionStatus, useHelpNowHomeSection, useSaveHelpNowHomeSection,
} from '@/lib/hooks/useHelpNowHome';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';
import { Field } from '@/components/registrations/shared/Field';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { FIELD_INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// The default images are the Help Now website's own files (/assets/...), so
// they're previewed from that website rather than the API.
const HELP_NOW_ORIGIN = (process.env.NEXT_PUBLIC_HELPNOW_WEBSITE_URL ?? 'http://localhost:5174').replace(/\/$/, '');

export function helpNowPreviewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('/assets/')) return `${HELP_NOW_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

export function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

export const warn = (title: string, text: string) => void Swal.fire({ icon: 'warning', title, text, confirmButtonColor: '#3e8914' });

export function move<T>(list: T[], index: number, by: -1 | 1) {
  const next = [...list];
  const target = index + by;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// Up / down / remove buttons for one item of a list.
export function ItemControls({ index, count, onMove, onRemove, label }: {
  index: number;
  count: number;
  onMove: (by: -1 | 1) => void;
  onRemove?: () => void;
  label: string;
}) {
  const button = 'flex h-7 w-7 items-center justify-center border-2 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30';
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className={button} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className={button} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          aria-label={`Remove ${label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function StatusField({ value, onChange, where }: { value: HelpNowSectionStatus; onChange: (value: HelpNowSectionStatus) => void; where: string }) {
  return (
    <Field label="Status" hint={value === 'ACTIVE' ? 'Shown on the Help Now home page.' : `Hidden — the ${where} is removed from the home page.`}>
      <select value={value} onChange={(e) => onChange(e.target.value as HelpNowSectionStatus)} className={`${FIELD_INPUT} cursor-pointer`}>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>
    </Field>
  );
}

type Picked = { file: File; preview: string };

// Images picked in the form but not uploaded yet, keyed by item. They are
// uploaded together when the section is saved.
export function usePickedImages(entityId: string) {
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  const upload = useUploadFile('HELP_NOW_HOME', entityId, { skipGlobalToast: true });

  function pick(key: string, file: File) {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      warn('Invalid image', 'Use a JPG, PNG or WebP image up to 10 MB.');
      return;
    }
    setPicked((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key].preview);
      return { ...prev, [key]: { file, preview: URL.createObjectURL(file) } };
    });
  }

  function clear(key: string) {
    setPicked((prev) => {
      if (!prev[key]) return prev;
      URL.revokeObjectURL(prev[key].preview);
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function reset() {
    Object.values(picked).forEach((p) => URL.revokeObjectURL(p.preview));
    setPicked({});
  }

  // The image's saved path, or the uploaded URL when a new file was picked.
  async function resolve(key: string, current: string, category: FileCategory) {
    const file = picked[key]?.file;
    if (!file) return current;
    const uploaded = await upload.upload(file, category);
    return uploaded.url;
  }

  const previewOf = (key: string, current: string) => picked[key]?.preview ?? helpNowPreviewUrl(current);

  return { picked, pick, clear, reset, resolve, previewOf, isUploading: upload.isPending };
}

// Image upload box + preview + alt text for one image.
export function ImageField({ preview, alt, onPick, onClear, onAlt, label, altPlaceholder }: {
  preview: string;
  alt: string;
  onPick: (file: File) => void;
  onClear: () => void;
  onAlt: (value: string) => void;
  label: string;
  altPlaceholder: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr] md:items-start">
      <div className="flex items-start gap-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#3e8914]/40 bg-[#3e8914]/[0.03] text-center transition-colors hover:bg-[#3e8914]/[0.07]"
          aria-label={`Upload ${label}`}
        >
          <input
            ref={input}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onPick(file);
            }}
            className="hidden"
          />
          <Upload className="h-4 w-4 text-[#3e8914]" />
          <span className="mt-1 text-[10px] font-bold text-gray-700">{preview ? 'Change' : 'Upload'}</span>
          <span className="text-[9px] text-gray-400">JPG / PNG / WebP</span>
        </div>
        {preview && (
          <div className="relative border-2 border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={alt || label} className="h-24 w-32 object-cover" />
            <button
              type="button"
              onClick={onClear}
              className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
              aria-label={`Remove ${label}`}
            >
              <X className="h-2.5 w-2.5" strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
      <Field label="Image Alt Text" className="min-w-0" hint="Describes the image for Google and screen readers.">
        <input value={alt} maxLength={200} onChange={(e) => onAlt(e.target.value)} placeholder={altPlaceholder} className={FIELD_INPUT} />
      </Field>
    </div>
  );
}

export function SaveBar({ saving, onUndo, label }: { saving: boolean; onUndo: () => void; label: string }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onUndo} disabled={saving} className={SECONDARY_BUTTON}>
        <RotateCcw className="h-3.5 w-3.5" /> Undo Changes
      </button>
      <button type="submit" disabled={saving} className={`${PRIMARY_BUTTON} flex-1`}>
        {saving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
        {saving ? 'Saving...' : label}
      </button>
    </div>
  );
}

export async function saveSection<K extends HelpNowHomeSection>(
  save: ReturnType<typeof useSaveHelpNowHomeSection<K>>,
  input: HelpNowHomeInputs[K],
  what: string
) {
  try {
    await save.mutateAsync(input);
    void Swal.fire({ icon: 'success', title: 'Updated!', text: `${what} saved successfully`, confirmButtonColor: '#3e8914', timer: 1500, showConfirmButton: false });
    return true;
  } catch (error) {
    void Swal.fire({ icon: 'error', title: `Could not save ${what}`, text: errorMessage(error), confirmButtonColor: '#3e8914' });
    return false;
  }
}

// Loads a section and renders its form, keyed by updatedAt so a save
// remounts the form with fresh state.
export function HelpNowSectionPage<K extends HelpNowHomeSection>({ section, title, description, children }: {
  section: K;
  title: string;
  description: ReactNode;
  children: (saved: HelpNowHomeSaved<K>) => ReactNode;
}) {
  const { data, isLoading, isError } = useHelpNowHomeSection(section);

  let body;
  if (isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><Info className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (isError || !data) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Could not load this section.</div>;
  } else {
    body = <div key={data.updatedAt}>{children(data)}</div>;
  }

  return (
    <PageShell
      title={title}
      description={
        <>
          {description}
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
