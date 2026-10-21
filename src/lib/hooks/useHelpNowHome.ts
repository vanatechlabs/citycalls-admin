import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

// Admin → Website Section → Help Now: the helpnow.citycalls.in home page.
// Shapes mirror backend help-now/home-page/helpNowHome.validation.ts.
export type HelpNowSectionStatus = 'ACTIVE' | 'INACTIVE';

export const MARQUEE_ICONS = ['BookOpen', 'Clock', 'ShieldCheck', 'Star', 'Sparkles', 'BadgeCheck', 'Heart', 'Home', 'Zap', 'Users'] as const;
export type MarqueeIcon = (typeof MARQUEE_ICONS)[number];

export const HELP_NOW_HOME_LIMITS = { heroSlides: 6, marqueeItems: 12, aboutPoints: 10, aboutCards: 4, serviceCards: 6, faqItems: 20 } as const;

export interface HeroSlide {
  image: string;
  alt: string;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  active: boolean;
}

export interface HelpNowHomeInputs {
  hero: { slides: HeroSlide[] };
  marquee: { items: { label: string; icon: MarqueeIcon }[]; status: HelpNowSectionStatus };
  about: {
    eyebrow: string;
    heading: string;
    highlight: string;
    headingLine2: string;
    description: string;
    points: string[];
    cards: { title: string; description: string; image: string; alt: string }[];
    status: HelpNowSectionStatus;
  };
  services: {
    cards: { title: string; subtitle: string; subtitle2: string; description: string; image: string; alt: string }[];
    status: HelpNowSectionStatus;
  };
  faq: {
    eyebrow: string;
    heading: string;
    highlight: string;
    description: string;
    items: { question: string; answer: string; image: string; alt: string; active: boolean }[];
    status: HelpNowSectionStatus;
  };
}

export type HelpNowHomeSection = keyof HelpNowHomeInputs;

export type HelpNowHomeSaved<K extends HelpNowHomeSection> = HelpNowHomeInputs[K] & {
  _id: string;
  updatedBy?: { userId?: string; name: string; role?: string };
  updatedAt: string;
};

const path = (section: HelpNowHomeSection) => `/websites/help-now/home-page/${section}`;
const queryKey = (section: HelpNowHomeSection) => ['help-now-home', section];

export function useHelpNowHomeSection<K extends HelpNowHomeSection>(section: K) {
  return useQuery({
    queryKey: queryKey(section),
    queryFn: async () => {
      // The backend creates the section with the website's current content on first open.
      const res = await apiClient.get<ApiSuccessEnvelope<HelpNowHomeSaved<K>>>(path(section), { skipGlobalToast: true });
      return res.data.data;
    },
    // The form is open with unsaved edits; don't reload it behind the user's back.
    refetchOnWindowFocus: false,
  });
}

export function useSaveHelpNowHomeSection<K extends HelpNowHomeSection>(section: K) {
  const queryClient = useQueryClient();
  return useMutation<HelpNowHomeSaved<K>, AxiosError<ApiErrorEnvelope>, HelpNowHomeInputs[K]>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<HelpNowHomeSaved<K>>>(path(section), input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(queryKey(section), data),
  });
}
