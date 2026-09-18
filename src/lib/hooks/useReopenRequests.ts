import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

export interface ReopenRequest {
  id: string;
  originalServiceRequestId: string;
  requestNumber?: string;
  customerName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reopenedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  newServiceRequestId?: string;
}

export function useReopenRequests(options?: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; enabled?: boolean }) {
  return useQuery({
    queryKey: ['reopenRequests', options?.status ?? 'ALL'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ReopenRequest[]>>('/reopen-requests', {
        params: { limit: 100, ...(options?.status ? { status: options.status } : {}) },
      });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}
export function useApproveReopenRequest() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<unknown>>(`/reopen-requests/${id}/approve`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reopenRequests'] });
    },
  });
}

export function useRejectReopenRequest() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<unknown>>(`/reopen-requests/${id}/reject`, { reason });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reopenRequests'] });
    },
  });
}
