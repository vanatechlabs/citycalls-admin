import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiErrorEnvelope, ApiSuccessEnvelope } from '../api/client';

const LAUNCH_SPOTLIGHT_PATH = '/websites/city-calls/home-page/launch-spotlight';

export type LaunchSpotlightStatus = 'ACTIVE' | 'INACTIVE';

export interface LaunchSpotlightSlide {
  id: string;
  image: string;
  altText: string;
  badgeText: string;
  heading: string;
  subheading: string;
  link: string;
  accentColor: string;
  // Overlay darkness 0–100 %; null/undefined = the website's default.
  overlayOpacity?: number | null;
  sortOrder: number;
  status: LaunchSpotlightStatus;
}

// What the website uses when a slide has no overlay set.
export const DEFAULT_SPOTLIGHT_OVERLAY_OPACITY = 95;

// Same gradient as the website's spotlight card (from-black/95 via-black/40
// to-black/30), scaled so its bottom edge is `opacity` % dark.
export function spotlightOverlayGradient(opacity: number): string {
  const alpha = (value: number) => ((opacity * value) / DEFAULT_SPOTLIGHT_OVERLAY_OPACITY / 100).toFixed(3);
  return `linear-gradient(to top, rgba(0,0,0,${alpha(95)}), rgba(0,0,0,${alpha(40)}), rgba(0,0,0,${alpha(30)}))`;
}

export interface LaunchSpotlightConfig {
  _id: string;
  key: string;
  slides: LaunchSpotlightSlide[];
  createdAt: string;
  updatedAt: string;
}

export function useLaunchSpotlight() {
  return useQuery({
    queryKey: ['launch-spotlight'],
    queryFn: async () => {
      const response = await apiClient.get<ApiSuccessEnvelope<LaunchSpotlightConfig>>(LAUNCH_SPOTLIGHT_PATH, {
        skipGlobalToast: true,
      });
      return response.data.data;
    },
  });
}

export function useUpdateLaunchSpotlight() {
  const queryClient = useQueryClient();

  return useMutation<
    LaunchSpotlightConfig,
    AxiosError<ApiErrorEnvelope>,
    { slides: LaunchSpotlightSlide[] }
  >({
    mutationFn: async (input) => {
      const response = await apiClient.put<ApiSuccessEnvelope<LaunchSpotlightConfig>>(
        LAUNCH_SPOTLIGHT_PATH,
        input,
        { skipGlobalToast: true }
      );
      return response.data.data;
    },
    onSuccess: (config) => {
      queryClient.setQueryData(['launch-spotlight'], config);
    },
  });
}
