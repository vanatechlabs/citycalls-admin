import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/site-settings';
const QUERY_KEY = ['site-settings'];

// Settings → Website look: site-wide switches for the public website.
export interface SiteSettings {
  // ON: solid black navbar on every page. OFF: see-through over photo banners.
  solidNavbar: boolean;
}

export interface SiteSettingsResponse extends SiteSettings {
  updatedBy?: { name: string };
  updatedAt?: string;
}

export function useSiteSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<SiteSettingsResponse>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();
  return useMutation<SiteSettingsResponse, AxiosError<ApiErrorEnvelope>, SiteSettings>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<SiteSettingsResponse>>(BASE_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
}
