import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

// docs/09-database-architecture.md §2 "vendor_invoices / vendor_payouts" —
// the vendor-facing settlement chain (src/modules/vendors/vendorFinance.*
// on the backend, already built; this is the admin-web client for it).
export interface VendorInvoice {
  _id: string;
  number: string;
  vendorId: string;
  serviceRequestIds: string[];
  periodStart?: string;
  periodEnd?: string;
  amount: number;
  commissionBreakup: { grossAmount: number; commissionRate: number; commissionAmount: number; netPayable: number };
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'DISPUTED';
  createdAt: string;
}

export interface VendorPayout {
  _id: string;
  number: string;
  vendorId: string;
  vendorInvoiceIds: string[];
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  paidAt?: string;
  reference?: string;
  createdAt: string;
}

export function useVendorInvoices(vendorId: string) {
  return useQuery({
    queryKey: ['vendor-invoices', vendorId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<VendorInvoice[]>>('/vendor-invoices', { params: { vendorId, limit: 100 } });
      return res.data.data;
    },
    enabled: !!vendorId,
  });
}

export interface CreateVendorInvoiceInput {
  vendorId: string;
  serviceRequestIds: string[];
  grossAmount: number;
  periodStart?: string;
  periodEnd?: string;
}

export function useCreateVendorInvoice() {
  const queryClient = useQueryClient();
  return useMutation<VendorInvoice, AxiosError<ApiErrorEnvelope>, CreateVendorInvoiceInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<VendorInvoice>>('/vendor-invoices', input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-invoices', variables.vendorId] });
    },
  });
}

export function useApproveVendorInvoice() {
  const queryClient = useQueryClient();
  return useMutation<VendorInvoice, AxiosError<ApiErrorEnvelope>, { id: string; vendorId: string }>({
    mutationFn: async ({ id }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<VendorInvoice>>(`/vendor-invoices/${id}/approve`);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-invoices', variables.vendorId] });
    },
  });
}

export function useVendorPayouts(vendorId: string) {
  return useQuery({
    queryKey: ['vendor-payouts', vendorId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<VendorPayout[]>>('/vendor-payouts', { params: { vendorId, limit: 100 } });
      return res.data.data;
    },
    enabled: !!vendorId,
  });
}

export function useCreateVendorPayout() {
  const queryClient = useQueryClient();
  return useMutation<VendorPayout, AxiosError<ApiErrorEnvelope>, { vendorId: string; vendorInvoiceIds: string[] }>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<VendorPayout>>('/vendor-payouts', input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts', variables.vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-invoices', variables.vendorId] });
    },
  });
}

export function useMarkPayoutPaid() {
  const queryClient = useQueryClient();
  return useMutation<VendorPayout, AxiosError<ApiErrorEnvelope>, { id: string; vendorId: string; reference: string }>({
    mutationFn: async ({ id, reference }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<VendorPayout>>(`/vendor-payouts/${id}/mark-paid`, { reference });
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts', variables.vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-invoices', variables.vendorId] });
    },
  });
}
