import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface ImportResult {
  successCount: number;
  failureCount: number;
  failures: { row: number; field: string; code: string; message: string }[];
  createdIds: string[];
  dryRun: boolean;
}

export interface ImportEntityInput {
  entity: 'customers' | 'leads';
  file: File;
  dryRun?: boolean;
  mode?: 'partial' | 'strict';
}

// POST /import/{entity} — CSV only (the backend deliberately rejects .xlsx
// for import; see citycalls-api/src/lib/exportBuilder.ts for why).
export function useImportEntity() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, AxiosError<ApiErrorEnvelope>, ImportEntityInput>({
    mutationFn: async ({ entity, file, dryRun, mode }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<ApiSuccessEnvelope<ImportResult>>(
        `/import/${entity}`,
        formData,
        { params: { dryRun, mode }, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.entity] });
    },
  });
}

export const EXPORT_ENTITIES = ['customers', 'leads', 'serviceRequests', 'calls', 'invoices'] as const;

// GET /export/{entity} returns a real file (not JSON) — triggers a browser
// download directly via the API client so the Authorization header is sent
// (a plain <a href> to the API wouldn't carry the bearer token).
export async function downloadExport(entity: string, format: 'csv' | 'xlsx'): Promise<void> {
  const res = await apiClient.get(`/export/${entity}`, { params: { format }, responseType: 'blob' });
  const disposition = res.headers['content-disposition'] as string | undefined;
  const filenameMatch = disposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] ?? `${entity}.${format}`;

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
