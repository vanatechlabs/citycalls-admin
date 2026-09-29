import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const SOCIAL_LINKS_PATH = '/websites/city-calls/social-links';

// Admin → SEO Section → Social Media: the website's social sidebar links and
// the call / WhatsApp floating buttons.
export interface SocialLinksInput {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  whatsappNumber: string;
  whatsappMessage: string;
  callNumber: string;
}

export interface SocialLinks extends Partial<SocialLinksInput> {
  _id: string;
  updatedBy?: { userId?: string; name: string };
  updatedAt: string;
}

export function useSocialLinks() {
  return useQuery({
    queryKey: ['social-links'],
    queryFn: async () => {
      // null until the page is saved for the first time.
      const res = await apiClient.get<ApiSuccessEnvelope<SocialLinks | null>>(SOCIAL_LINKS_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useSaveSocialLinks() {
  const queryClient = useQueryClient();
  return useMutation<SocialLinks, AxiosError<ApiErrorEnvelope>, SocialLinksInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<SocialLinks>>(SOCIAL_LINKS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(['social-links'], data),
  });
}
