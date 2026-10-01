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
  // Overlay darkness 0–90 %; null/undefined = the website's default.
  overlayOpacity?: number | null;
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
  overlayOpacity?: number | null;
  status?: HeroSlideStatus;
}

// What the website uses when a slide has no overlay set.
export const DEFAULT_HERO_OVERLAY_OPACITY = 55;
export const MAX_HERO_OVERLAY_OPACITY = 90;

// Same gradient as the website's hero overlay, scaled to `opacity` at its
// darkest (bottom) edge — 55 reproduces the default look exactly.
export function heroOverlayGradient(opacity: number): string {
  const alpha = (value: number) => ((opacity * value) / DEFAULT_HERO_OVERLAY_OPACITY / 100).toFixed(3);
  return `linear-gradient(to top, rgba(0,0,0,${alpha(55)}), rgba(0,0,0,${alpha(35)}), rgba(0,0,0,${alpha(18)}))`;
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
