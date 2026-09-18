import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope } from '../api/client';

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  module: string;
  entityType: string;
  entityId: string;
  reason?: string;
  createdAt: string;
}

// Real RBAC module vocabulary this app's controllers actually log against
// (matches ALL_BUILT_MODULES in citycalls-api/scripts/seed.ts) — not a
// frontend-invented list.
export const AUDIT_LOG_MODULES = [
  'users', 'organization', 'config', 'employees', 'vendors', 'customers', 'catalog',
  'calls', 'leads', 'serviceRequests', 'fieldExecution', 'files', 'finance',
  'happyCalls', 'marketing', 'ai', 'reports',
] as const;

export interface AuditLogParams {
  page?: number;
  limit?: number;
  module?: string;
  entityType?: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  meta: { page: number; limit: number; total: number; totalPages: number } | null;
}

export function useAuditLogs(params?: AuditLogParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['auditLogs', params],
    queryFn: async (): Promise<AuditLogPage> => {
      const res = await apiClient.get<ApiSuccessEnvelope<AuditLog[]>>('/audit/logs', {
        params: { limit: 20, ...params, module: params?.module || undefined, entityType: params?.entityType || undefined },
      });
      return { items: res.data.data, meta: res.data.meta };
    },
    enabled: options?.enabled ?? true,
  });
}
