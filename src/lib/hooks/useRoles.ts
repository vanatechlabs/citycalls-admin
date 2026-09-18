import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export const DATA_SCOPES = ['OWN', 'TEAM', 'SUB_BRANCH', 'BRANCH', 'VENDOR', 'ALL'] as const;
export type DataScope = (typeof DATA_SCOPES)[number];

export interface PermissionActor {
  id: string;
  name: string;
}

export interface RolePermissionRow {
  id: string;
  module: string;
  action: string;
  dataScope: DataScope;
  createdBy: PermissionActor | null;
  createdAt: string | null;
  updatedBy: PermissionActor | null;
  updatedAt: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  editable: boolean;
  permissions: RolePermissionRow[];
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Role[]>>('/roles');
      return res.data.data;
    },
  });
}

export interface CreateRolePermissionInput {
  role: string;
  module: string;
  action: string;
  dataScope: DataScope;
}

export function useCreateRolePermission() {
  const queryClient = useQueryClient();
  return useMutation<RolePermissionRow, AxiosError<ApiErrorEnvelope>, CreateRolePermissionInput>({
    mutationFn: async ({ role, ...input }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<RolePermissionRow>>(`/roles/${role}/permissions`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export interface UpdateRolePermissionInput {
  role: string;
  id: string;
  dataScope: DataScope;
}

export function useUpdateRolePermission() {
  const queryClient = useQueryClient();
  return useMutation<RolePermissionRow, AxiosError<ApiErrorEnvelope>, UpdateRolePermissionInput>({
    mutationFn: async ({ role, id, dataScope }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<RolePermissionRow>>(`/roles/${role}/permissions/${id}`, { dataScope });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export interface DeleteRolePermissionInput {
  role: string;
  id: string;
}

export function useDeleteRolePermission() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, DeleteRolePermissionInput>({
    mutationFn: async ({ role, id }) => {
      await apiClient.delete(`/roles/${role}/permissions/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}
