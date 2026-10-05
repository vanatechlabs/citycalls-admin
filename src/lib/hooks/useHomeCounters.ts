import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const COUNTERS_PATH = '/websites/city-calls/home-page/counters';

// Admin → Website Section → Counters: the home page's number cards.
export const COUNTER_ICONS = [
  'users', 'shield-check', 'timer', 'star', 'award', 'thumbs-up', 'wrench', 'house', 'clock', 'map-pin',
] as const;
export type CounterIcon = (typeof COUNTER_ICONS)[number];
export type CountersStatus = 'ACTIVE' | 'INACTIVE';
export const MAX_COUNTERS = 4;

export interface CounterItem {
  value: number;
  suffix: string;
  label: string;
  icon: CounterIcon;
  image: string;
  imageAlt: string;
}

export interface HomeCountersInput {
  items: CounterItem[];
  status: CountersStatus;
}

export interface HomeCounters extends HomeCountersInput {
  _id: string;
  updatedBy?: { userId?: string; name: string };
  updatedAt: string;
}

const QUERY_KEY = ['home-counters'];

export function useHomeCounters() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // The backend creates the entry with the website's current counters on first open.
      const res = await apiClient.get<ApiSuccessEnvelope<HomeCounters>>(COUNTERS_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useSaveHomeCounters() {
  const queryClient = useQueryClient();
  return useMutation<HomeCounters, AxiosError<ApiErrorEnvelope>, HomeCountersInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<HomeCounters>>(COUNTERS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
}
