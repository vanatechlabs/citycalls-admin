import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface CatalogService {
  _id: string;
  name: string;
  description?: string;
  categoryId?: string;
  complaintTypeIds?: string[];
  symptomIds?: string[];
  defectIds?: string[];
  solutionTypeIds?: string[];
  pricing?: { basePrice: number; visitingCharge: number; inspectionCharge: number; emergencyCharge: number };
  expectedDurationMinutes?: number;
  warrantyPeriodDays?: number;
  slaMinutes?: number;
  active: boolean;
}

export interface CatalogServicesQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  active?: boolean;
  vertical?: string;
}

export interface CatalogServicesPagedResult {
  services: CatalogService[];
  meta: { page: number; limit: number; total: number; totalPages: number } | null;
}

export function useCatalogServices(params?: CatalogServicesQueryParams) {
  return useQuery({
    queryKey: ['catalogServices', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CatalogService[]>>('/services', { params: { limit: 100, ...params } });
      return res.data.data;
    },
  });
}

export function useCatalogServicesPaged(params: CatalogServicesQueryParams) {
  return useQuery({
    queryKey: ['catalogServices', 'paged', params],
    queryFn: async (): Promise<CatalogServicesPagedResult> => {
      const res = await apiClient.get<ApiSuccessEnvelope<CatalogService[]>>('/services', { params });
      return {
        services: res.data.data,
        meta: res.data.meta,
      };
    },
  });
}

export function useCatalogService(id: string) {
  return useQuery({
    queryKey: ['catalogService', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CatalogService>>(`/services/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export interface CreateCatalogServiceInput {
  name: string;
  description?: string;
  categoryId: string;
  complaintTypeIds?: string[];
  symptomIds?: string[];
  defectIds?: string[];
  solutionTypeIds?: string[];
  pricing?: { basePrice?: number; visitingCharge?: number; inspectionCharge?: number; emergencyCharge?: number };
  expectedDurationMinutes?: number;
  warrantyPeriodDays?: number;
  active?: boolean;
}

export function useCreateCatalogService() {
  const queryClient = useQueryClient();
  return useMutation<CatalogService, AxiosError<ApiErrorEnvelope>, CreateCatalogServiceInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<CatalogService>>('/services', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogServices'] }),
  });
}

export function useUpdateCatalogService(id: string) {
  const queryClient = useQueryClient();
  return useMutation<CatalogService, AxiosError<ApiErrorEnvelope>, Partial<CreateCatalogServiceInput>>({
    mutationFn: async (input) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<CatalogService>>(`/services/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogService', id] });
      queryClient.invalidateQueries({ queryKey: ['catalogServices'] });
    },
  });
}

export function useDeleteCatalogService() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/services/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogServices'] }),
  });
}
