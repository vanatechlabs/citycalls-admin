import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiErrorEnvelope, ApiSuccessEnvelope } from '../api/client';

const BASE_PATH = '/customer-profiles';

// Customer Section: one profile per mobile number, across Service Calls,
// Call Enquiries and website enquiries.
export type CustomerKind = 'NEW' | 'FIRST_TIME' | 'REPEAT' | 'LOYAL';

export const CUSTOMER_KIND_META: Record<CustomerKind, { label: string; className: string }> = {
  NEW: { label: 'New / Enquiry only', className: 'border-slate-300 bg-slate-50 text-slate-600' },
  FIRST_TIME: { label: 'First-time', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  REPEAT: { label: 'Repeat', className: 'border-green-200 bg-green-50 text-green-700' },
  LOYAL: { label: 'Loyal', className: 'border-amber-300 bg-amber-50 text-amber-700' },
};

export interface CustomerStats {
  services: number;
  completed: number;
  open: number;
  cancelled: number;
  reopens: number;
  // Call Enquiries / website enquiries (Quick Booking + Contact).
  enquiries: number;
  webEnquiries: number;
  lastServiceAt?: string;
}

export interface CustomerListItem {
  _id: string;
  customerCode: string;
  phone: string;
  name: string;
  email?: string;
  city?: string;
  state?: string;
  pincode?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSource: 'SERVICE_CALL' | 'CALL_ENQUIRY' | 'WEBSITE_ENQUIRY';
  stats: CustomerStats;
  kind: CustomerKind;
}

export interface CustomerSearchResult extends Pick<CustomerListItem, 'customerCode' | 'phone' | 'name' | 'email' | 'city' | 'lastSeenAt' | 'stats' | 'kind'> {
  // What the search matched, e.g. "Reg No CC2026100705" / "Mobile".
  matchedOn: string;
  exact: boolean;
}

export interface CustomerSummary {
  total: number;
  newThisMonth: number;
  withService: number;
  repeat: number;
  loyal: number;
  enquiryOnly: number;
}

interface CountRow { name: string; count: number; completed?: number; reopens?: number; lastAt?: string; category?: string }

export interface CustomerProfile {
  customer: CustomerListItem & { altPhone?: string; address?: string; createdAt: string };
  kind: CustomerKind;
  stats: {
    services: number;
    completed: number;
    open: number;
    cancelled: number;
    reopens: number;
    reopenedServices: number;
    callEnquiries: number;
    websiteEnquiries: number;
    firstServiceAt?: string;
    lastServiceAt?: string;
  };
  byService: CountRow[];
  byCategory: CountRow[];
  byBrand: CountRow[];
  byMonth: { month: string; count: number }[];
  addresses: { address: string; city: string; state: string; pincode: string; lastUsedAt: string; times: number }[];
  services: {
    _id: string;
    registrationNo: string;
    source: 'ADMIN' | 'WEBSITE';
    serviceName: string;
    serviceCategory: string;
    brand: string;
    applianceType: string;
    issues: string[];
    status: 'NEW' | 'ACTIVE' | 'PENDING' | 'REOPENED' | 'CLOSED' | 'CANCELLED';
    reopens: number;
    createdAt: string;
    preferredDate?: string;
    timeSlot?: string;
    closedAt?: string;
    couponCode?: string;
    city: string;
  }[];
  callEnquiries: { _id: string; enquiryNo: string; name: string; serviceName: string; serviceCategory?: string; source: string; status: 'OPEN' | 'CONVERTED' | 'CLOSED'; registrationNo?: string; remarks?: string; createdAt: string }[];
  websiteEnquiries: { _id: string; referenceNo: string; type: 'QUICK_BOOKING' | 'CONTACT'; services: string[]; subject?: string; status: string; createdAt: string }[];
}

// The value only after typing has paused for `delay` ms.
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Top-bar search. Pass the debounced text; < 2 characters searches nothing.
// The previous request is cancelled when the text changes.
export function useCustomerSearch(q: string, enabled = true) {
  const text = q.trim();
  return useQuery({
    queryKey: ['customer-profiles', 'search', text],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<ApiSuccessEnvelope<CustomerSearchResult[]>>(`${BASE_PATH}/search`, {
        params: { q: text },
        signal,
        skipGlobalToast: true,
      });
      return res.data.data;
    },
    enabled: enabled && text.length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export type CustomerDateField = 'lastSeenAt' | 'firstSeenAt';

// from / to: "2026-10-01" (India dates, both days included).
export function useCustomerList(params: {
  q?: string; page: number; limit: number; sort: 'recent' | 'oldest' | 'name';
  from?: string; to?: string; dateField?: CustomerDateField;
}) {
  return useQuery({
    queryKey: ['customer-profiles', 'list', params],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<ApiSuccessEnvelope<CustomerListItem[]>>(BASE_PATH, {
        params: { ...params, q: params.q?.trim() || undefined },
        signal,
        skipGlobalToast: true,
      });
      return { items: res.data.data, meta: res.data.meta };
    },
    placeholderData: keepPreviousData,
  });
}

export function useCustomerSummary() {
  return useQuery({
    queryKey: ['customer-profiles', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CustomerSummary>>(`${BASE_PATH}/summary`, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

// key = CityCalls ID (CC-000123) or mobile number.
export function useCustomerProfile(key: string | null) {
  return useQuery({
    queryKey: ['customer-profiles', 'profile', key],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CustomerProfile>>(`${BASE_PATH}/${encodeURIComponent(key!)}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!key,
    retry: false,
  });
}

// All Customers → Delete: off the list and search; their calls / enquiries stay.
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (code) => {
      await apiClient.delete(`${BASE_PATH}/${encodeURIComponent(code)}`, { skipGlobalToast: true });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['customer-profiles'] }),
  });
}

export const customerProfilePath = (code: string) => `/dashboard/customer-profiles/${encodeURIComponent(code)}`;
