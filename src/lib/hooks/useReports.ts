import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope } from '../api/client';

export const REPORT_KEYS = [
  'service-request-summary',
  'branch-performance',
  'lead-funnel',
  'revenue-summary',
  'technician-performance',
  'campaign-performance',
] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export interface ReportFilterParams {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ServiceRequestSummaryReport {
  byStatus: { status: string; count: number }[];
  totals: { total: number; slaBreached: number; escalated: number };
}

export interface BranchPerformanceRow {
  branchId: string;
  totalServiceRequests: number;
  closed: number;
  completionRate: number;
  revenue: number;
  collected: number;
}

export interface LeadFunnelReport {
  byStage: { stage: string; count: number }[];
  total: number;
  conversionRate: number;
}

export interface RevenueSummaryReport {
  invoiced: number;
  collected: number;
  outstanding: number;
  byStatus: { status: string; count: number; total: number }[];
}

export interface TechnicianPerformanceRow {
  employeeId: string;
  assigned: number;
  completed: number;
  completionRate: number;
}

export interface CampaignPerformanceRow {
  campaignId: string;
  name: string;
  channel: string;
  status: string;
  stats: { sent: number; delivered: number; read: number; failed: number };
}

export type ReportDataMap = {
  'service-request-summary': ServiceRequestSummaryReport;
  'branch-performance': BranchPerformanceRow[];
  'lead-funnel': LeadFunnelReport;
  'revenue-summary': RevenueSummaryReport;
  'technician-performance': TechnicianPerformanceRow[];
  'campaign-performance': CampaignPerformanceRow[];
};

export function useReport<K extends ReportKey>(reportKey: K, params: ReportFilterParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['reports', reportKey, params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ReportDataMap[K]>>(`/reports/${reportKey}`, { params });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}
