import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/home-page/how-it-works';

// Admin → Website Section → How It Works: the home page's step cards.
export type HowItWorksStatus = 'ACTIVE' | 'INACTIVE';

// Icons the website can draw (same list as the backend).
export const HOW_IT_WORKS_ICONS = [
  'CalendarCheck', 'UserCheck', 'Wrench', 'ThumbsUp', 'PhoneCall', 'ClipboardCheck',
  'Truck', 'ShieldCheck', 'BadgeCheck', 'Home', 'Clock', 'Sparkles',
] as const;
export type HowItWorksIcon = (typeof HOW_IT_WORKS_ICONS)[number];

export interface HowItWorksStepInput {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: HowItWorksIcon;
  sortOrder: number;
  status: HowItWorksStatus;
}

export interface HowItWorksStep extends HowItWorksStepInput {
  _id: string;
  updatedBy?: { name: string };
  updatedAt: string;
}

export interface HowItWorksSectionInput {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
}

export interface HowItWorksSection extends HowItWorksSectionInput {
  updatedBy?: { name: string };
  updatedAt: string;
}

interface HowItWorksData {
  section: HowItWorksSection;
  steps: HowItWorksStep[];
}

const QUERY_KEY = ['how-it-works'];

export function useHowItWorks() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // First open creates the website's current four steps, so the list starts filled.
      const res = await apiClient.get<ApiSuccessEnvelope<HowItWorksData>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useSaveHowItWorksStep() {
  const invalidate = useInvalidate();
  return useMutation<HowItWorksStep, AxiosError<ApiErrorEnvelope>, { id?: string } & Partial<HowItWorksStepInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<HowItWorksStep>>(`${BASE_PATH}/items/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<HowItWorksStep>>(`${BASE_PATH}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteHowItWorksStep() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}

export function useSaveHowItWorksSection() {
  const invalidate = useInvalidate();
  return useMutation<HowItWorksSection, AxiosError<ApiErrorEnvelope>, HowItWorksSectionInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<HowItWorksSection>>(`${BASE_PATH}/section`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}
