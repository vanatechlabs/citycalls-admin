import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const SEO_PATH = '/websites/city-calls/seo';

// Public website origin — canonical URLs default to this + the page path.
export const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://citycalls.in').replace(/\/$/, '');

export type SeoStatus = 'ACTIVE' | 'INACTIVE';

export interface SeoActor {
  userId?: string;
  name: string;
}

export interface SeoMeta {
  _id: string;
  pagePath: string;
  pageName: string;
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  openGraphTags?: string;
  schemaMarkup?: string;
  canonicalUrl?: string;
  ogImage?: string;
  status: SeoStatus;
  createdBy?: SeoActor;
  updatedBy?: SeoActor;
  createdAt: string;
  updatedAt: string;
}

export interface SeoMetaInput {
  pagePath?: string;
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  openGraphTags?: string;
  schemaMarkup?: string;
  canonicalUrl?: string;
  ogImage?: string;
  status?: SeoStatus;
}

// Dropdown of every website page: "Website Pages" + one group per Navbar
// List menu (its service links). seoMetaId is set when SEO already exists.
export interface SeoPageGroup {
  group: string;
  pages: { path: string; name: string; inactive?: boolean; seoMetaId?: string }[];
}

export function useSeoPageOptions() {
  return useQuery({
    queryKey: ['seo', 'pages'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<SeoPageGroup[]>>(`${SEO_PATH}/pages`, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useSeoMetaList() {
  return useQuery({
    queryKey: ['seo', 'meta'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<SeoMeta[]>>(`${SEO_PATH}/meta`, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useSeoMeta(id: string | null) {
  return useQuery({
    queryKey: ['seo', 'meta', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<SeoMeta>>(`${SEO_PATH}/meta/${id}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useSaveSeoMeta() {
  const queryClient = useQueryClient();
  return useMutation<SeoMeta, AxiosError<ApiErrorEnvelope>, SeoMetaInput & { id?: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<SeoMeta>>(`${SEO_PATH}/meta/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<SeoMeta>>(`${SEO_PATH}/meta`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seo'] }),
  });
}

export function useDeleteSeoMeta() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${SEO_PATH}/meta/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seo'] }),
  });
}
