import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface VendorBankDetails {
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
}

export interface VendorAgreement {
  url: string;
  expiryDate: string;
}

export interface Vendor {
  _id: string;
  companyName: string;
  contactPersons: { name: string; mobile: string; role?: string }[];
  serviceAreas?: { pinCodes: string[] };
  servicesOffered?: string[];
  brandsHandled?: string[];
  productTypesHandled?: string[];
  skills?: string[];
  gst?: string;
  pan?: string;
  bankDetails?: VendorBankDetails;
  agreement?: VendorAgreement;
  commissionModel: 'FIXED' | 'SERVICE_WISE';
  commissionRate?: number;
  active: boolean;
  blacklisted: boolean;
  blacklistReason?: string;
  createdAt: string;
}

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Vendor[]>>('/vendors', { params: { limit: 100 } });
      return res.data.data;
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Vendor>>(`/vendors/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useVendorsCount(params?: { active?: boolean; blacklisted?: boolean }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['vendors', 'count', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Vendor[]>>('/vendors', { params: { ...params, limit: 1 } });
      return res.data.meta?.total ?? 0;
    },
    enabled: options?.enabled ?? true,
  });
}

export interface VendorInput {
  companyName?: string;
  contactPersons?: { name: string; mobile: string; role?: string }[];
  serviceAreas?: { pinCodes: string[] };
  servicesOffered?: string[];
  brandsHandled?: string[];
  productTypesHandled?: string[];
  skills?: string[];
  gst?: string;
  pan?: string;
  bankDetails?: VendorBankDetails;
  agreement?: VendorAgreement;
  commissionModel?: 'FIXED' | 'SERVICE_WISE';
  commissionRate?: number;
  active?: boolean;
}
export type CreateVendorInput = VendorInput & { companyName: string };

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation<Vendor, AxiosError<ApiErrorEnvelope>, CreateVendorInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Vendor>>('/vendors', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation<Vendor, AxiosError<ApiErrorEnvelope>, VendorInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Vendor>>(`/vendors/${id}`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useSetVendorBlacklist() {
  const queryClient = useQueryClient();
  return useMutation<Vendor, AxiosError<ApiErrorEnvelope>, { id: string; blacklisted: boolean; blacklistReason?: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Vendor>>(`/vendors/${id}/blacklist`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
    },
  });
}

export interface VendorTechnician {
  _id: string;
  userId: { _id: string; name: string; mobile: string; email?: string };
  vendorId: string;
  skills: string[];
  active: boolean;
}

export function useVendorTechnicians(vendorId: string) {
  return useQuery({
    queryKey: ['vendor-technicians', vendorId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<VendorTechnician[]>>(`/vendors/${vendorId}/technicians`);
      return res.data.data;
    },
    enabled: !!vendorId,
  });
}

export function useAddVendorTechnician() {
  const queryClient = useQueryClient();
  return useMutation<VendorTechnician, AxiosError<ApiErrorEnvelope>, { vendorId: string; userId: string; skills?: string[] }>({
    mutationFn: async ({ vendorId, ...input }) => {
      // vendorId is required by the request schema but the server always uses
      // the :id route param as the source of truth — sent for validation only.
      const res = await apiClient.post<ApiSuccessEnvelope<VendorTechnician>>(`/vendors/${vendorId}/technicians`, { vendorId, ...input });
      return res.data.data;
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['vendor-technicians', variables.vendorId] }),
  });
}
