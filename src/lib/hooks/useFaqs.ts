import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/home-page/faq';

// Admin → Website Section → FAQ: the home page's questions and headings.
export type FaqStatus = 'ACTIVE' | 'INACTIVE';

export interface FaqInput {
  question: string;
  answer: string;
  image: string;
  altText: string;
  sortOrder: number;
  status: FaqStatus;
}

export interface Faq extends FaqInput {
  _id: string;
  updatedBy?: { name: string };
  updatedAt: string;
}

export interface FaqSectionInput {
  subheading: string;
  heading: string;
  highlightedWord: string;
  description: string;
}

interface FaqData {
  section: FaqSectionInput & { updatedBy?: { name: string } };
  faqs: Faq[];
}

const QUERY_KEY = ['faqs'];

export function useFaqs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // First open creates the website's current questions, so the list starts filled.
      const res = await apiClient.get<ApiSuccessEnvelope<FaqData>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useSaveFaq() {
  const invalidate = useInvalidate();
  return useMutation<Faq, AxiosError<ApiErrorEnvelope>, { id?: string } & Partial<FaqInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<Faq>>(`${BASE_PATH}/items/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<Faq>>(`${BASE_PATH}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteFaq() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}

export function useSaveFaqSection() {
  const invalidate = useInvalidate();
  return useMutation<FaqSectionInput, AxiosError<ApiErrorEnvelope>, FaqSectionInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<FaqSectionInput>>(`${BASE_PATH}/section`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}
