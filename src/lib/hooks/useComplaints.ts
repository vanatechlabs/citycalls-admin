import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Complaint {
  _id: string;
  customerId: string | { _id: string; name: string; contacts?: { mobile: string; isPrimary: boolean }[] } | null;
  serviceRequestId: string | { _id: string; number: string } | null;
  subject: string;
  description: string;
  status: ComplaintStatus;
  response?: string;
  respondedBy?: string | { _id: string; name: string } | null;
  respondedAt?: string;
  createdAt: string;
}

export function customerName(c: Complaint): string {
  if (!c.customerId) return 'Unknown';
  return typeof c.customerId === 'string' ? c.customerId : c.customerId.name;
}

export function serviceRequestNumber(c: Complaint): string | null {
  if (!c.serviceRequestId) return null;
  return typeof c.serviceRequestId === 'string' ? c.serviceRequestId : c.serviceRequestId.number;
}

export function useComplaints(params?: { status?: ComplaintStatus }) {
  return useQuery({
    queryKey: ['complaints', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Complaint[]>>('/complaints', { params: { limit: 100, ...params } });
      return res.data.data;
    },
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: ['complaint', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Complaint>>(`/complaints/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useRespondComplaint(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Complaint, AxiosError<ApiErrorEnvelope>, { response: string; status: 'RESOLVED' | 'CLOSED' }>({
    mutationFn: async (input) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Complaint>>(`/complaints/${id}/respond`, input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint', id] });
    },
  });
}

export function useUpdateComplaintStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Complaint, AxiosError<ApiErrorEnvelope>, { status: ComplaintStatus }>({
    mutationFn: async (input) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Complaint>>(`/complaints/${id}/status`, input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaint', id] });
    },
  });
}
