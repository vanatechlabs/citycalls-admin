import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

// Admin → Website Section → Help Now → Service Page Hero: the banner at the
// top of each helpnow.citycalls.in/services/<slug> page. Shapes mirror backend
// help-now/service-heroes/helpNowServiceHero.validation.ts.
export const MAX_SERVICE_HERO_FEATURES = 4;
export type ServiceHeroStatus = 'ACTIVE' | 'INACTIVE';

export interface ServiceHeroFeature {
  title: string;
  subtitle: string;
}

export interface ServiceHeroInput {
  subheading: string;
  heading: string;
  highlight: string;
  description: string;
  features: ServiceHeroFeature[];
  image: string;
  imageAlt: string;
  status: ServiceHeroStatus;
}

export interface ServiceHero extends ServiceHeroInput {
  slug: string;
  name: string;
  path: string;
  // null until the hero is first saved (the form then shows the website's built-in hero).
  _id: string | null;
  saved: boolean;
  updatedBy: { name: string } | null;
  updatedAt: string | null;
}

export interface ServiceHeroOption {
  slug: string;
  name: string;
  path: string;
  saved: boolean;
  status: ServiceHeroStatus | null;
  updatedAt: string | null;
}

const listKey = ['help-now-service-heroes'];
const heroKey = (slug: string) => ['help-now-service-heroes', slug];

export function useServiceHeroOptions() {
  return useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServiceHeroOption[]>>('/websites/help-now/service-heroes', { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useServiceHero(slug: string | null) {
  return useQuery({
    queryKey: heroKey(slug ?? ''),
    enabled: !!slug,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServiceHero>>(`/websites/help-now/service-heroes/${slug}`, { skipGlobalToast: true });
      return res.data.data;
    },
    // The form is open with unsaved edits; don't reload it behind the user's back.
    refetchOnWindowFocus: false,
  });
}

export function useSaveServiceHero(slug: string) {
  const queryClient = useQueryClient();
  return useMutation<ServiceHero, AxiosError<ApiErrorEnvelope>, ServiceHeroInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<ServiceHero>>(`/websites/help-now/service-heroes/${slug}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(heroKey(slug), data);
      void queryClient.invalidateQueries({ queryKey: listKey, exact: true });
    },
  });
}
