import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';

const BASE_PATH = '/registration-number-settings';
const QUERY_KEY = ['registration-number-settings'];

// Settings → Registration Number: how new registration numbers are built,
// e.g. CC + 2026 + 10 + 07 + 05 = CC2026100705.
export interface RegistrationNumberSettings {
  prefix: string;
  includeYear: boolean;
  includeMonth: boolean;
  includeDay: boolean;
  sequenceDigits: number;
  separator: '' | '-' | '/';
}

export interface RegistrationNumberSettingsResponse extends RegistrationNumberSettings {
  // What the next registration will get with the saved settings.
  nextNumber: string;
  updatedBy?: { name: string };
  updatedAt?: string;
}

export function useRegistrationNumberSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<RegistrationNumberSettingsResponse>>(BASE_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useUpdateRegistrationNumberSettings() {
  const queryClient = useQueryClient();
  return useMutation<RegistrationNumberSettingsResponse, AxiosError<ApiErrorEnvelope>, RegistrationNumberSettings>({
    mutationFn: async (input) => {
      const res = await apiClient.put<ApiSuccessEnvelope<RegistrationNumberSettingsResponse>>(BASE_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
}
