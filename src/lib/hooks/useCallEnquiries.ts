import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/call-enquiries';

// Call Enquiry Section: phone calls that only asked about a service.
export const CALL_ENQUIRY_SOURCES = ['Just Dial', 'Instagram', 'Facebook', 'Google', 'Website', 'WhatsApp', 'Referral', 'Other'] as const;
export type CallEnquirySource = (typeof CALL_ENQUIRY_SOURCES)[number];
// Sources that also ask who referred them / what it was.
export const SOURCES_WITH_DETAIL: CallEnquirySource[] = ['Referral', 'Other'];

export type CallEnquiryStatus = 'OPEN' | 'CONVERTED' | 'CLOSED';

// One service the caller asked about. No serviceId = an "Other" (typed) service.
export interface CallEnquiryService {
  serviceId?: string;
  name: string;
  category?: string;
}

export interface CallEnquiryInput {
  name: string;
  phone: string;
  // First service's Navbar List link, and all names / categories joined —
  // what the list, search and export show.
  serviceId?: string;
  serviceName: string;
  serviceCategory?: string;
  // Every service asked about.
  services?: CallEnquiryService[];
  source: CallEnquirySource;
  sourceDetail?: string;
  remarks?: string;
}

export interface CallEnquiry extends CallEnquiryInput {
  _id: string;
  enquiryNo: string;
  status: CallEnquiryStatus;
  // Set once it was moved to a Service Call.
  registrationId?: string;
  registrationNo?: string;
  createdBy?: { name: string };
  updatedBy?: { name: string };
  createdAt: string;
  updatedAt: string;
}

// serviceId null = changed to an "Other" (typed) service.
type CallEnquiryUpdate = Partial<Omit<CallEnquiryInput, 'serviceId'>> & {
  serviceId?: string | null;
  status?: CallEnquiryStatus;
  registrationId?: string;
  registrationNo?: string;
};

const QUERY_KEY = ['call-enquiries'];

export function useCallEnquiries() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CallEnquiry[]>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useCallEnquiry(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'item', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<CallEnquiry>>(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useSaveCallEnquiry() {
  const queryClient = useQueryClient();
  return useMutation<CallEnquiry, AxiosError<ApiErrorEnvelope>, CallEnquiryUpdate & { id?: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<CallEnquiry>>(`${BASE_PATH}/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<CallEnquiry>>(BASE_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteCallEnquiry() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
