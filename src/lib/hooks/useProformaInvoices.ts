import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface ProformaInvoice {
  _id: string;
  number: string;
  customerId: string;
  branchId: string;
  total: number;
  status: 'DRAFT' | 'SHARED' | 'ACCEPTED' | 'CONVERTED' | 'CANCELLED';
  createdAt: string;
}

export function useProformaInvoices() {
  return useQuery({
    queryKey: ['proforma-invoices'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ProformaInvoice[]>>('/proforma-invoices', { params: { limit: 100 } });
      return res.data.data;
    },
  });
}

export function useShareProformaInvoice() {
  const queryClient = useQueryClient();
  return useMutation<ProformaInvoice, AxiosError<ApiErrorEnvelope>, { id: string; channels: string[] }>({
    mutationFn: async ({ id, channels }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<ProformaInvoice>>(`/proforma-invoices/${id}/share`, { channels });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] }),
  });
}

export function useAcceptProformaInvoice() {
  const queryClient = useQueryClient();
  return useMutation<ProformaInvoice, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<ProformaInvoice>>(`/proforma-invoices/${id}/accept`);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] }),
  });
}

export function useConvertProformaInvoice() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.post(`/proforma-invoices/${id}/convert`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
