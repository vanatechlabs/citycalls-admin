import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface CustomerAddress {
  _id?: string;
  label?: string;
  // Optional — a pincode check can save a real city/state/country/pinCode
  // address before the street line is known (e.g. before a technician visit
  // is scheduled), rather than not saving an address at all.
  line1?: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault?: boolean;
}

export type ConsentState = 'GRANTED' | 'REVOKED' | 'NOT_ASKED';

export interface Customer {
  _id: string;
  name: string;
  businessName?: string;
  email?: string;
  gstin?: string;
  customerType: string;
  createdAt: string;
  contacts: { name?: string; mobile: string; isPrimary: boolean }[];
  addresses: CustomerAddress[];
  tags?: string[];
  notes?: string[];
  blacklisted?: boolean;
  consent?: { whatsapp: ConsentState; email: ConsentState; sms: ConsentState };
}

export function useCustomers(params?: { tag?: string; vertical?: string; q?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Customer[]>>('/customers', { params: { limit: 100, ...params } });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Customer>>(`/customers/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

// On-demand version of the same GET /customers/:id, as a mutation rather
// than a query — the call-intake wizard needs an onSuccess callback to chain
// straight into an area check once the full record (with addresses) is
// available, which useQuery doesn't support directly in TanStack Query v5.
export function useFetchCustomer() {
  return useMutation<Customer, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.get<ApiSuccessEnvelope<Customer>>(`/customers/${id}`);
      return res.data.data;
    },
  });
}

export interface CustomerDuplicate {
  _id: string;
  name: string;
  businessName?: string;
  contacts: { mobile: string }[];
}
export function useCustomerDuplicateCheck(params: { mobile?: string; gstin?: string; businessName?: string; name?: string }) {
  const hasAnyParam = Boolean(params.mobile || params.gstin || params.businessName || params.name);
  return useQuery({
    queryKey: ['customer-duplicates', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CustomerDuplicate[]>>('/customers/duplicates', { params });
      return res.data.data;
    },
    enabled: hasAnyParam,
  });
}

// On-demand version of the same /customers/duplicates lookup, as a mutation
// rather than a query — the call-intake wizard needs an onSuccess callback
// to decide the next step, which TanStack Query v5's useQuery no longer
// supports directly.
export function useLookupCustomerByMobile() {
  return useMutation<CustomerDuplicate[], AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (mobile) => {
      const res = await apiClient.get<ApiSuccessEnvelope<CustomerDuplicate[]>>('/customers/duplicates', { params: { mobile } });
      return res.data.data;
    },
  });
}

export interface CreateCustomerInput {
  customerType: string;
  name: string;
  businessName?: string;
  gstin?: string;
  email?: string;
  contacts: { name?: string; mobile: string; isPrimary: boolean }[];
  addresses?: CustomerAddress[];
  tags?: string[];
  notes?: string[];
  consent?: { whatsapp?: ConsentState; email?: ConsentState; sms?: ConsentState };
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation<{ customer: Customer; potentialDuplicates: CustomerDuplicate[] }, AxiosError<ApiErrorEnvelope>, CreateCustomerInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<{ customer: Customer; potentialDuplicates: CustomerDuplicate[] }>>('/customers', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useAddCustomerAddress() {
  const queryClient = useQueryClient();
  return useMutation<Customer, AxiosError<ApiErrorEnvelope>, CustomerAddress & { customerId: string }>({
    mutationFn: async ({ customerId, ...input }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Customer>>(`/customers/${customerId}/addresses`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export interface UpdateCustomerInput {
  customerId: string;
  customerType?: string;
  name?: string;
  businessName?: string;
  gstin?: string;
  email?: string;
  tags?: string[];
  contacts?: { name?: string; mobile: string; isPrimary: boolean }[];
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation<Customer, AxiosError<ApiErrorEnvelope>, UpdateCustomerInput>({
    mutationFn: async ({ customerId, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Customer>>(`/customers/${customerId}`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomerAddress() {
  const queryClient = useQueryClient();
  return useMutation<Customer, AxiosError<ApiErrorEnvelope>, Partial<CustomerAddress> & { customerId: string; addressId: string }>({
    mutationFn: async ({ customerId, addressId, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Customer>>(`/customers/${customerId}/addresses/${addressId}`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomerAddress() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, { customerId: string; addressId: string }>({
    mutationFn: async ({ customerId, addressId }) => {
      await apiClient.delete(`/customers/${customerId}/addresses/${addressId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomerConsent() {
  const queryClient = useQueryClient();
  return useMutation<Customer, AxiosError<ApiErrorEnvelope>, { customerId: string; channel: 'whatsapp' | 'email' | 'sms'; state: ConsentState; reason?: string }>({
    mutationFn: async ({ customerId, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Customer>>(`/customers/${customerId}/consent`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
    },
  });
}

export interface CustomerProduct {
  _id: string;
  customerId: string;
  brandId: string;
  productTypeId: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiresAt?: string;
}

export function useCustomerProducts(customerId: string) {
  return useQuery({
    queryKey: ['customer-products', customerId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CustomerProduct[]>>(`/customers/${customerId}/products`);
      return res.data.data;
    },
    enabled: !!customerId,
  });
}

export interface AddCustomerProductInput {
  brandId: string;
  productTypeId: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string;
}

export function useAddCustomerProduct() {
  const queryClient = useQueryClient();
  return useMutation<CustomerProduct, AxiosError<ApiErrorEnvelope>, AddCustomerProductInput & { customerId: string }>({
    mutationFn: async ({ customerId, ...input }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<CustomerProduct>>(`/customers/${customerId}/products`, input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['customer-products', variables.customerId] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      // The apiClient interceptor handles the toast if a message is returned, 
      // but manually toasting ensures the user gets immediate feedback.
      // Assuming toast is available globally or we will import it if needed.
    },
  });
}
