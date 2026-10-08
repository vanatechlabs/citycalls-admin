import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

const HOME_BANNERS_PATH = '/customer-app/home-banners';

// Top banner carousel on the customer mobile app's home screen. Fields mirror
// the app's slide layout: tag pill, two title lines (second highlighted),
// description, button label and a full-bleed background image.
export type HomeBannerStatus = 'ACTIVE' | 'INACTIVE';

export interface HomeBanner {
  _id: string;
  tagLine: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  buttonText: string;
  image?: string;
  altText?: string;
  sortOrder: number;
  status: HomeBannerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HomeBannerInput {
  tagLine?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  altText?: string;
  sortOrder?: number;
  status?: HomeBannerStatus;
}

export function useHomeBanners(params?: { q?: string; status?: HomeBannerStatus }) {
  return useQuery({
    queryKey: ['home-banners', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<HomeBanner[]>>(HOME_BANNERS_PATH, {
        params,
        skipGlobalToast: true,
      });
      return res.data.data;
    },
  });
}

export function useCreateHomeBanner() {
  const queryClient = useQueryClient();
  return useMutation<HomeBanner, AxiosError<ApiErrorEnvelope>, HomeBannerInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<HomeBanner>>(HOME_BANNERS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-banners'] }),
  });
}

export function useUpdateHomeBanner() {
  const queryClient = useQueryClient();
  return useMutation<HomeBanner, AxiosError<ApiErrorEnvelope>, HomeBannerInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<HomeBanner>>(`${HOME_BANNERS_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-banners'] }),
  });
}

export function useDeleteHomeBanner() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${HOME_BANNERS_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-banners'] }),
  });
}
