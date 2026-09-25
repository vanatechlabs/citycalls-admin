import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

const MENUS_PATH = '/websites/city-calls/navbar/menus';
const SERVICES_PATH = '/websites/city-calls/navbar/services';

export type NavbarStatus = 'ACTIVE' | 'INACTIVE';

export interface NavbarMenu {
  _id: string;
  name: string;
  slug: string;
  sortOrder: number;
  status: NavbarStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NavbarMenuInput {
  name: string;
  slug: string;
  sortOrder?: number;
  status?: NavbarStatus;
}

export interface NavbarService {
  _id: string;
  menuId: string;
  name: string;
  image?: string;
  path: string;
  sortOrder: number;
  status: NavbarStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NavbarServiceInput {
  menuId: string;
  name: string;
  image?: string;
  path: string;
  sortOrder?: number;
  status?: NavbarStatus;
}

export function useNavbarMenus() {
  return useQuery({
    queryKey: ['navbar-menus'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<NavbarMenu[]>>(MENUS_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useCreateNavbarMenu() {
  const queryClient = useQueryClient();
  return useMutation<NavbarMenu, AxiosError<ApiErrorEnvelope>, NavbarMenuInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<NavbarMenu>>(MENUS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['navbar-menus'] }),
  });
}

export function useUpdateNavbarMenu() {
  const queryClient = useQueryClient();
  return useMutation<NavbarMenu, AxiosError<ApiErrorEnvelope>, Partial<NavbarMenuInput> & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<NavbarMenu>>(`${MENUS_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['navbar-menus'] }),
  });
}

export function useDeleteNavbarMenu() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${MENUS_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navbar-menus'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-services'] });
    },
  });
}

export function useNavbarServices(menuId?: string) {
  return useQuery({
    queryKey: ['navbar-services', menuId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<NavbarService[]>>(`${MENUS_PATH}/${menuId}/services`, {
        skipGlobalToast: true,
      });
      return res.data.data;
    },
    enabled: !!menuId,
  });
}

export function useCreateNavbarService() {
  const queryClient = useQueryClient();
  return useMutation<NavbarService, AxiosError<ApiErrorEnvelope>, NavbarServiceInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<NavbarService>>(SERVICES_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['navbar-services', variables.menuId] }),
  });
}

export function useUpdateNavbarService() {
  const queryClient = useQueryClient();
  return useMutation<NavbarService, AxiosError<ApiErrorEnvelope>, Partial<NavbarServiceInput> & { id: string; menuId: string }>({
    // menuId isn't part of the PATCH payload (backend's update schema is
    // .strict() and would 422 on it) — it's only read in onSuccess below, to
    // invalidate the right ['navbar-services', menuId] cache key.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async ({ id, menuId, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<NavbarService>>(`${SERVICES_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['navbar-services', variables.menuId] }),
  });
}

export function useDeleteNavbarService() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, { id: string; menuId: string }>({
    mutationFn: async ({ id }) => {
      await apiClient.delete(`${SERVICES_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['navbar-services', variables.menuId] }),
  });
}
