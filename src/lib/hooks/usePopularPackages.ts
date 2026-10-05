import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/websites/city-calls/home-page/popular-packages';

// Admin → Website Section → Popular Packages: the home page's package cards
// and the heading above them.
export type PackageStatus = 'ACTIVE' | 'INACTIVE';

export interface PopularPackageInput {
  name: string;
  duration: string;
  price: number;
  image: string;
  imageAlt: string;
  // "Popular" badge on the card.
  featured: boolean;
  sortOrder: number;
  status: PackageStatus;
}

export interface PopularPackage extends PopularPackageInput {
  _id: string;
  updatedBy?: { userId?: string; name: string };
  updatedAt: string;
}

export interface PackagesSectionInput {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  status: PackageStatus;
}

export interface PackagesSection extends PackagesSectionInput {
  _id: string;
  updatedBy?: { userId?: string; name: string };
  updatedAt: string;
}

interface PopularPackagesData {
  section: PackagesSection;
  packages: PopularPackage[];
}

const QUERY_KEY = ['popular-packages'];

export function usePopularPackages() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      // First open creates the website's current packages, so the list starts filled.
      const res = await apiClient.get<ApiSuccessEnvelope<PopularPackagesData>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export function useSavePackagesSection() {
  const invalidate = useInvalidate();
  return useMutation<PackagesSection, AxiosError<ApiErrorEnvelope>, PackagesSectionInput>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<PackagesSection>>(`${BASE_PATH}/section`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useCreatePackage() {
  const invalidate = useInvalidate();
  return useMutation<PopularPackage, AxiosError<ApiErrorEnvelope>, PopularPackageInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<PopularPackage>>(`${BASE_PATH}/items`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useUpdatePackage() {
  const invalidate = useInvalidate();
  return useMutation<PopularPackage, AxiosError<ApiErrorEnvelope>, { id: string } & Partial<PopularPackageInput>>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<PopularPackage>>(`${BASE_PATH}/items/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeletePackage() {
  const invalidate = useInvalidate();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${BASE_PATH}/items/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => void invalidate(),
  });
}
