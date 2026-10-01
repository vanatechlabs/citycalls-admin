import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const FEATURES_PATH = '/websites/city-calls/home-page/features';

// Admin → Website Section → Features: the home page's "Home repairs
// everywhere…" section.
export const FEATURE_ICONS = [
  'wrench', 'zap', 'sparkles', 'shield-check', 'droplets', 'wind', 'bug', 'paint-roller', 'house', 'settings',
] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];
export type FeaturesStatus = 'ACTIVE' | 'INACTIVE';
export const MAX_FEATURE_ITEMS = 6;

export interface FeatureItem {
  icon: FeatureIcon;
  title: string;
  description: string;
}

export interface HomeFeaturesInput {
  // One heading line per "\n".
  heading: string;
  highlight: string;
  description: string;
  image: string;
  imageAlt: string;
  imageBadge: string;
  items: FeatureItem[];
  status: FeaturesStatus;
}

export interface HomeFeatures extends HomeFeaturesInput {
  _id: string;
  updatedBy?: { userId?: string; name: string; role?: string };
  updatedAt: string;
}

const QUERY_KEY = ['home-features'];

export function useHomeFeatures() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // The backend creates the entry with the website's current content on first open.
      const res = await apiClient.get<ApiSuccessEnvelope<HomeFeatures>>(FEATURES_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useSaveHomeFeatures() {
  const queryClient = useQueryClient();
  return useMutation<HomeFeatures, AxiosError<ApiErrorEnvelope>, HomeFeaturesInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<HomeFeatures>>(FEATURES_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
}
