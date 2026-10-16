import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import type { OurServiceInput } from './useOurServices';

const BASE_PATH = '/websites/city-calls/all-services';

// Admin → Pages Section → All Services: a card for every service (same card
// fields as the home page's Our Services).
export type AllServiceCardInput = OurServiceInput;

export interface AllServiceCard extends AllServiceCardInput {
  _id: string;
  // Navbar List menu of the card's service, e.g. "Home Appliance".
  category: string;
  updatedAt: string;
}

const QUERY_KEY = ['all-service-cards'];

export function useAllServiceCards() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<AllServiceCard[]>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useCreateAllServiceCard() {
  const invalidate = useInvalidate();
  return useMutation<AllServiceCard, AxiosError<ApiErrorEnvelope>, AllServiceCardInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<AllServiceCard>>(`${BASE_PATH}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateAllServiceCard() {
  const invalidate = useInvalidate();
  return useMutation<AllServiceCard, AxiosError<ApiErrorEnvelope>, { id: string } & Partial<AllServiceCardInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<AllServiceCard>>(`${BASE_PATH}/items/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteAllServiceCard() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}

// A card for every Navbar List service that has none yet.
export function useImportAllServiceCards() {
  const invalidate = useInvalidate();
  return useMutation<{ created: number }, AxiosError<ApiErrorEnvelope>, void>({
    mutationFn: async () => {
      const res = await apiClient.post<ApiSuccessEnvelope<{ created: number }>>(`${BASE_PATH}/import-navbar`, {}, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}
