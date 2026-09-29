import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BACKGROUNDS_PATH = '/websites/city-calls/backgrounds';

export type BackgroundStatus = 'ACTIVE' | 'INACTIVE';
export const MAX_BACKGROUND_FEATURES = 4;

export interface BackgroundFeature {
  title: string;
  subtitle: string;
}

export interface BackgroundActor {
  userId?: string;
  name: string;
}

// Hero banner of one website service page (Background Section).
export interface PageBackground {
  _id: string;
  pagePath: string;
  pageName: string;
  menuName?: string;
  subheading?: string;
  heading: string;
  highlight?: string;
  description?: string;
  features: BackgroundFeature[];
  image?: string;
  imageAlt?: string;
  status: BackgroundStatus;
  createdBy?: BackgroundActor;
  updatedBy?: BackgroundActor;
  createdAt: string;
  updatedAt: string;
}

export interface PageBackgroundInput {
  pagePath?: string;
  subheading?: string;
  heading?: string;
  highlight?: string;
  description?: string;
  features?: BackgroundFeature[];
  image?: string;
  imageAlt?: string;
  status?: BackgroundStatus;
}

// Dropdown of every service page from Navbar List, one group per menu.
// backgroundId is set when that page already has a background.
export interface BackgroundPageGroup {
  group: string;
  pages: { path: string; name: string; inactive?: boolean; backgroundId?: string }[];
}

export function useBackgroundPageOptions() {
  return useQuery({
    queryKey: ['backgrounds', 'pages'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<BackgroundPageGroup[]>>(`${BACKGROUNDS_PATH}/pages`, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function usePageBackgroundList() {
  return useQuery({
    queryKey: ['backgrounds', 'list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<PageBackground[]>>(BACKGROUNDS_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function usePageBackground(id: string | null) {
  return useQuery({
    queryKey: ['backgrounds', 'item', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<PageBackground>>(`${BACKGROUNDS_PATH}/${id}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useSavePageBackground() {
  const queryClient = useQueryClient();
  return useMutation<PageBackground, AxiosError<ApiErrorEnvelope>, PageBackgroundInput & { id?: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<PageBackground>>(`${BACKGROUNDS_PATH}/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<PageBackground>>(BACKGROUNDS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backgrounds'] }),
  });
}

export function useDeletePageBackground() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BACKGROUNDS_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backgrounds'] }),
  });
}
