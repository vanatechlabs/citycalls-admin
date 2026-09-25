import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope } from '../api/client';

export interface DashboardRangeCounts {
  calls: number;
  leads: number;
  serviceRequests: number;
  revenue: number;
  from: string;
  to: string;
}

export interface DashboardRangeStats {
  today: DashboardRangeCounts;
  thisWeek: DashboardRangeCounts;
  custom: DashboardRangeCounts;
}

export interface DashboardRangeStatsParams {
  startDate?: string;
  endDate?: string;
}

// Powers the dashboard's TODAY / THIS WEEK / CUSTOM DATE panel — one call
// returns all three ranges together (the backend computes "today"/"this
// week" itself so they can't drift across browser timezones).
export function useDashboardRangeStats(params: DashboardRangeStatsParams) {
  return useQuery({
    queryKey: ['dashboard', 'range-stats', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<DashboardRangeStats>>('/dashboard/range-stats', { params });
      return res.data.data;
    },
  });
}
