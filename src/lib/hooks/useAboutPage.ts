import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/about-page';

// Admin → Website Section → About Page: every section of the website's /about page.
export type AboutStatus = 'ACTIVE' | 'INACTIVE';

// Icons the website can draw (same lists as the backend).
export const ABOUT_VALUE_ICONS = [
  'ShieldCheck', 'Heart', 'Users', 'Award', 'Star', 'ThumbsUp', 'BadgeCheck', 'Sparkles', 'Clock', 'Wrench', 'HandCoins', 'Target',
] as const;
export const ABOUT_MILESTONE_ICONS = [
  'Flag', 'Users', 'Building2', 'Trophy', 'Rocket', 'Star', 'MapPin', 'Award', 'Sparkles', 'Target', 'TrendingUp', 'Heart',
] as const;
export type AboutValueIcon = (typeof ABOUT_VALUE_ICONS)[number];
export type AboutMilestoneIcon = (typeof ABOUT_MILESTONE_ICONS)[number];

export const MAX_HERO_POINTS = 6;
export const MAX_STORY_IMAGES = 4;

interface Saved {
  updatedBy?: { name: string };
  updatedAt?: string;
  // About page record id — uploaded photos are linked to it.
  pageId?: string;
}

export interface AboutHeroInput {
  headingLine1: string;
  headingLine2: string;
  highlight: string;
  description: string;
  points: string[];
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  image: string;
  imageAlt: string;
}

export interface AboutImage {
  image: string;
  imageAlt: string;
}

export interface AboutStoryInput {
  eyebrow: string;
  heading: string;
  highlight: string;
  paragraphOne: string;
  paragraphTwo: string;
  missionTitle: string;
  missionText: string;
  teamTitle: string;
  teamText: string;
  images: AboutImage[];
}

export interface AboutParallaxInput {
  image: string;
  imageAlt: string;
  status: AboutStatus;
}

export interface AboutListHeadingInput {
  eyebrow: string;
  heading: string;
}

export interface AboutValueInput {
  title: string;
  description: string;
  icon: AboutValueIcon;
  sortOrder: number;
  status: AboutStatus;
}

export interface AboutMilestoneInput {
  year: string;
  title: string;
  description: string;
  tag: string;
  icon: AboutMilestoneIcon;
  image: string;
  imageAlt: string;
  sortOrder: number;
  status: AboutStatus;
}

export type AboutHero = AboutHeroInput & Saved;
export type AboutStory = AboutStoryInput & Saved;
export type AboutParallax = AboutParallaxInput & Saved;
export type AboutListHeading = AboutListHeadingInput & Saved;
export type AboutValue = AboutValueInput & { _id: string; updatedAt: string };
export type AboutMilestone = AboutMilestoneInput & { _id: string; updatedAt: string };

const keyFor = (part: string) => ['about-page', part];

function useInvalidate(part: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keyFor(part) });
}

// First open of any section fills it with the website's current content.
function useBlock<T>(part: string) {
  return useQuery({
    queryKey: keyFor(part),
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<T>>(`${BASE_PATH}/${part}`, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useSaveBlock<TInput, TOut>(part: string, path = part) {
  const invalidate = useInvalidate(part);
  return useMutation<TOut, AxiosError<ApiErrorEnvelope>, TInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<TOut>>(`${BASE_PATH}/${path}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

function useSaveItem<TInput, TOut>(part: string) {
  const invalidate = useInvalidate(part);
  return useMutation<TOut, AxiosError<ApiErrorEnvelope>, { id?: string } & Partial<TInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = id
        ? await apiClient.patch<ApiSuccessEnvelope<TOut>>(`${BASE_PATH}/${part}/items/${id}`, input, { skipGlobalToast: true })
        : await apiClient.post<ApiSuccessEnvelope<TOut>>(`${BASE_PATH}/${part}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

function useDeleteItem(part: string) {
  const invalidate = useInvalidate(part);
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/${part}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}

export const useAboutHero = () => useBlock<AboutHero>('hero');
export const useSaveAboutHero = () => useSaveBlock<AboutHeroInput, AboutHero>('hero');

export const useAboutStory = () => useBlock<AboutStory>('story');
export const useSaveAboutStory = () => useSaveBlock<AboutStoryInput, AboutStory>('story');

export const useAboutParallax = () => useBlock<AboutParallax>('parallax');
export const useSaveAboutParallax = () => useSaveBlock<AboutParallaxInput, AboutParallax>('parallax');

export const useAboutValues = () => useBlock<{ section: AboutListHeading; values: AboutValue[] }>('values');
export const useSaveAboutValuesSection = () => useSaveBlock<AboutListHeadingInput, AboutListHeading>('values', 'values/section');
export const useSaveAboutValue = () => useSaveItem<AboutValueInput, AboutValue>('values');
export const useDeleteAboutValue = () => useDeleteItem('values');

export const useAboutJourney = () => useBlock<{ section: AboutListHeading; milestones: AboutMilestone[] }>('journey');
export const useSaveAboutJourneySection = () => useSaveBlock<AboutListHeadingInput, AboutListHeading>('journey', 'journey/section');
export const useSaveAboutMilestone = () => useSaveItem<AboutMilestoneInput, AboutMilestone>('journey');
export const useDeleteAboutMilestone = () => useDeleteItem('journey');
