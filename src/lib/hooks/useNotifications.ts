import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'WHATSAPP' | 'SMS';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED_INTEGRATION_DISABLED';

export interface Notification {
  _id: string;
  templateId: string;
  triggerKey: string;
  channel: NotificationChannel;
  recipientMobile?: string;
  recipientEmail?: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  retryCount: number;
  sentAt?: string;
  readAt?: string;
  failureReason?: string;
  createdAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Notification[]>>('/notifications', { params: { limit: 100 } });
      return res.data.data;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<{ count: number }>>('/notifications/unread-count');
      return res.data.data.count;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<Notification, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Notification>>(`/notifications/${id}/read`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
