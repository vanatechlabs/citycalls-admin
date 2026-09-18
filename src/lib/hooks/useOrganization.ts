import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface WorkingHoursRow {
  day: number;
  openTime?: string;
  closeTime?: string;
  closed: boolean;
}

export interface RegisteredAddress {
  line1: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface Branch {
  _id: string;
  name: string;
  code: string;
  coverage?: { pinCodes: string[]; cities: string[]; states: string[] };
  serviceCategoryIds?: string[];
  workingHours?: WorkingHoursRow[];
  holidays?: string[];
  dailyCapacityPerSlot?: number;
  managerId?: string;
  registeredAddress?: RegisteredAddress;
  gstin?: string;
  active: boolean;
  createdAt: string;
}

export interface SubBranch {
  _id: string;
  branchId: string;
  name: string;
  code: string;
  coverage?: { pinCodes: string[] };
  managerId?: string;
  active: boolean;
  createdAt: string;
}

export interface Team {
  _id: string;
  branchId: string;
  subBranchId?: string;
  name: string;
  leadId?: string;
  memberIds: string[];
  active: boolean;
  createdAt: string;
}

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Branch[]>>('/branches', { params: { limit: 100 } });
      return res.data.data;
    },
  });
}

export interface BranchInput {
  name?: string;
  code?: string;
  coverage?: { pinCodes: string[]; cities: string[]; states: string[] };
  serviceCategoryIds?: string[];
  workingHours?: WorkingHoursRow[];
  holidays?: string[];
  dailyCapacityPerSlot?: number;
  managerId?: string;
  registeredAddress?: RegisteredAddress;
  gstin?: string;
  active?: boolean;
}
export type CreateBranchInput = BranchInput & { name: string; code: string };

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation<Branch, AxiosError<ApiErrorEnvelope>, CreateBranchInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Branch>>('/branches', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation<Branch, AxiosError<ApiErrorEnvelope>, BranchInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Branch>>(`/branches/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/branches/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useSubBranches(branchId?: string) {
  return useQuery({
    queryKey: ['sub-branches', branchId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<SubBranch[]>>('/sub-branches', { params: { limit: 100, branchId } });
      return res.data.data;
    },
  });
}

export interface SubBranchInput {
  branchId?: string;
  name?: string;
  code?: string;
  coverage?: { pinCodes: string[] };
  managerId?: string;
  active?: boolean;
}
export type CreateSubBranchInput = SubBranchInput & { branchId: string; name: string; code: string };

export function useCreateSubBranch() {
  const queryClient = useQueryClient();
  return useMutation<SubBranch, AxiosError<ApiErrorEnvelope>, CreateSubBranchInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<SubBranch>>('/sub-branches', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sub-branches'] }),
  });
}

export function useUpdateSubBranch() {
  const queryClient = useQueryClient();
  return useMutation<SubBranch, AxiosError<ApiErrorEnvelope>, SubBranchInput & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<SubBranch>>(`/sub-branches/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sub-branches'] }),
  });
}

export function useDeleteSubBranch() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/sub-branches/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sub-branches'] }),
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Team[]>>('/teams', { params: { limit: 100 } });
      return res.data.data;
    },
  });
}

export interface CreateTeamInput {
  branchId: string;
  subBranchId?: string;
  name: string;
  leadId?: string;
  memberIds?: string[];
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation<Team, AxiosError<ApiErrorEnvelope>, CreateTeamInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Team>>('/teams', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export interface UpdateTeamInput {
  id: string;
  branchId?: string;
  subBranchId?: string;
  name?: string;
  leadId?: string;
  memberIds?: string[];
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation<Team, AxiosError<ApiErrorEnvelope>, UpdateTeamInput>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Team>>(`/teams/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/teams/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}
