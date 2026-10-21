import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/enquiries';
// Help Now's "Book Now" form has its own backend (websites/help-now/quick-bookings).
const HELP_NOW_PATH = '/websites/help-now/quick-bookings';

// Enquiry Section: City Calls Quick Book and Contact page submissions, and
// Help Now's quick bookings (kept in their own collection, same shape).
export type EnquiryType = 'QUICK_BOOKING' | 'CONTACT' | 'HELP_NOW_QUICK_BOOKING';
const pathFor = (type: EnquiryType) => (type === 'HELP_NOW_QUICK_BOOKING' ? HELP_NOW_PATH : BASE_PATH);
export const ENQUIRY_STATUSES = ['PENDING', 'CONTACTED', 'RESOLVED'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export interface Enquiry {
  _id: string;
  // Not set on Help Now quick bookings (they have their own list).
  type?: EnquiryType;
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
    queryFn: async (): Promise<Record<EnquiryType, number>> => {
      const [cityCalls, helpNow] = await Promise.all([
        apiClient.get<ApiSuccessEnvelope<Record<'QUICK_BOOKING' | 'CONTACT', number>>>(`${BASE_PATH}/pending-counts`, { skipGlobalToast: true }),
        // A Help Now outage shouldn't hide the City Calls badges.
        apiClient
          .get<ApiSuccessEnvelope<{ pending: number }>>(`${HELP_NOW_PATH}/pending-count`, { skipGlobalToast: true })
          .then((res) => res.data.data.pending)
          .catch(() => 0),
      ]);
      return { ...cityCalls.data.data, HELP_NOW_QUICK_BOOKING: helpNow };
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
      const params = type === 'HELP_NOW_QUICK_BOOKING' ? undefined : { type };
      const res = await apiClient.get<ApiSuccessEnvelope<Enquiry[]>>(pathFor(type), { params, skipGlobalToast: true });
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
      const res = await apiClient.patch<ApiSuccessEnvelope<Enquiry>>(`${pathFor(type)}/${id}/status`, { status }, { skipGlobalToast: true });
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
      await apiClient.delete(`${pathFor(type)}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<Enquiry[]>(queryKey(type), (list) => list?.filter((e) => e._id !== id));
      void queryClient.invalidateQueries({ queryKey: PENDING_COUNTS_KEY });
    },
  });
}
