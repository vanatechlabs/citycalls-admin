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
  sortOrder: number;
  status: LaunchSpotlightStatus;
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
