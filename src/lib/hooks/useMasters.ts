import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface Master {
  _id: string;
  masterType: string;
  key: string;
  label: string;
  active: boolean;
  sortOrder?: number;
  parentId?: string;
  meta?: Record<string, unknown>;
}

export function useMasters(types: string[]) {
  return useQuery({
    queryKey: ['masters', types],
    queryFn: async () => {
      const responses = await Promise.all(
        types.map((type) => apiClient.get<ApiSuccessEnvelope<Master[]>>(`/masters/${type}`, { params: { limit: 100 } }))
      );
      return responses.flatMap((res) => res.data.data);
    },
    enabled: types.length > 0,
  });
}

export interface CreateMasterInput {
  masterType: string;
  key: string;
  label: string;
  parentId?: string;
  sortOrder?: number;
  meta?: Record<string, unknown>;
}

export function useCreateMaster() {
  const queryClient = useQueryClient();
  return useMutation<Master, AxiosError<ApiErrorEnvelope>, CreateMasterInput>({
    mutationFn: async ({ masterType, ...input }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Master>>(`/masters/${masterType}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['masters'] }),
  });
}

export interface UpdateMasterInput {
  masterType: string;
  id: string;
  label?: string;
  parentId?: string;
  sortOrder?: number;
  active?: boolean;
  meta?: Record<string, unknown>;
}

export function useUpdateMaster() {
  const queryClient = useQueryClient();
  return useMutation<Master, AxiosError<ApiErrorEnvelope>, UpdateMasterInput>({
    mutationFn: async ({ masterType, id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Master>>(`/masters/${masterType}/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['masters'] }),
  });
}

export function useDeleteMaster() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, { masterType: string; id: string }>({
    mutationFn: async ({ masterType, id }) => {
      await apiClient.delete(`/masters/${masterType}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masters'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
}
