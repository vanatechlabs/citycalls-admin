import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface Invoice {
  _id: string;
  number: string;
  customerId: string;
  branchId: string;
  subtotal: number;
  total: number;
  amountPaid: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  createdAt: string;
}

export function useInvoices(serviceRequestId?: string) {
  return useQuery({
    queryKey: ['invoices', { serviceRequestId }],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Invoice[]>>('/invoices', { params: { limit: 100, serviceRequestId } });
      return res.data.data;
    },
  });
}

export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'GATEWAY', 'CHEQUE', 'CREDIT'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, RecordPaymentInput>({
    mutationFn: async ({ invoiceId, ...input }) => {
      const res = await apiClient.post(`/invoices/${invoiceId}/payments`, input);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useShareInvoice() {
  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, { invoiceId: string; channels: string[] }>({
    mutationFn: async ({ invoiceId, channels }) => {
      const res = await apiClient.post(`/invoices/${invoiceId}/share`, { channels });
      return res.data;
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, AxiosError<ApiErrorEnvelope>, { invoiceId: string; reason: string }>({
    mutationFn: async ({ invoiceId, reason }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Invoice>>(`/invoices/${invoiceId}/cancel`, { reason });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export interface PaymentReceipt {
  _id: string;
  number: string;
  amount: number;
  method: string;
  reference?: string;
  createdAt: string;
}

export function usePaymentHistory(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<PaymentReceipt[]>>(`/invoices/${invoiceId}/payments`);
      return res.data.data;
    },
    enabled: !!invoiceId,
  });
}

export interface FinanceNote {
  _id: string;
  number: string;
  invoiceId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export function useInvoiceNotes(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice-notes', invoiceId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<{ creditNotes: FinanceNote[]; debitNotes: FinanceNote[] }>>(`/invoices/${invoiceId}/notes`);
      return res.data.data;
    },
    enabled: !!invoiceId,
  });
}

export interface IssueNoteInput {
  invoiceId: string;
  amount: number;
  reason: string;
}

export function useIssueCreditNote() {
  const queryClient = useQueryClient();
  return useMutation<FinanceNote, AxiosError<ApiErrorEnvelope>, IssueNoteInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<FinanceNote>>('/credit-notes', input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['invoice-notes', variables.invoiceId] }),
  });
}

export function useIssueDebitNote() {
  const queryClient = useQueryClient();
  return useMutation<FinanceNote, AxiosError<ApiErrorEnvelope>, IssueNoteInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<FinanceNote>>('/debit-notes', input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['invoice-notes', variables.invoiceId] }),
  });
}
