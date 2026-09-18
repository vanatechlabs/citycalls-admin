import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface AreaCheckResult {
  serviceable: boolean;
  branchId?: string;
  branchName?: string;
  subBranchId?: string;
  subBranchName?: string;
  city?: string;
  state?: string;
  country?: string;
  district?: string;
}

// A mutation (not a query) even though it's a GET — trigger this on-demand
// (button click / field blur), not automatically on every keystroke, so the
// imperative mutate() call is the right fit.
export function useCheckPincode() {
  return useMutation<AreaCheckResult, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (pincode) => {
      const res = await apiClient.get<ApiSuccessEnvelope<AreaCheckResult>>(`/geo/pincode/${pincode}`);
      return res.data.data;
    },
  });
}

// "City" here follows this business's own convention (confirmed against
// their real paper intake form): our branch name IS the City field when the
// pincode falls inside our own coverage — there's no separate generic postal
// city concept for serviceable areas. Falls back to the real postal city
// (from India Post, via the pincodeAdapter) for areas outside our coverage.
export function areaCityLabel(result: AreaCheckResult): string {
  return result.city ?? result.branchName ?? '';
}
