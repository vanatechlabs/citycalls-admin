'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImagePlus, Video, Trash2, Loader2 } from 'lucide-react';
import { useFileList, useUploadFile, useDeleteFile, resolveFileUrl } from '@/lib/hooks/useFiles';

interface MediaGalleryProps {
  entityType: string;
  entityId: string;
  title?: string;
}

// Reusable image+video attachment gallery for any entity (Catalog Service,
// Brand, ...) — built on the existing generic Files/Cloudinary infra
// (citycalls-api/src/modules/files), not new upload plumbing.
export function MediaGallery({ entityType, entityId, title = 'Media' }: MediaGalleryProps) {
  const { data: files, isLoading } = useFileList(entityType, entityId);
  const { upload, isPending } = useUploadFile(entityType, entityId);
  const deleteFile = useDeleteFile();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null, category: 'CATALOG_IMAGE' | 'VIDEO') => {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      await upload(file, category);
    }
  };

  const media = files ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Photos and videos shown to customers — multiple of each allowed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { void handleFiles(e.target.files, 'CATALOG_IMAGE'); e.target.value = ''; }}
          />
          <Button type="button" variant="outline" size="sm" className="gap-2" disabled={isPending} onClick={() => imageInputRef.current?.click()}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Add Images
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4"
            multiple
            className="hidden"
            onChange={(e) => { void handleFiles(e.target.files, 'VIDEO'); e.target.value = ''; }}
          />
          <Button type="button" variant="outline" size="sm" className="gap-2" disabled={isPending} onClick={() => videoInputRef.current?.click()}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} Add Videos
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading media...</p>
        ) : media.length === 0 ? (
          <p className="text-sm text-muted-foreground">No images or videos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {media.map((f) => (
              <div key={f._id} className="relative group rounded-md overflow-hidden border aspect-square bg-muted">
                {f.category === 'VIDEO' ? (
                  <video src={resolveFileUrl(f)} className="w-full h-full object-cover" muted />
                ) : (
                  <Image src={resolveFileUrl(f)} alt="" fill sizes="(max-width: 768px) 25vw, 160px" className="object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this file?')) deleteFile.mutate({ id: f._id, entityType, entityId });
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
