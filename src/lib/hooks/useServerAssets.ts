import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/server-assets';

// Admin Section → Server Management: domains, hosting, SSL… and when they expire.
export const SERVER_ASSET_TYPES = ['DOMAIN', 'HOSTING', 'SSL', 'OTHER'] as const;
export type ServerAssetType = (typeof SERVER_ASSET_TYPES)[number];

export interface ServerAssetInput {
  type: ServerAssetType;
  name: string;
  provider: string;
  // YYYY-MM-DD in forms; ISO strings from the API.
  purchasedOn?: string;
  expiresOn: string;
  reminderDays: number;
  autoRenew: boolean;
  cost?: number;
  notes?: string;
}

export interface ServerAsset extends ServerAssetInput {
  _id: string;
  updatedBy?: { userId?: string; name: string };
  updatedAt: string;
}

const QUERY_KEY = ['server-assets'];

export function useServerAssets(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServerAsset[]>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
    // Expiry counters only need fresh data now and then.
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useCreateServerAsset() {
  const invalidate = useInvalidate();
  return useMutation<ServerAsset, AxiosError<ApiErrorEnvelope>, ServerAssetInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<ServerAsset>>(BASE_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateServerAsset() {
  const invalidate = useInvalidate();
  return useMutation<ServerAsset, AxiosError<ApiErrorEnvelope>, { id: string } & Partial<ServerAssetInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<ServerAsset>>(`${BASE_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteServerAsset() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}
