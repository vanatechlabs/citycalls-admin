import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/enquiries';

// Enquiry Section: website Quick Book and Contact page submissions.
export type EnquiryType = 'QUICK_BOOKING' | 'CONTACT';
export const ENQUIRY_STATUSES = ['PENDING', 'CONTACTED', 'RESOLVED'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export interface Enquiry {
  _id: string;
  type: EnquiryType;
  referenceNo: string;
  name: string;
  phone: string;
  email?: string;
  services: string[];
  servicePath?: string;
  subject?: string;
  message?: string;
  page?: string;
  status: EnquiryStatus;
  statusUpdatedBy?: { name: string };
  statusUpdatedAt?: string;
  // Quick Book "booking received" WhatsApp to the customer.
  whatsapp?: { status: 'SENT' | 'FAILED' | 'SKIPPED'; at: string; error?: string };
  createdAt: string;
}

const queryKey = (type: EnquiryType) => ['enquiries', type];
const PENDING_COUNTS_KEY = ['enquiries', 'pending-counts'];

// Sidebar red badges: enquiries still Pending, per type.
export function useEnquiryPendingCounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: PENDING_COUNTS_KEY,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Record<EnquiryType, number>>>(`${BASE_PATH}/pending-counts`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: 60 * 1000,
    retry: false,
  });
}

export function useEnquiries(type: EnquiryType) {
  return useQuery({
    queryKey: queryKey(type),
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Enquiry[]>>(BASE_PATH, { params: { type }, skipGlobalToast: true });
      return res.data.data;
    },
    // New website submissions show up without a manual refresh.
    refetchInterval: 60 * 1000,
  });
}

export function useUpdateEnquiryStatus(type: EnquiryType) {
  const queryClient = useQueryClient();
  return useMutation<Enquiry, AxiosError<ApiErrorEnvelope>, { id: string; status: EnquiryStatus }>({
    mutationFn: async ({ id, status }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Enquiry>>(`${BASE_PATH}/${id}/status`, { status }, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Enquiry[]>(queryKey(type), (list) => list?.map((e) => (e._id === updated._id ? updated : e)));
      void queryClient.invalidateQueries({ queryKey: PENDING_COUNTS_KEY });
    },
  });
}

export function useDeleteEnquiry(type: EnquiryType) {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<Enquiry[]>(queryKey(type), (list) => list?.filter((e) => e._id !== id));
      void queryClient.invalidateQueries({ queryKey: PENDING_COUNTS_KEY });
    },
  });
}
