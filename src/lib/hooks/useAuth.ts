'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient, ApiSuccessEnvelope, ApiErrorEnvelope, setAccessToken } from '../api/client';
import { clearStoredTokens, getStoredAccessToken, getStoredRefreshToken, saveTokens } from '../api/tokenStorage';
import { LoginResponse, MeResponse } from '../types/auth';
import { LoginFormValues, ForgotPasswordFormValues, ResetPasswordFormValues } from '../validation/auth';
import { AxiosError } from 'axios';

// rememberMe controls WHERE the tokens are persisted, not whether the login
// itself succeeds — localStorage survives a browser restart, sessionStorage
// is cleared the moment the tab/browser closes. Defaults to true (localStorage)
// to match the previous always-persistent behavior when the box isn't touched.
export function useLogin() {
  return useMutation<LoginResponse, AxiosError<ApiErrorEnvelope>, LoginFormValues & { rememberMe?: boolean }>({
    mutationFn: async (input) => {
      const res = await apiClient.post<ApiSuccessEnvelope<LoginResponse>>('/auth/login', {
        identifier: input.identifier,
        password: input.password,
      });
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      setAccessToken(data.accessToken);
      if (typeof window !== 'undefined') {
        // A fresh login replaces whatever session this browser had.
        clearStoredTokens();
        const storage = variables.rememberMe === false ? window.sessionStorage : window.localStorage;
        saveTokens(data.accessToken, data.refreshToken, storage);
      }
    },
  });
}

// The stored access token may already be expired — the API client refreshes
// it on the first 401 using the stored refresh token.
export function restoreSession(): void {
  const token = getStoredAccessToken();
  if (token) setAccessToken(token);
}

// Logout: end the session on the server too (so the refresh token can't be
// reused), then forget the tokens locally.
export function clearSession(): void {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    void apiClient.post('/auth/logout', { refreshToken }, { skipGlobalToast: true }).catch(() => undefined);
  }
  setAccessToken(undefined);
  clearStoredTokens();
}

export function useForgotPassword() {
  return useMutation<void, AxiosError<ApiErrorEnvelope>, ForgotPasswordFormValues>({
    mutationFn: async (input) => {
      await apiClient.post('/auth/password/reset-request', input);
    },
  });
}

export function useResetPassword() {
  return useMutation<void, AxiosError<ApiErrorEnvelope>, ResetPasswordFormValues & { token: string }>({
    mutationFn: async (input) => {
      await apiClient.post('/auth/password/reset', { token: input.token, newPassword: input.newPassword });
    },
  });
}

// Fetched once per session (long staleTime — a role's permission set doesn't
// change mid-session) and reused by every usePermission() call via the
// TanStack Query cache, rather than each call site re-fetching independently.
export function useMe() {
  return useQuery<MeResponse, AxiosError<ApiErrorEnvelope>>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessEnvelope<MeResponse>>('/auth/me');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
    // Fail fast (no retry) on a real 401 — the apiClient interceptor already
    // redirects to /login for that case. Retry a couple of times on anything
    // else (network blip, backend mid-restart) instead of getting stuck
    // showing stale/fallback navbar data for the rest of the session.
    retry: (failureCount, error) => error.response?.status !== 401 && failureCount < 2,
  });
}

// Real permission check against the resolved grant set from GET /auth/me —
// module.action, matching the backend's RBAC vocabulary exactly (view/
// create/edit/manageSettings/viewFinancial/assign/export/import), not a
// frontend-invented read/write/create/delete enum. Fails closed: while
// loading or if the user has no grant for this module.action, access is
// denied — never defaults to true.
export function usePermission(module: string, action = 'view'): boolean {
  const { data } = useMe();
  if (!data) return false;
  return Boolean(data.permissions?.[module]?.[action]);
}

// A user can act on ANY of the given {module, action} pairs — used for nav
// items backed by more than one real permission check (e.g. Import/Export,
// which is gated per-entity on the backend, not by one page-level permission).
export function useAnyPermission(checks: { module: string; action?: string }[]): boolean {
  const { data } = useMe();
  if (!data) return false;
  return checks.some((c) => Boolean(data.permissions?.[c.module]?.[c.action ?? 'view']));
}
