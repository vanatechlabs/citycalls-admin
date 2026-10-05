import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const ABOUT_PATH = '/websites/city-calls/home-page/about';

// Admin → Website Section → About: the home page's "About CityCalls" section.
export type AboutStatus = 'ACTIVE' | 'INACTIVE';
export const MAX_ABOUT_POINTS = 6;
// [0] tall left image, [1] top right, [2] bottom right.
export const ABOUT_IMAGE_SLOTS = ['Large image (left)', 'Top right image', 'Bottom right image'] as const;

export interface AboutImage {
  image: string;
  alt: string;
}

export interface HomeAboutInput {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
  points: string[];
  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;
  buttonText: string;
  buttonLink: string;
  images: AboutImage[];
  status: AboutStatus;
}

export interface HomeAbout extends HomeAboutInput {
  _id: string;
  updatedBy?: { userId?: string; name: string; role?: string };
  updatedAt: string;
}

const QUERY_KEY = ['home-about'];

export function useHomeAbout() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // The backend creates the entry with the website's current content on first open.
      const res = await apiClient.get<ApiSuccessEnvelope<HomeAbout>>(ABOUT_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useSaveHomeAbout() {
  const queryClient = useQueryClient();
  return useMutation<HomeAbout, AxiosError<ApiErrorEnvelope>, HomeAboutInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<HomeAbout>>(ABOUT_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
}
