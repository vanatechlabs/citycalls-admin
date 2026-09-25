import axios from 'axios';
import Swal from 'sweetalert2';

// Same dark, top-end, auto-dismissing toast used across the admin panel's
// own pages (Roles, Staff, Navbar List, etc.) — replaces sonner so every
// create/update/delete across the app gives consistent feedback.
const GlobalToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: '#1e2433',
  color: '#e2e8f0',
});

const toast = {
  success: (message: string) => void GlobalToast.fire({ icon: 'success', title: message, iconColor: '#4ade80' }),
  error: (message: string) => void GlobalToast.fire({ icon: 'error', title: message, iconColor: '#f87171' }),
};

declare module 'axios' {
  interface AxiosRequestConfig {
    skipGlobalToast?: boolean;
  }
}

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
    // /auth/login already shows its own SweetAlert2 success toast on the
    // login page — skip this one so login doesn't double-toast.
    const isLogin = response.config.url?.includes('/auth/login');
    if (method && method !== 'get' && response.data?.message && !isLogin && !response.config.skipGlobalToast) {
      toast.success(response.data.message);
    }
    return response;
  },
  (error) => {
    // Login feedback is handled by the login page with SweetAlert2. Avoid
    // showing the same API error again through the global Sonner toaster.
    const isLogin = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message ?? error.message ?? 'Something went wrong. Please try again.';
    if (!isLogin && !error.config?.skipGlobalToast) {
      toast.error(message);
    }
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
