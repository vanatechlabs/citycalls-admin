import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/home-page/testimonials';

// Admin → Pages Section → Testimonials: the home page's review carousel.
export const TESTIMONIAL_STATUSES = ['PUBLISHED', 'PENDING', 'HIDDEN'] as const;
export type TestimonialStatus = (typeof TESTIMONIAL_STATUSES)[number];

export interface TestimonialInput {
  name: string;
  role: string;
  location: string;
  rating: number;
  message: string;
  // Initials badge colour.
  color: string;
  sortOrder: number;
  status: TestimonialStatus;
}

export interface Testimonial extends TestimonialInput {
  _id: string;
  createdBy?: { name: string };
  updatedBy?: { name: string };
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialsSectionInput {
  eyebrow: string;
  heading: string;
  highlight: string;
  // Only published reviews with at least this many stars show on the website.
  minRating: number;
}

export interface TestimonialsSection extends TestimonialsSectionInput {
  updatedBy?: { name: string };
  updatedAt?: string;
}

interface TestimonialsData {
  section: TestimonialsSection;
  testimonials: Testimonial[];
}

const QUERY_KEY = ['testimonials'];

export function useTestimonials() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // First open creates the website's current reviews, so the list starts filled.
      const res = await apiClient.get<ApiSuccessEnvelope<TestimonialsData>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useCreateTestimonial() {
  const invalidate = useInvalidate();
  return useMutation<Testimonial, AxiosError<ApiErrorEnvelope>, TestimonialInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Testimonial>>(`${BASE_PATH}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateTestimonial() {
  const invalidate = useInvalidate();
  return useMutation<Testimonial, AxiosError<ApiErrorEnvelope>, { id: string } & Partial<TestimonialInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Testimonial>>(`${BASE_PATH}/items/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteTestimonial() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateTestimonialsSection() {
  const invalidate = useInvalidate();
  return useMutation<TestimonialsSection, AxiosError<ApiErrorEnvelope>, TestimonialsSectionInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<TestimonialsSection>>(`${BASE_PATH}/section`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}
