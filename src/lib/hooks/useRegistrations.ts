import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

const REGISTRATIONS_PATH = '/registrations';
// The website's own navbar feed — only ACTIVE menus and service links, which
// is exactly the set a customer can be registered for.
const PUBLIC_NAVBAR_PATH = '/public/websites/city-calls/navbar/menus';

// PENDING → ACTIVE → COMPLETED; each move carries a note (see useTransitionRegistration).
export type RegistrationStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';
export type IssueFrequency = 'Always' | 'Sometimes' | 'Occasionally' | 'Once';

export interface RegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  altPhone?: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  language?: string;
  heardFrom?: string;
  referenceName?: string;
  instructions?: string;
  serviceId?: string;
  serviceName: string;
  serviceCategory?: string;
  brand?: string;
  modelNumber?: string;
  applianceType?: string;
  capacity?: string;
  issues: string[];
  issueDescription: string;
  photos?: string[];
  issueFrequency?: IssueFrequency;
  safetyConcern?: string;
  preferredDate?: string;
  timeSlot?: string;
  couponCode?: string;
}

export interface RegistrationActor {
  userId?: string;
  name: string;
  // Current role — only filled on updatedBy in list responses.
  role?: string;
}

export interface StageNote {
  note: string;
  by: RegistrationActor;
  at: string;
}

export interface StatusHistoryEntry {
  from?: RegistrationStatus;
  to: RegistrationStatus;
  note?: string;
  by: RegistrationActor;
  at: string;
}

export interface Registration extends RegistrationInput {
  _id: string;
  registrationNo: string;
  source: 'ADMIN' | 'WEBSITE';
  photos: string[];
  status: RegistrationStatus;
  activationNote?: StageNote;
  completionNote?: StageNote;
  statusHistory: StatusHistoryEntry[];
  // Service-specific answers from the website form (e.g. "Outdoor unit accessible?").
  extraDetails?: { label: string; value: string }[];
  // Unset until first opened in admin (unread badge / popup).
  viewedAt?: string;
  viewedBy?: RegistrationActor;
  createdBy?: RegistrationActor;
  updatedBy?: RegistrationActor;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationFilters {
  q?: string;
  source?: 'ADMIN' | 'WEBSITE';
  serviceCategory?: string;
  serviceId?: string;
  from?: string;
  to?: string;
}

export interface RegistrationListParams extends RegistrationFilters {
  status?: RegistrationStatus;
  page?: number;
  limit?: number;
}

export interface RegistrationListResult {
  items: Registration[];
  total: number;
  page: number;
  limit: number;
}

export interface RegistrationStats {
  total: number;
  today: number;
  couponApplied: number;
  byStatus: Record<RegistrationStatus, number>;
  // Per-category status counts, ignoring the category/service filters.
  byCategory: Record<string, Record<RegistrationStatus, number>>;
  categories: string[];
}

// Drops empty strings so they never reach the API's strict query schema.
function cleanParams<T extends object>(params: T) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}

export function fetchRegistrationPage(params: RegistrationListParams) {
  return apiClient
    .get<ApiSuccessEnvelope<RegistrationListResult>>(REGISTRATIONS_PATH, { params: cleanParams(params), skipGlobalToast: true })
    .then((res) => res.data.data);
}

export function useRegistrations(params: RegistrationListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['registrations', 'list', params],
    queryFn: () => fetchRegistrationPage(params),
    placeholderData: (previous) => previous,
    enabled: options?.enabled ?? true,
  });
}

