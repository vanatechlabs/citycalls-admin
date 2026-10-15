import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/location-pages';

// Admin → Blog Section → Add Location Page / Location Page List: SEO pages
// for a service (or the home page) in one city, at citycalls.in/<slug>.
export type LocationPageStatus = 'PUBLISHED' | 'DRAFT';
export type LocationPageType = 'HOME' | 'SERVICE';

export interface LocationPageFeature {
  title: string;
  subtitle: string;
}

export interface LocationPageInput {
  pageType: LocationPageType;
  // Navbar List service link (SERVICE pages only).
  navServiceId: string | null;
  location: string;
  slug: string;
  heroEyebrow: string;
  title: string;
  highlight: string;
  shortDescription: string;
  features: LocationPageFeature[];
  heroImage: string;
  heroImageAlt: string;
  highlightedHeading: string;
  // Rich text HTML.
  content: string;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  canonicalTag: string;
  ogTitle: string;
  ogImage: string;
  schemaMarkup: string;
  status: LocationPageStatus;
}

export interface LocationPage extends LocationPageInput {
  _id: string;
  // Copied from the selected page when saved.
  serviceName: string;
  servicePath: string;
  menuName: string;
  createdBy?: { name: string };
  updatedBy?: { name: string };
  createdAt: string;
  updatedAt: string;
}

export type LocationPageListItem = Pick<
  LocationPage,
  '_id' | 'pageType' | 'navServiceId' | 'serviceName' | 'servicePath' | 'menuName' | 'location' | 'slug' | 'title' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>;

// "Select Page": the home page, then Navbar List services grouped by menu.
export interface LocationPageOption {
  value: string; // 'HOME' or the service link id
  pageType: LocationPageType;
  name: string;
  path: string;
  inactive?: boolean;
}
export interface LocationPageOptionGroup {
  group: string;
  pages: LocationPageOption[];
}

const LIST_KEY = ['location-pages'];

export function useLocationPageList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<LocationPageListItem[]>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useLocationPage(id: string | null) {
  return useQuery({
    queryKey: ['location-pages', 'item', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<LocationPage>>(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useLocationPageOptions() {
  return useQuery({
    queryKey: ['location-pages', 'options'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<LocationPageOptionGroup[]>>(`${BASE_PATH}/page-options`, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useSaveLocationPage() {
  const queryClient = useQueryClient();
  return useMutation<LocationPage, AxiosError<ApiErrorEnvelope>, { id?: string } & Partial<LocationPageInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<LocationPage>>(`${BASE_PATH}/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<LocationPage>>(BASE_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.setQueryData(['location-pages', 'item', page._id], page);
    },
  });
}

export function useDeleteLocationPage() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
