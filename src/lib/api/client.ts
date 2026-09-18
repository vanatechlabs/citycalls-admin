import axios from 'axios';
import { toast } from 'sonner';

// Local to this repo — no shared api-client package exists (multi-repo, per
// docs/coordination/03-code-ownership.md). Base URL points at citycalls-api.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | undefined;

export function setAccessToken(token: string | undefined): void {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Every request through this one shared client gets a toast — success for
// state-changing calls (POST/PUT/PATCH/DELETE, using the standard envelope's
// `message`), error for any failed call (GET included) — without each of the
// ~40 hook files needing its own toast.success/toast.error wiring. GET
// requests don't toast on success (every list/detail fetch would spam one).
apiClient.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    if (method && method !== 'get' && response.data?.message) {
      toast.success(response.data.message);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message ?? error.message ?? 'Something went wrong. Please try again.';
    toast.error(message);
    return Promise.reject(error);
  }
);

// Standard envelope per docs/10-api-standards.md §3-4.
export interface ApiSuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
  meta: { page: number; limit: number; total: number; totalPages: number } | null;
  errors: null;
}

export interface ApiErrorEnvelope {
  success: false;
  message: string;
  data: null;
  errors: { field: string; code: string; message: string }[];
}
