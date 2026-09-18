import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';
import axios from 'axios';

export const FILE_CATEGORIES = [
  'ISSUE_IMAGE', 'PRODUCT_IMAGE', 'BEFORE_SERVICE_IMAGE', 'AFTER_SERVICE_IMAGE', 'PART_IMAGE',
  'VENDOR_DOCUMENT', 'EMPLOYEE_DOCUMENT', 'INVOICE_ATTACHMENT', 'RECORDING', 'VIDEO',
  'SIGNATURE', 'PROFILE_IMAGE', 'CATALOG_IMAGE', 'MARKETING_MEDIA',
] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export interface UploadedFile {
  _id: string;
  category: FileCategory;
  entityType: string;
  entityId: string;
  provider: 'CLOUDINARY' | 'LOCAL';
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');

export function resolveFileUrl(file: UploadedFile): string {
  if (file.provider !== 'LOCAL') return file.url;
  
  let origin = API_ORIGIN;
  // If the env variable was a relative path like '/api/v1', origin becomes empty
  if (!origin || origin.startsWith('/')) {
    origin = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
      ? window.location.origin 
      : 'http://localhost:4000';
  }
  return `${origin}${file.url}`;
}

export function useFileList(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['files', entityType, entityId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<UploadedFile[]>>('/files', { params: { entityType, entityId } });
      return res.data.data;
    },
    enabled: !!entityType && !!entityId,
  });
}

type SignedUploadResult =
  | { mode: 'LOCAL'; uploadUrl: string }
  | { mode: 'CLOUDINARY'; timestamp: number; signature: string; apiKey: string; cloudName: string; folder: string };

function useRequestSignedUpload() {
  return useMutation<SignedUploadResult, AxiosError<ApiErrorEnvelope>, { category: FileCategory; entityType: string; entityId: string }>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<SignedUploadResult>>('/files/signed-upload', input);
      return res.data.data;
    },
  });
}

interface ConfirmUploadInput {
  category: FileCategory;
  entityType: string;
  entityId: string;
  publicId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

function useConfirmUpload() {
  return useMutation<UploadedFile, AxiosError<ApiErrorEnvelope>, ConfirmUploadInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<UploadedFile>>('/files/confirm', input);
      return res.data.data;
    },
  });
}

interface DirectUploadInput {
  category: FileCategory;
  entityType: string;
  entityId: string;
  file: File;
}

function useDirectUpload() {
  return useMutation<UploadedFile, AxiosError<ApiErrorEnvelope>, DirectUploadInput>({
    mutationFn: async ({ file, ...fields }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('category', fields.category);
      form.append('entityType', fields.entityType);
      form.append('entityId', fields.entityId);
      const res = await apiClient.post<ApiSuccessEnvelope<UploadedFile>>('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, { id: string; entityType: string; entityId: string }>({
    mutationFn: async ({ id }) => {
      await apiClient.delete(`/files/${id}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.entityType, variables.entityId] });
    },
  });
}
export function useUploadFile(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  const requestSignedUpload = useRequestSignedUpload();
  const confirmUpload = useConfirmUpload();
  const directUpload = useDirectUpload();

  const isPending = requestSignedUpload.isPending || confirmUpload.isPending || directUpload.isPending;

  const upload = async (file: File, category: FileCategory, targetEntityId = entityId): Promise<UploadedFile> => {
    const signed = await requestSignedUpload.mutateAsync({ category, entityType, entityId: targetEntityId });

    let result: UploadedFile;
    if (signed.mode === 'CLOUDINARY') {
      const form = new FormData();
      form.append('file', file);
      form.append('timestamp', String(signed.timestamp));
      form.append('signature', signed.signature);
      form.append('api_key', signed.apiKey);
      form.append('folder', signed.folder);

      const cloudinaryRes = await axios.post(`https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`, form);

      result = await confirmUpload.mutateAsync({
        category,
        entityType,
        entityId: targetEntityId,
        publicId: cloudinaryRes.data.public_id,
        url: cloudinaryRes.data.secure_url,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    } else {
      result = await directUpload.mutateAsync({ category, entityType, entityId: targetEntityId, file });
    }

    queryClient.invalidateQueries({ queryKey: ['files', entityType, targetEntityId] });
    return result;
  };

  return { upload, isPending };
}
