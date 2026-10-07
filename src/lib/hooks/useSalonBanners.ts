import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

const SALON_BANNERS_PATH = '/customer-app/salon-banners';

// Top banner carousel on the customer mobile app's Salon tab. Fields mirror
// the app's slide layout: tag pill, two title lines (second highlighted),
// description, button label and a full-bleed background image.
export type SalonBannerStatus = 'ACTIVE' | 'INACTIVE';

export interface SalonBanner {
  _id: string;
  tagLine: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  buttonText: string;
  image?: string;
  altText?: string;
  sortOrder: number;
  status: SalonBannerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SalonBannerInput {
  tagLine?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  altText?: string;
  sortOrder?: number;
  status?: SalonBannerStatus;
}

export function useSalonBanners(params?: { q?: string; status?: SalonBannerStatus }) {
  return useQuery({
    queryKey: ['salon-banners', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<SalonBanner[]>>(SALON_BANNERS_PATH, {
        params,
        skipGlobalToast: true,
      });
      return res.data.data;
    },
  });
}

export function useCreateSalonBanner() {
  const queryClient = useQueryClient();
  return useMutation<SalonBanner, AxiosError<ApiErrorEnvelope>, SalonBannerInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<SalonBanner>>(SALON_BANNERS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salon-banners'] }),
  });
}

export function useUpdateSalonBanner() {
  const queryClient = useQueryClient();
  return useMutation<SalonBanner, AxiosError<ApiErrorEnvelope>, SalonBannerInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<SalonBanner>>(`${SALON_BANNERS_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salon-banners'] }),
  });
}

export function useDeleteSalonBanner() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${SALON_BANNERS_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salon-banners'] }),
  });
}
