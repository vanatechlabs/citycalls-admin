import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

const OFFER_STRIP_PATH = '/websites/city-calls/home-page/offers/strip';
const OFFERS_PATH = '/websites/city-calls/home-page/offers/deals';

// Field names mirror nextfrontend's OfferStrip.tsx `data` object and the
// offer cards SpotlightCarousel.tsx ("Exclusive Deals") renders.
export type OfferStatus = 'ACTIVE' | 'INACTIVE';

export const OFFER_ICONS = [
  'Gift', 'Fan', 'Sparkles', 'Zap', 'Droplets', 'ShieldCheck', 'Wrench', 'Bug', 'Scissors', 'Tag',
] as const;
export type OfferIcon = (typeof OFFER_ICONS)[number];

export interface OfferStrip {
  textLeft: string;
  discountText: string;
  textRight: string;
  couponCode: string;
  buttonText: string;
  buttonLink: string;
  bgGradientFrom: string;
  bgGradientVia: string;
  bgGradientTo: string;
  discountBg: string;
  discountTextColor: string;
  couponBg: string;
  couponTextColor: string;
  status: OfferStatus;
}

export interface Offer {
  _id: string;
  title: string;
  description?: string;
  couponCode?: string;
  icon: OfferIcon;
  accentColor: string;
  tintColor: string;
  sortOrder: number;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OfferInput {
  title?: string;
  description?: string;
  couponCode?: string;
  icon?: OfferIcon;
  accentColor?: string;
  tintColor?: string;
  sortOrder?: number;
  status?: OfferStatus;
}

export function useOfferStrip() {
  return useQuery({
    queryKey: ['home-offer-strip'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<OfferStrip>>(OFFER_STRIP_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useUpdateOfferStrip() {
  const queryClient = useQueryClient();
  return useMutation<OfferStrip, AxiosError<ApiErrorEnvelope>, Partial<OfferStrip>>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<OfferStrip>>(OFFER_STRIP_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-offer-strip'] }),
  });
}

export function useOffers(params?: { q?: string; status?: OfferStatus }) {
  return useQuery({
    queryKey: ['home-offers', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Offer[]>>(OFFERS_PATH, {
        params,
        skipGlobalToast: true,
      });
      return res.data.data;
    },
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation<Offer, AxiosError<ApiErrorEnvelope>, OfferInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Offer>>(OFFERS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-offers'] }),
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  return useMutation<Offer, AxiosError<ApiErrorEnvelope>, OfferInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Offer>>(`${OFFERS_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-offers'] }),
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${OFFERS_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-offers'] }),
  });
}
