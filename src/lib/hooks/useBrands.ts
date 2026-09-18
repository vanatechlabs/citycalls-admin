import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope } from '../api/client';

export interface Brand {
  id: string;
  key: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Brand[]>>('/brands');
      return res.data.data;
    },
  });
}
