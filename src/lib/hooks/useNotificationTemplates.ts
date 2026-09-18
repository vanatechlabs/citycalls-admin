import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';
import { NotificationChannel } from './useNotifications';

export interface NotificationTemplate {
  _id: string;
  triggerKey: string;
  channel: NotificationChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables: string[];
  active: boolean;
  updatedAt: string;
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<NotificationTemplate[]>>('/notification-templates');
      return res.data.data;
    },
  });
}

export interface UpdateNotificationTemplateInput {
  id: string;
  bodyTemplate?: string;
  subjectTemplate?: string;
  active?: boolean;
}

export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation<NotificationTemplate, AxiosError<ApiErrorEnvelope>, UpdateNotificationTemplateInput>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<NotificationTemplate>>(`/notification-templates/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-templates'] }),
  });
}
