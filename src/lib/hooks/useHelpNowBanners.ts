import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

const HELPNOW_BANNERS_PATH = '/customer-app/helpnow-banners';

// Top banner carousel on the customer mobile app's HelpNow tab. Fields mirror
// the app's slide layout: tag pill, two title lines (second highlighted),
// description, button label and a full-bleed background image.
export type HelpNowBannerStatus = 'ACTIVE' | 'INACTIVE';

export interface HelpNowBanner {
  _id: string;
  tagLine: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  buttonText: string;
  image?: string;
  altText?: string;
  sortOrder: number;
  status: HelpNowBannerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HelpNowBannerInput {
  tagLine?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  altText?: string;
  sortOrder?: number;
  status?: HelpNowBannerStatus;
}

export function useHelpNowBanners(params?: { q?: string; status?: HelpNowBannerStatus }) {
  return useQuery({
    queryKey: ['helpnow-banners', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<HelpNowBanner[]>>(HELPNOW_BANNERS_PATH, {
        params,
        skipGlobalToast: true,
      });
      return res.data.data;
    },
  });
}

export function useCreateHelpNowBanner() {
  const queryClient = useQueryClient();
  return useMutation<HelpNowBanner, AxiosError<ApiErrorEnvelope>, HelpNowBannerInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<HelpNowBanner>>(HELPNOW_BANNERS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['helpnow-banners'] }),
  });
}

export function useUpdateHelpNowBanner() {
  const queryClient = useQueryClient();
  return useMutation<HelpNowBanner, AxiosError<ApiErrorEnvelope>, HelpNowBannerInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<HelpNowBanner>>(`${HELPNOW_BANNERS_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['helpnow-banners'] }),
  });
}

export function useDeleteHelpNowBanner() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${HELPNOW_BANNERS_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['helpnow-banners'] }),
  });
}
