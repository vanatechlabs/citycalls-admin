import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope } from '../api/client';
import { AxiosError } from 'axios';

export interface ServiceRequestAddress {
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}
export const SERVICE_REQUEST_STAGES: Record<string, string[]> = {
  Open: ['NEW', 'NEEDS_MANUAL_BRANCH_ASSIGNMENT'],
  Assigned: [
    'ASSIGNED_TO_BRANCH', 'ASSIGNED_TO_SUB_BRANCH', 'ASSIGNED_TO_TEAM', 'ASSIGNED_TO_EMPLOYEE',
    'ASSIGNED_TO_VENDOR', 'OUTSOURCED', 'REASSIGNMENT_REQUIRED', 'ACCEPTED', 'APPOINTMENT_SCHEDULED',
    'RESCHEDULED', 'CUSTOMER_UNAVAILABLE', 'TECHNICIAN_EN_ROUTE', 'TECHNICIAN_ARRIVED',
  ],
  'In Progress': [
    'INSPECTION_STARTED', 'INSPECTION_COMPLETED', 'ESTIMATE_PENDING', 'ESTIMATE_SHARED',
    'AWAITING_CUSTOMER_APPROVAL', 'ESTIMATE_APPROVED', 'ESTIMATE_REJECTED', 'PARTS_PENDING',
    'WORK_STARTED', 'WORK_IN_PROGRESS', 'ON_HOLD',
  ],
  Resolved: [
    'SERVICE_COMPLETED', 'CUSTOMER_CONFIRMATION_PENDING', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID',
    'FOLLOW_UP_PENDING', 'HAPPY_CALL_PENDING', 'CLOSED', 'REOPENED',
  ],
};
export const SERVICE_REQUEST_STAGE_NAMES = Object.keys(SERVICE_REQUEST_STAGES);

export function stageForStatus(status: string): string | null {
  return SERVICE_REQUEST_STAGE_NAMES.find((stage) => SERVICE_REQUEST_STAGES[stage].includes(status)) ?? null;
}

export function stageIndexForStatus(status: string): number {
  const idx = SERVICE_REQUEST_STAGE_NAMES.findIndex((stage) => SERVICE_REQUEST_STAGES[stage].includes(status));
  return idx === -1 ? 0 : idx;
}

export interface ServiceRequestCustomerProduct {
  brand?: string;
  productType?: string;
  modelNumber?: string;
  purchaseDate?: string;
  warrantyExpiresAt?: string;
}

export interface ServiceRequest {
  _id: string;
  number: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
  symptoms?: string[];
  notes?: string;
  scheduledDate?: string;
  scheduledSlot?: string;
  addressSnapshot?: ServiceRequestAddress;
  customerId?: string;
  branchId?: string;
  subBranchId?: string;
  serviceId?: string;
  assigneeType?: string;
  assigneeId?: string;
  isEscalated?: boolean;
  customer?: { name: string; mobile?: string } | null;
  service?: { name: string } | null;
  createdByName?: string | null;
  customerProduct?: ServiceRequestCustomerProduct | null;
  assignee?: { type: string; name: string } | null;
}

export interface AssignmentHistoryEntry {
  _id: string;
  fromAssigneeType?: string;
  toAssigneeType?: string;
  action: string;
  reason?: string;
  actorId?: { _id: string; name: string };
  actorRole: string;
  method: string;
  timestamp: string;
}

export function useAssignmentHistory(id: string) {
  return useQuery({
    queryKey: ['service-request-assignment-history', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<AssignmentHistoryEntry[]>>(`/service-requests/${id}/assignment-history`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export interface ServiceVisitPart {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ServiceVisit {
  _id: string;
  visitNumber: number;
  technicianId: string;
  startedAt?: string;
  arrivedAt?: string;
  inspection: { defectFound?: string; symptoms: string[]; solutionType?: string };
  parts: ServiceVisitPart[];
  labourCharge?: number;
  beforeImages: string[];
  afterImages: string[];
  workNotes?: string;
  completedAt?: string;
  nextVisitDate?: string;
  createdAt: string;
}

export function useServiceVisits(id: string) {
  return useQuery({
    queryKey: ['service-request-visits', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServiceVisit[]>>(`/service-requests/${id}/visits`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

interface ListParams {
  status?: string;
  status_in?: string;
  branchId?: string;
  assigneeId?: string;
  limit?: number;
  vertical?: string;
}

// Every status except CLOSED/CANCELLED — the list endpoint only supports
// $in filtering (status_in), not $nin, so "open" is spelled out explicitly.
export const OPEN_SERVICE_REQUEST_STATUSES = [
  'NEW', 'NEEDS_MANUAL_BRANCH_ASSIGNMENT', 'ASSIGNED_TO_BRANCH', 'ASSIGNED_TO_SUB_BRANCH',
  'ASSIGNED_TO_TEAM', 'ASSIGNED_TO_EMPLOYEE', 'ASSIGNED_TO_VENDOR', 'OUTSOURCED',
  'REASSIGNMENT_REQUIRED', 'ACCEPTED', 'APPOINTMENT_SCHEDULED', 'RESCHEDULED',
  'CUSTOMER_UNAVAILABLE', 'TECHNICIAN_EN_ROUTE', 'TECHNICIAN_ARRIVED', 'INSPECTION_STARTED',
  'INSPECTION_COMPLETED', 'ESTIMATE_PENDING', 'ESTIMATE_SHARED', 'AWAITING_CUSTOMER_APPROVAL',
  'ESTIMATE_APPROVED', 'ESTIMATE_REJECTED', 'PARTS_PENDING', 'WORK_STARTED', 'WORK_IN_PROGRESS',
  'ON_HOLD', 'SERVICE_COMPLETED', 'CUSTOMER_CONFIRMATION_PENDING', 'PAYMENT_PENDING',
  'PARTIALLY_PAID', 'PAID', 'FOLLOW_UP_PENDING', 'HAPPY_CALL_PENDING', 'REOPENED',
].join(',');

export function useServiceRequests(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['service-requests', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServiceRequest[]>>('/service-requests', { params: { limit: 100, ...params } });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useServiceRequestsCount(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['service-requests', 'count', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServiceRequest[]>>('/service-requests', { params: { ...params, limit: 1 } });
      return res.data.meta?.total ?? 0;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: ['service-request', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<ServiceRequest>>(`/service-requests/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation<void, AxiosError<ApiErrorEnvelope>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/service-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export interface CreateServiceRequestInput {
  customerId: string;
  customerProductId?: string;
  addressSnapshot: ServiceRequestAddress;
  serviceId: string;
  symptoms?: string[];
  notes?: string;
  priority?: string;
  source: 'CUSTOMER_APP' | 'CALL' | 'LEAD_CONVERSION' | 'WALK_IN';
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, AxiosError<ApiErrorEnvelope>, CreateServiceRequestInput>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<ServiceRequest>>('/service-requests', input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useUpdateServiceRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, { id: string; toStatus: string; reason?: string }>({
    mutationFn: async ({ id, toStatus, reason }) => {
      const res = await apiClient.patch(`/service-requests/${id}/status`, { toStatus, reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useAssignServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation<unknown, AxiosError<ApiErrorEnvelope>, { id: string; assigneeType: string; assigneeId: string }>({
    mutationFn: async ({ id, assigneeType, assigneeId }) => {
      const res = await apiClient.post(`/service-requests/${id}/assign`, {
        assigneeType,
        assigneeId,
        method: 'MANUAL',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}
