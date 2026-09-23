import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

const HERO_SLIDES_PATH = '/websites/city-calls/home-page/hero-carousel/slides';

// Field names mirror frontend/src/components/home/HeroCarousel/HeroCarousel.tsx's
// `Slide` interface exactly (subtitle, titleParts[0]/[1] → titleLine1/titleLine2,
// description, image) — this is what that component actually renders, not a
// generic CMS shape.
export type HeroSlideStatus = 'ACTIVE' | 'INACTIVE';

export interface HeroSlide {
  _id: string;
  image?: string;
  altText?: string;
  subtitle?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  sortOrder: number;
  status: HeroSlideStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HeroSlideInput {
  image?: string;
  altText?: string;
  subtitle?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  sortOrder?: number;
  status?: HeroSlideStatus;
}

export function useHeroSlides(params?: { q?: string; status?: HeroSlideStatus }) {
  return useQuery({
    queryKey: ['hero-slides', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<HeroSlide[]>>(HERO_SLIDES_PATH, {
        params,
        skipGlobalToast: true,
      });
      return res.data.data;
    },
  });
}

export function useCreateHeroSlide() {
  const queryClient = useQueryClient();
  return useMutation<HeroSlide, AxiosError<ApiErrorEnvelope>, HeroSlideInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<HeroSlide>>(HERO_SLIDES_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hero-slides'] }),
  });
}

export function useUpdateHeroSlide() {
  const queryClient = useQueryClient();
  return useMutation<HeroSlide, AxiosError<ApiErrorEnvelope>, HeroSlideInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<HeroSlide>>(`${HERO_SLIDES_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hero-slides'] }),
  });
}

export function useDeleteHeroSlide() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${HERO_SLIDES_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hero-slides'] }),
  });
}
