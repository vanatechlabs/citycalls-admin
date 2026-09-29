import axios from 'axios';
import Swal from 'sweetalert2';
import { clearStoredTokens, getStoredRefreshToken, saveTokens } from './tokenStorage';

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
    // Set once a request has been retried after a token refresh.
    _retriedAfterRefresh?: boolean;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

// Local to this repo — no shared api-client package exists (multi-repo, per
// docs/coordination/03-code-ownership.md). Base URL points at citycalls-api.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | undefined;

export function setAccessToken(token: string | undefined): void {
  accessToken = token;
}

// ─── Silent token refresh ────────────────────────────────────────────────────
// The access token is short-lived (JWT_ACCESS_EXPIRES_IN, 15 min in prod); the
// refresh token lasts the whole login (JWT_REFRESH_EXPIRES_IN, 7 days). When a
// request gets 401 we swap the refresh token for a new pair and retry once,
// so the admin stays logged in until the 7-day login itself runs out.

let refreshInFlight: Promise<string | null> | null = null;

// Several requests can 401 at once; they all wait on the same refresh call
// (the backend rotates refresh tokens, so a second parallel refresh would fail).
function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  refreshInFlight ??= axios
    .post<ApiSuccessEnvelope<{ accessToken: string; refreshToken: string }>>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    .then((res) => {
      const { accessToken: nextAccess, refreshToken: nextRefresh } = res.data.data;
      saveTokens(nextAccess, nextRefresh);
      setAccessToken(nextAccess);
      return nextAccess;
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function endSession(): void {
  setAccessToken(undefined);
  clearStoredTokens();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
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
  async (error) => {
    // Login feedback is handled by the login page with SweetAlert2. Avoid
    // showing the same API error again through the global Sonner toaster.
    const isLogin = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLogin) {
      const original = error.config;
      // Expired access token → refresh once and replay the request.
      if (original && !original._retriedAfterRefresh) {
        original._retriedAfterRefresh = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        }
      }
      // Refresh token missing/expired/revoked — the 7-day login is over.
      endSession();
      return Promise.reject(error);
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
