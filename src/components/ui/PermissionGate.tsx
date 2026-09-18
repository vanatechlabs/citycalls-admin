import React from 'react';
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

  if (alwaysVisible) return <>{children}</>;

  const hasPermission = anyOf ? anyCheck : singleCheck;
  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
