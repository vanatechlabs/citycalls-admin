import React, { useEffect, useState } from 'react';
import { usePermission, useAnyPermission } from '@/lib/hooks/useAuth';

interface PermissionGateProps {
  module?: string;
  action?: string;
  // Visible if the user has ANY of these {module, action} grants — for nav
  // items backed by more than one real backend permission.
  anyOf?: { module: string; action?: string }[];
  // Skips the permission check entirely (e.g. Dashboard, which every
  // authenticated user can see regardless of module-level RBAC).
  alwaysVisible?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ module, action, anyOf, alwaysVisible, children, fallback = null }: PermissionGateProps) {
  // Hooks must run unconditionally — call both, only use the relevant one.
  const singleCheck = usePermission(module ?? '__none__', action);
  const anyCheck = useAnyPermission(anyOf ?? []);

  // GET /auth/me only resolves in the browser (there's no auth context during
  // SSR), so the permission check is unavoidably false on the server. If the
  // client's *first* render already reflected the real (client-only) result —
  // e.g. because the query resolved fast, or a cached value was already in
  // memory from an earlier navigation — that first render would disagree with
  // the server-rendered HTML and React would flag a hydration mismatch. Stay
  // "not mounted" (server-matching) through that first paint, then flip to
  // the real check once hydration is safely done.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (alwaysVisible) return <>{children}</>;
  if (!mounted) return <>{fallback}</>;

  const hasPermission = anyOf ? anyCheck : singleCheck;
  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
