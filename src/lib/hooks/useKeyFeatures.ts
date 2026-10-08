import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/home-page/key-features';

// Admin → Website Section → Key Features: the "Why choose us" cards.
export const KEY_FEATURE_ICONS = [
  'BadgeCheck', 'HandCoins', 'Timer', 'Home', 'Wrench', 'ShieldCheck', 'Clock', 'Star', 'ThumbsUp', 'Users',
  'Sparkles', 'Award', 'Headphones', 'Truck', 'IndianRupee', 'Zap', 'Heart', 'CheckCircle2', 'PhoneCall', 'Leaf',
] as const;
export type KeyFeatureIcon = (typeof KEY_FEATURE_ICONS)[number];
export type KeyFeatureStatus = 'ACTIVE' | 'INACTIVE';

export interface KeyFeatureInput {
  title: string;
  description: string;
  icon: KeyFeatureIcon;
  sortOrder: number;
  status: KeyFeatureStatus;
}

export interface KeyFeature extends KeyFeatureInput {
  _id: string;
  updatedBy?: { name: string };
  updatedAt: string;
}

export interface KeyFeaturesSectionInput {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
}

interface KeyFeaturesData {
  section: KeyFeaturesSectionInput;
  features: KeyFeature[];
}

const QUERY_KEY = ['key-features'];

export function useKeyFeatures() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // First open creates the website's current six cards, so the list starts filled.
      const res = await apiClient.get<ApiSuccessEnvelope<KeyFeaturesData>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useSaveKeyFeature() {
  const invalidate = useInvalidate();
  return useMutation<KeyFeature, AxiosError<ApiErrorEnvelope>, { id?: string } & Partial<KeyFeatureInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<KeyFeature>>(`${BASE_PATH}/items/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<KeyFeature>>(`${BASE_PATH}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteKeyFeature() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}

export function useSaveKeyFeaturesSection() {
  const invalidate = useInvalidate();
  return useMutation<KeyFeaturesSectionInput, AxiosError<ApiErrorEnvelope>, KeyFeaturesSectionInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<KeyFeaturesSectionInput>>(`${BASE_PATH}/section`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}
