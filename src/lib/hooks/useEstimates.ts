import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface LineItem {
  description: string;
  partId?: string;
  qty: number;
  unitPrice: number;
  taxRateId?: string;
}

export interface Estimate {
  _id: string;
  number: string;
  serviceRequestId?: string;
  customerId: string;
  branchId: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'DRAFT' | 'SHARED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  createdAt: string;
}

export function useEstimates(serviceRequestId?: string) {
  return useQuery({
    queryKey: ['estimates', { serviceRequestId }],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Estimate[]>>('/estimates', { params: { limit: 100, serviceRequestId } });
      return res.data.data;
    },
  });
}

export interface CreateEstimateInput {
  customerId: string;
  branchId: string;
  serviceRequestId?: string;
  items: LineItem[];
  discount?: number;
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();
  return useMutation<Estimate, AxiosError<ApiErrorEnvelope>, CreateEstimateInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Estimate>>('/estimates', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estimates'] }),
  });
}

export function useShareEstimate() {
  const queryClient = useQueryClient();
  return useMutation<Estimate, AxiosError<ApiErrorEnvelope>, { id: string; channels: string[] }>({
    mutationFn: async ({ id, channels }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Estimate>>(`/estimates/${id}/share`, { channels });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estimates'] }),
  });
}

export function useApproveEstimate() {
  const queryClient = useQueryClient();
  return useMutation<Estimate, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Estimate>>(`/estimates/${id}/approve`);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estimates'] }),
  });
}

export function useRejectEstimate() {
  const queryClient = useQueryClient();
  return useMutation<Estimate, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Estimate>>(`/estimates/${id}/reject`);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estimates'] }),
  });
}

export function useConvertEstimate() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.post(`/estimates/${id}/convert`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estimates'] }),
  });
}
