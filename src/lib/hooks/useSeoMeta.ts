import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const SEO_PATH = '/websites/city-calls/seo';

// Public website origin — canonical URLs default to this + the page path.
export const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://citycalls.in').replace(/\/$/, '');

// Help Now's pages share the SEO list but are stored under this path prefix
// (backend help-now/seo/helpNowSeo.pages.ts): "/helpnow-site/services/dish-washing"
// is helpnow.citycalls.in/services/dish-washing.
export const HELP_NOW_SEO_PREFIX = '/helpnow-site';
const HELP_NOW_ORIGIN = (process.env.NEXT_PUBLIC_HELPNOW_WEBSITE_URL ?? 'https://helpnow.citycalls.in').replace(/\/$/, '');

function seoPageLocation(pagePath: string) {
  if (pagePath === HELP_NOW_SEO_PREFIX || pagePath.startsWith(`${HELP_NOW_SEO_PREFIX}/`)) {
    return { origin: HELP_NOW_ORIGIN, path: pagePath.slice(HELP_NOW_SEO_PREFIX.length) || '/' };
  }
  return { origin: WEBSITE_ORIGIN, path: pagePath };
}

// The page's full URL on whichever website it belongs to.
export function seoPageUrl(pagePath: string) {
  const { origin, path } = seoPageLocation(pagePath);
  return `${origin}${path === '/' ? '' : path}`;
}

// How a page's path is shown in admin: City Calls paths as they are, Help Now
// ones with their domain ("helpnow.citycalls.in/services/dish-washing").
export function seoDisplayPath(pagePath: string) {
  const { origin, path } = seoPageLocation(pagePath);
  return origin === WEBSITE_ORIGIN ? path : `${origin.replace(/^https?:\/\//, '')}${path}`;
}

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
