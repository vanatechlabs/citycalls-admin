import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES } from '@/lib/registrations/constants';
import { resolveMediaUrl } from '@/lib/registrations/format';
import { FIELD_LABEL } from '../shared/styles';

export interface PendingPhoto {
  file: File;
  preview: string;
}

interface PhotoUploaderProps {
  // Already-uploaded photo URLs (editing a registration).
  existing: string[];
  onRemoveExisting: (url: string) => void;
  pending: PendingPhoto[];
  onAdd: (photos: PendingPhoto[]) => void;
  onRemovePending: (index: number) => void;
}

export function PhotoUploader({ existing, onRemoveExisting, pending, onAdd, onRemovePending }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const count = existing.length + pending.length;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const valid = picked.filter((file) => PHOTO_TYPES.includes(file.type) && file.size <= MAX_PHOTO_BYTES);
    if (valid.length < picked.length) {
      void Swal.fire({ icon: 'warning', title: 'Some files were skipped', text: 'Only JPG, PNG or WebP images up to 5 MB are allowed.' });
    }
    const room = Math.max(MAX_PHOTOS - count, 0);
    if (valid.length > room) {
      void Swal.fire({ icon: 'warning', title: `Maximum ${MAX_PHOTOS} photos`, timer: 1800, showConfirmButton: false });
    }
    onAdd(valid.slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) })));
  }

  const thumbs = [
    ...existing.map((url) => ({ key: url, src: resolveMediaUrl(url), alt: 'Uploaded photo', onRemove: () => onRemoveExisting(url) })),
    ...pending.map((p, i) => ({ key: p.preview, src: p.preview, alt: p.file.name, onRemove: () => onRemovePending(i) })),
  ];

  return (
    <div>
      <label className={FIELD_LABEL}>Upload Photos (Optional)</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#3e8914]/40 bg-[#3e8914]/[0.03] p-3 text-center transition-colors hover:bg-[#3e8914]/[0.07]"
      >
        <input ref={inputRef} type="file" multiple accept={PHOTO_TYPES.join(',')} onChange={handleChange} className="hidden" />
        <div className="flex items-center gap-2 text-[#3e8914]">
          <Upload className="h-4 w-4" />
          <span className="text-xs font-bold text-gray-800">Click to upload images</span>
        </div>
        <p className="mt-0.5 text-[10px] font-medium text-gray-400">Max {MAX_PHOTOS} images, 5 MB each — JPG, PNG or WebP ({count}/{MAX_PHOTOS})</p>
      </div>

      {thumbs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {thumbs.map((t) => (
            <div key={t.key} className="relative h-16 w-16 border-2 border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.src} alt={t.alt} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={t.onRemove}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
                aria-label="Remove photo"
              >
                <X className="h-2.5 w-2.5" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