export function useRegistrationStats(filters: RegistrationFilters, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: ['registrations', 'stats', filters],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<RegistrationStats>>(`${REGISTRATIONS_PATH}/stats`, {
        params: cleanParams(filters),
        skipGlobalToast: true,
      });
      return res.data.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useRegistration(id: string) {
  return useQuery({
    queryKey: ['registrations', 'detail', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<Registration>>(`${REGISTRATIONS_PATH}/${id}`, { skipGlobalToast: true });
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useDeleteRegistration() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`${REGISTRATIONS_PATH}/${id}`, { skipGlobalToast: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });
}

export function useBulkDeleteRegistrations() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number }, AxiosError<ApiErrorEnvelope>, string[]>({
    mutationFn: async (ids) => {
      const res = await apiClient.post<ApiSuccessEnvelope<{ deleted: number }>>(`${REGISTRATIONS_PATH}/bulk-delete`, { ids }, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });
}

export interface ServiceMenu {
  id: string;
  name: string;
  slug: string;
  services: { id: string; name: string; image: string | null; path: string }[];
}

export function useRegistrationServices() {
  return useQuery({
    queryKey: ['registration-services'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServiceMenu[]>>(PUBLIC_NAVBAR_PATH, { skipGlobalToast: true });
      return res.data.data;
    },
  });
}

export function useCreateRegistration() {
  const queryClient = useQueryClient();
  return useMutation<Registration, AxiosError<ApiErrorEnvelope>, RegistrationInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Registration>>(REGISTRATIONS_PATH, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });
}

export function useUpdateRegistration() {
  const queryClient = useQueryClient();
  return useMutation<Registration, AxiosError<ApiErrorEnvelope>, Partial<RegistrationInput> & { id: string }>({
    mutationFn: async ({ id, ...input }) => {
      const res = await apiClient.patch<ApiSuccessEnvelope<Registration>>(`${REGISTRATIONS_PATH}/${id}`, input, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });
}

// PENDING → ACTIVE (activation note) or ACTIVE → COMPLETED (completion note).
export function useTransitionRegistration() {
  const queryClient = useQueryClient();
  return useMutation<Registration, AxiosError<ApiErrorEnvelope>, { id: string; status: 'ACTIVE' | 'COMPLETED'; note: string }>({
    mutationFn: async ({ id, ...body }) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Registration>>(`${REGISTRATIONS_PATH}/${id}/transition`, body, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });
}

// ─── Unread (new) registrations ──────────────────────────────────────────────

export interface UnreadRegistration {
  _id: string;
  registrationNo: string;
  fullName: string;
  phone: string;
  serviceName: string;
  serviceCategory?: string;
  source: 'ADMIN' | 'WEBSITE';
  // Staff member who entered it (admin registrations).
  createdBy?: RegistrationActor;
  createdAt: string;
}

export interface UnreadRegistrations {
  total: number;
  // Category name → unread count (sidebar badges).
  byCategory: Record<string, number>;
  // Same, counting only Pending ones ("Pending Registration" links).
  pendingTotal: number;
  pendingByCategory: Record<string, number>;
  // Newest unread first (popup).
  latest: UnreadRegistration[];
}

export const UNREAD_POLL_MS = 15_000;

// Polled every 15 s while the admin is open (also in background tabs, so the
// popup still sounds). Stops polling if the user can't view registrations.
export function useUnreadRegistrations() {
  return useQuery({
    queryKey: ['registrations', 'unread'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<UnreadRegistrations>>(`${REGISTRATIONS_PATH}/unread`, { skipGlobalToast: true });
      return res.data.data;
    },
    refetchInterval: (query) => ((query.state.error as AxiosError | null)?.response?.status === 403 ? false : UNREAD_POLL_MS),
    refetchIntervalInBackground: true,
    retry: false,
  });
}

// Opening a list page marks the unread rows it shows as read. Only the badge
// counts refresh — the rows keep their "New" tag until the list reloads.
export function useMarkRegistrationsViewed() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: number }, AxiosError<ApiErrorEnvelope>, string[]>({
    mutationFn: async (ids) => {
      const res = await apiClient.post<ApiSuccessEnvelope<{ updated: number }>>(`${REGISTRATIONS_PATH}/view`, { ids }, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations', 'unread'] }),
  });
}

// Opening a registration marks it read (badge count drops).
export function useMarkRegistrationViewed() {
  const queryClient = useQueryClient();
  return useMutation<Registration, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      const res = await apiClient.post<ApiSuccessEnvelope<Registration>>(`${REGISTRATIONS_PATH}/${id}/view`, {}, { skipGlobalToast: true });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });
}
