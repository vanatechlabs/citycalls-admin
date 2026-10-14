import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const PARALLAX_PATH = '/websites/city-calls/parallax';

export type ParallaxStatus = 'ACTIVE' | 'INACTIVE';

// Parallax banner of one website service page (Background Section).
export interface PageParallax {
  _id: string;
  pagePath: string;
  pageName: string;
  menuName?: string;
  subheading?: string;
  heading: string;
  highlight?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  status: ParallaxStatus;
  updatedBy?: { name: string };
  createdAt: string;
  updatedAt: string;
}

export interface PageParallaxInput {
  pagePath?: string;
  subheading?: string;
  heading?: string;
  highlight?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  status?: ParallaxStatus;
}

// Dropdown of every service page from Navbar List, one group per menu.
// parallaxId is set when that page already has a parallax image.
export interface ParallaxPageGroup {
  group: string;
  pages: { path: string; name: string; inactive?: boolean; parallaxId?: string }[];
}

export function useParallaxPageOptions() {
  return useQuery({
    queryKey: ['parallax', 'pages'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ParallaxPageGroup[]>>(`${PARALLAX_PATH}/pages`, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function usePageParallaxList() {
  return useQuery({
    queryKey: ['parallax', 'list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<PageParallax[]>>(PARALLAX_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function usePageParallax(id: string | null) {
  return useQuery({
    queryKey: ['parallax', 'item', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<PageParallax>>(`${PARALLAX_PATH}/${id}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useSavePageParallax() {
  const queryClient = useQueryClient();
  return useMutation<PageParallax, AxiosError<ApiErrorEnvelope>, PageParallaxInput & { id?: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<PageParallax>>(`${PARALLAX_PATH}/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<PageParallax>>(PARALLAX_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parallax'] }),
  });
}

export function useDeletePageParallax() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${PARALLAX_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parallax'] }),
  });
}
