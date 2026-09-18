import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

// Staff-assignable roles — excludes CUSTOMER/BUSINESS_CUSTOMER, which are
// created via the customer-facing apps, not this admin user directory.
export const STAFF_ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_ADMIN', 'BRANCH_ADMIN', 'SUB_BRANCH_ADMIN',
  'BRANCH_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'TECHNICIAN', 'CALL_EXECUTIVE',
  'CUSTOMER_SUPPORT_EXECUTIVE', 'HAPPY_CALL_EXECUTIVE', 'SALES_EXECUTIVE',
  'MARKETING_EXECUTIVE', 'FINANCE_EXECUTIVE', 'ACCOUNTANT', 'VENDOR_OWNER',
  'VENDOR_MANAGER', 'VENDOR_TECHNICIAN', 'OUTSOURCED_PARTNER',
] as const;

export interface UserActor {
  id: string;
  name: string;
}

export interface User {
  _id: string;
  name: string;
  role: string;
  email?: string;
  mobile: string;
  status: 'ACTIVE' | 'INACTIVE';
  branchId?: string;
  subBranchId?: string;
  teamId?: string;
  vendorId?: string;
  createdBy?: UserActor | null;
  updatedBy?: UserActor | null;
  createdAt: string;
  updatedAt: string;
}

export function useUsers(role?: string) {
  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<User[]>>('/users', { params: { role, limit: 100 } });
      return res.data.data;
    },
  });
}

export interface CreateUserInput {
  name: string;
  mobile: string;
  email?: string;
  password: string;
  role: string;
  branchId?: string;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<User, AxiosError<ApiErrorEnvelope>, CreateUserInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<User>>('/users', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  branchId?: string;
  subBranchId?: string;
  teamId?: string;
  vendorId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation<User, AxiosError<ApiErrorEnvelope>, UpdateUserInput>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<User>>(`/users/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
