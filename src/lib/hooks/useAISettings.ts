import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export const AI_FEATURES = ['CALL_SUMMARIZATION', 'COMPLAINT_CLASSIFICATION'] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export interface AISettings {
  provider: 'GEMINI' | 'OPENAI';
  aiModel: string;
  enabled: boolean;
  featureFlags: Record<AiFeature, boolean>;
  usageLimits: {
    maxRequestsPerDay: number;
    maxTokensPerDay: number;
    perRoleMaxRequestsPerDay: Record<string, number>;
  };
}

export function useAISettings() {
  return useQuery({
    queryKey: ['aiSettings'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<AISettings>>('/ai/settings');
      return res.data.data;
    },
  });
}

export interface UpdateAISettingsInput {
  provider?: 'GEMINI' | 'OPENAI';
  model?: string;
  enabled?: boolean;
  featureFlags?: Partial<Record<AiFeature, boolean>>;
  usageLimits?: {
    maxRequestsPerDay?: number;
    maxTokensPerDay?: number;
  };
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();

  return useMutation<AISettings, AxiosError<ApiErrorEnvelope>, UpdateAISettingsInput>({
    mutationFn: async (input) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<AISettings>>('/ai/settings', input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
    },
  });
}

export interface AiFeatureResult {
  aiAvailable: boolean;
  reason?: 'DISABLED' | 'AI_LIMIT_REACHED' | 'PROVIDER_NOT_CONFIGURED' | 'FAILED';
  text?: string;
  category?: string;
}

export function useSummarizeCall() {
  return useMutation<AiFeatureResult, AxiosError<ApiErrorEnvelope>, { callId: string }>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<AiFeatureResult>>('/ai/summarize-call', input);
      return res.data.data;
    },
  });
}

export function useClassifyComplaint() {
  return useMutation<AiFeatureResult, AxiosError<ApiErrorEnvelope>, { text: string; categories?: string[] }>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<AiFeatureResult>>('/ai/classify-complaint', input);
      return res.data.data;
    },
  });
}
