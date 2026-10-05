import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/home-page/our-services';

// Admin → Website Section → Our Services: the home page's service cards
// ("Everything your home needs…") and the heading above them.
export type OurServiceStatus = 'ACTIVE' | 'INACTIVE';

export interface OurServiceInput {
  // The Navbar List service link the card is for (its path follows the link).
  navServiceId?: string;
  name: string;
  path: string;
  shortDescription: string;
  image: string;
  imageAlt: string;
  priceText: string;
  sortOrder: number;
  status: OurServiceStatus;
}

export interface OurService extends OurServiceInput {
  _id: string;
  updatedAt: string;
}

export interface OurServicesSectionInput {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  status: OurServiceStatus;
}

export interface OurServicesSection extends OurServicesSectionInput {
  _id: string;
  updatedBy?: { userId?: string; name: string };
  updatedAt: string;
}

const QUERY_KEY = ['our-services'];

export function useOurServices() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // First open creates the website's current 12 cards, so the list starts filled.
      const res = await apiClient.get<ApiSuccessEnvelope<{ section: OurServicesSection; services: OurService[] }>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useSaveOurServicesSection() {
  const invalidate = useInvalidate();
  return useMutation<OurServicesSection, AxiosError<ApiErrorEnvelope>, OurServicesSectionInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<OurServicesSection>>(`${BASE_PATH}/section`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useCreateOurService() {
  const invalidate = useInvalidate();
  return useMutation<OurService, AxiosError<ApiErrorEnvelope>, OurServiceInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<OurService>>(`${BASE_PATH}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateOurService() {
  const invalidate = useInvalidate();
  return useMutation<OurService, AxiosError<ApiErrorEnvelope>, { id: string } & Partial<OurServiceInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<OurService>>(`${BASE_PATH}/items/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteOurService() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}
