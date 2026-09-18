import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface HappyCall {
  _id: string;
  serviceRequestId: string | { _id: string; number: string } | null;
  assignedTo: string | { _id: string; name: string } | null;
  status: 'PENDING' | 'COMPLETED' | 'UNREACHABLE' | 'RESCHEDULED';
  outcome?: string;
  customerSatisfaction?: number;
  remarks?: string;
  retryCount: number;
  createdAt: string;
}

// serviceRequestId/assignedTo can resolve to null if the referenced document
// was deleted after this HappyCall was created — populate() returns null for
// a dangling ref rather than throwing, so this must handle that, not just the
// populated-vs-unpopulated (object vs string ID) shape.
export function serviceRequestNumber(hc: HappyCall): string {
  if (!hc.serviceRequestId) return 'Unknown';
  return typeof hc.serviceRequestId === 'string' ? hc.serviceRequestId : hc.serviceRequestId.number;
}

export function assignedToName(hc: HappyCall): string {
  if (!hc.assignedTo) return 'Unassigned';
  return typeof hc.assignedTo === 'string' ? hc.assignedTo : hc.assignedTo.name;
}

export function useHappyCalls(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['happyCalls'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<HappyCall[]>>('/happy-calls', { params: { limit: 100 } });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useHappyCall(id: string) {
  return useQuery({
    queryKey: ['happyCall', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<HappyCall>>(`/happy-calls/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export interface RecordHappyCallOutcomeInput {
  status: 'COMPLETED' | 'UNREACHABLE' | 'RESCHEDULED';
  outcome?: string;
  customerSatisfaction?: number;
  remarks?: string;
  reopenRequested?: boolean;
  escalationRequired?: boolean;
}

export function useRecordHappyCallOutcome(id: string) {
  const queryClient = useQueryClient();
  return useMutation<HappyCall, AxiosError<ApiErrorEnvelope>, RecordHappyCallOutcomeInput>({
    mutationFn: async (input) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<HappyCall>>(`/happy-calls/${id}/outcome`, input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['happyCalls'] });
      queryClient.invalidateQueries({ queryKey: ['happyCall', id] });
    },
  });
}

export function useReassignHappyCall() {
  const queryClient = useQueryClient();
  return useMutation<HappyCall, AxiosError<ApiErrorEnvelope>, { id: string; assignedTo: string }>({
    mutationFn: async ({ id, assignedTo }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<HappyCall>>(`/happy-calls/${id}/reassign`, { assignedTo });
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['happyCalls'] });
      queryClient.invalidateQueries({ queryKey: ['happyCall', variables.id] });
    },
  });
}
