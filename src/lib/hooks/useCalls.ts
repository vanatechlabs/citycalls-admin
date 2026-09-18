import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export const CALL_TYPES = ['INITIAL', 'REQUIREMENT', 'PRE_SERVICE', 'VISIT_UPDATE', 'POST_SERVICE_FOLLOWUP', 'HAPPY_CALL'] as const;
export const CALL_DIRECTIONS = ['INCOMING', 'OUTGOING'] as const;
export type CallType = (typeof CALL_TYPES)[number];
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export interface Call {
  _id: string;
  number: string;
  callType: (typeof CALL_TYPES)[number];
  direction: (typeof CALL_DIRECTIONS)[number];
  customerId?: string;
  customerName?: string;
  relatedLeadId?: string;
  callerNumber: string;
  callDate: string;
  callTime: string;
  priority: string;
  notes?: string;
  outcome?: string;
  recordingUrl?: string;
  createdAt: string;
}

export function useCalls(params?: { q?: string }) {
  return useQuery({
    queryKey: ['calls', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Call[]>>('/calls', { params: { limit: 100, ...params } });
      return res.data.data;
    },
  });
}

export function useCallsCount(params?: { direction?: (typeof CALL_DIRECTIONS)[number] }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['calls', 'count', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Call[]>>('/calls', { params: { ...params, limit: 1 } });
      return res.data.meta?.total ?? 0;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: ['call', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Call>>(`/calls/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export interface CreateCallInput {
  callType: (typeof CALL_TYPES)[number];
  direction: (typeof CALL_DIRECTIONS)[number];
  customerId?: string;
  callerNumber: string;
  customerName?: string;
  callDate: string;
  callTime: string;
  priority?: string;
  notes?: string;
  details?: Record<string, unknown>;
}

export function useCreateCall() {
  const queryClient = useQueryClient();
  return useMutation<Call, AxiosError<ApiErrorEnvelope>, CreateCallInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Call>>('/calls', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calls'] }),
  });
}

export interface UpdateCallInput {
  id: string;
  outcome?: string;
  notes?: string;
  assignedTo?: string;
}

export function useUpdateCall() {
  const queryClient = useQueryClient();
  return useMutation<Call, AxiosError<ApiErrorEnvelope>, UpdateCallInput>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Call>>(`/calls/${id}`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['call', variables.id] });
    },
  });
}

export function useDeleteCall() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/calls/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
  });
}
