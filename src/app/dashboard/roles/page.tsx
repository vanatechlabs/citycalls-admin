'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { ShieldCheck, Key, Trash2, Lock, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import {
  useRoles,
  useCreateCustomRole,
  useDeleteCustomRole,
  useUpdateRoleStatus,
  useCreateRolePermission,
  useUpdateRolePermission,
  useDeleteRolePermission,
  Role,
  RolePermissionRow,
  DataScope,
  DATA_SCOPES,
} from '@/lib/hooks/useRoles';
import { useMe } from '@/lib/hooks/useAuth';

// Same dark, top-end, auto-dismissing toast used on the login page and on
// the Bharat admin panel this was matched to.
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: '#1e2433',
  color: '#e2e8f0',
});

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  Toast.fire({
    icon,
    title,
    iconColor: icon === 'success' ? '#4ade80' : icon === 'error' ? '#f87171' : '#60a5fa',
  });
}

function AddRoleForm({ close }: { close: () => void }) {
  const createRole = useCreateCustomRole();
  const { register, handleSubmit } = useForm<{ name: string; description?: string }>();

  const onSubmit = (values: { name: string; description?: string }) => {
    createRole.mutate(values, {
      onSuccess: () => {
        showToast('success', `Role "${values.name}" created`);
        close();
      },
      onError: (err) => showToast('error', err.response?.data?.message ?? 'Failed to create role'),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Role Name" placeholder="e.g., Sales Manager" required {...register('name', { required: true, minLength: 2 })} />
      <AppFormField label="Description (Optional)" placeholder="What this role is for" {...register('description')} />
      <p className="text-xs text-muted-foreground">
        The role starts with zero permissions — grant it access to modules from the Manage panel after creating it.
      </p>
      <Button
        type="submit"
        disabled={createRole.isPending}
        className="w-full bg-[#3e8914] hover:bg-[#347311] text-white font-bold uppercase tracking-wider text-xs"
      >
        {createRole.isPending ? 'Creating...' : 'Create Role'}
      </Button>
    </form>
  );
}

function AddPermissionForm({
  role,
  existingModules,
  existingActions,
  close,
}: {
  role: string;
  existingModules: string[];
  existingActions: string[];
  close: () => void;
}) {
  const createPermission = useCreateRolePermission();
  const { register, handleSubmit } = useForm<{ module: string; action: string; dataScope: DataScope }>({
    defaultValues: { dataScope: 'ALL' },
  });

  const onSubmit = (values: { module: string; action: string; dataScope: DataScope }) => {
    createPermission.mutate({ role, ...values }, { onSuccess: () => close() });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Module" list="module-options" required {...register('module', { required: true })} />
      <datalist id="module-options">
        {existingModules.map((m) => <option key={m} value={m} />)}
      </datalist>

      <AppFormField label="Action" list="action-options" required {...register('action', { required: true })} />
      <datalist id="action-options">
        {existingActions.map((a) => <option key={a} value={a} />)}
      </datalist>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Data Scope</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('dataScope', { required: true })}>
          {DATA_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {createPermission.isError && (
        <p className="text-sm text-destructive">{createPermission.error.response?.data?.message ?? 'Failed to add permission.'}</p>
      )}

      <Button type="submit" className="w-full" disabled={createPermission.isPending}>
        {createPermission.isPending ? 'Adding...' : 'Add Permission'}
      </Button>
    </form>
  );
}

interface Auditable {
  createdBy?: { name: string } | null;
  createdAt?: string | null;
  updatedBy?: { name: string } | null;
  updatedAt?: string | null;
}

function auditLines(row: Auditable) {
  const added = `Added by ${row.createdBy?.name ?? 'System (seed)'}${row.createdAt ? ` · ${new Date(row.createdAt).toLocaleString()}` : ''}`;
  if (!row.updatedBy) {
    return { primary: added, secondary: null };
  }
  const updated = `Updated by ${row.updatedBy.name}${row.updatedAt ? ` · ${new Date(row.updatedAt).toLocaleString()}` : ''}`;
  return { primary: updated, secondary: added };
}

function RolePermissionsPanel({ role, allRoles, canManage }: { role: Role; allRoles: Role[]; canManage: boolean }) {
  const updatePermission = useUpdateRolePermission();
  const deletePermission = useDeleteRolePermission();

  const existingModules = Array.from(new Set(allRoles.flatMap((r) => r.permissions.map((p) => p.module)))).sort();
  const existingActions = Array.from(new Set(allRoles.flatMap((r) => r.permissions.map((p) => p.action)))).sort();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{role.name} Permissions</CardTitle>
          <CardDescription>
            {role.editable
              ? canManage
                ? 'Add, change, or remove individual module/action grants for this role.'
                : 'Only Super Admin can add, edit, or remove permissions.'
              : "Super Admin has full access to every module by design — its permissions can't be edited here."}
          </CardDescription>
        </div>
        {role.editable && canManage && (
          <FormSheet triggerLabel="Add Permission" title="Add Permission" description={`Grant ${role.name} access to a module/action.`}>
            {(close) => (
              <AddPermissionForm role={role.id} existingModules={existingModules} existingActions={existingActions} close={close} />
            )}
          </FormSheet>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border-2 border-gray-200">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#3e8914]">
                <th className="px-3 py-2 text-[11px] font-bold text-white uppercase tracking-wider">Module</th>
                <th className="px-3 py-2 text-[11px] font-bold text-white uppercase tracking-wider">Action</th>
                <th className="px-3 py-2 text-[11px] font-bold text-white uppercase tracking-wider">Data Scope</th>
                <th className="px-3 py-2 text-[11px] font-bold text-white uppercase tracking-wider">Audit</th>
                {role.editable && canManage && (
                  <th className="px-3 py-2 text-[11px] font-bold text-white uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {role.permissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No permissions granted to this role yet.</td>
                </tr>
              ) : (
                role.permissions.map((item) => {
                  const { primary, secondary } = auditLines(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">{item.module}</td>
                      <td className="px-3 py-2 text-sm">{item.action}</td>
                      <td className="px-3 py-2 text-sm">
                        {role.editable && canManage ? (
                          <select
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                            defaultValue={item.dataScope}
                            onChange={(e) => updatePermission.mutate({ role: role.id, id: item.id, dataScope: e.target.value as DataScope })}
                          >
                            {DATA_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className="font-medium">{item.dataScope}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs space-y-0.5">
                        <div className="font-medium text-slate-700">{primary}</div>
                        {secondary && <div className="text-muted-foreground">{secondary}</div>}
                      </td>
                      {role.editable && canManage && (
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (window.confirm(`Remove ${item.module}.${item.action} from ${role.name}?`)) {
                                deletePermission.mutate({ role: role.id, id: item.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RolesPermissionsPage() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const updateRoleStatus = useUpdateRoleStatus();
  const selectedRole = roles?.find((r) => r.id === selectedRoleId) ?? null;
  const deleteRole = useDeleteCustomRole();

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRoles = roles?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRoles / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedRoles = (roles ?? []).slice(startIndex, startIndex + PAGE_SIZE);

  const handleStatusChange = (role: Role, newStatus: 'ACTIVE' | 'INACTIVE') => {
    updateRoleStatus.mutate(
      { role: role.id, status: newStatus },
      {
        onSuccess: () => showToast('success', `"${role.name}" status changed to ${newStatus}`),
        onError: (err) => showToast('error', err.response?.data?.message ?? 'Failed to update role status'),
      }
    );
  };

  const handleDeleteRole = (role: Role) => {
    if (!window.confirm(`Delete the "${role.name}" role? This cannot be undone.`)) return;
    deleteRole.mutate(role.id, {
      onSuccess: () => {
        showToast('success', `Role "${role.name}" deleted`);
        if (selectedRoleId === role.id) setSelectedRoleId(null);
      },
      onError: (err) => showToast('error', err.response?.data?.message ?? 'Failed to delete role'),
    });
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        {/* TOP HEADING */}
        <div className="mb-[20px] flex shrink-0 items-center justify-between border-b-[2px] border-[#293681] pb-[8px]">
          <div>
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">
              Roles &amp; Permissions
            </h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
              Admin only — defines what every internal role can see and do.
            </p>
          </div>

          {isSuperAdmin && (
            <FormSheet
              triggerLabel="New Role"
              title="New Role"
              description="Create a custom role — you'll grant it module/action permissions afterward."
              triggerElement={
                <button
                  type="button"
                  className="flex h-[30px] items-center justify-center gap-[5px] rounded-[6px] bg-[#4B1426] px-[14px] text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] transition hover:bg-[#3a0f1d]"
                >
                  <Plus className="h-[12px] w-[12px]" strokeWidth={1.7} />
                  New Role
                </button>
              }
            >
              {(close) => <AddRoleForm close={close} />}
            </FormSheet>
          )}
        </div>

        {/* ROLES TABLE — clean border, no radius, no box shadow */}
        <div className="mt-[4px] flex min-h-0 flex-1 flex-col overflow-hidden bg-white border border-[#e8e5df]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="h-[32px] border-b border-[#e8e5df] bg-[#233D4D]">
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Role Name</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Role Slug</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Description</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Permissions</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Status</th>
                  <th className="px-[12px] py-[6px] text-right text-[12px] font-bold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0ec]">
                {rolesLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-[12px] text-[#6c7587]">
                        <Loader2 className="h-4 w-4 animate-spin text-[#293681]" />
                        <span>Loading roles...</span>
                      </div>
                    </td>
                  </tr>
                ) : !roles || roles.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-[12px] text-[#6c7587]">No roles found.</td></tr>
                ) : (
                  paginatedRoles.map((r) => {
                    const isSystemRole = !r.editable;
                    return (
                      <tr key={r.id} className="transition hover:bg-slate-50/80 cursor-pointer" onClick={() => setSelectedRoleId(r.id)}>
                        {/* ROLE NAME */}
                        <td className="px-[12px] py-[8px]">
                          <div className="flex items-center gap-1.5">
                            {isSystemRole ? (
                              <span title="System Role" className="inline-flex">
                                <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                              </span>
                            ) : (
                              <ShieldCheck className="h-3 w-3 text-[#293681] shrink-0" />
                            )}
                            <span className="text-[12px] font-semibold text-[#4B1426]">{r.name}</span>
                            {isSystemRole && (
                              <span className="rounded-[3px] bg-amber-50 px-1 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">SYSTEM</span>
                            )}
                          </div>
                        </td>

                        {/* ROLE SLUG */}
                        <td className="px-[12px] py-[8px]">
                          <span className="rounded-[4px] bg-[#f0f4f8] px-[6px] py-[2px] font-mono text-[11px] font-semibold text-[#233D4D]">
                            {r.id}
                          </span>
                        </td>

                        {/* DESCRIPTION */}
                        <td className="px-[12px] py-[8px]">
                          <span className="text-[11px] font-medium text-[#334155] line-clamp-1 max-w-[280px] block">{r.description || '—'}</span>
                        </td>

                        {/* PERMISSIONS BADGE */}
                        <td className="px-[12px] py-[8px]">
                          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#fef2f2] px-[6px] py-[2px] text-[11px] font-bold text-[#dc2626] border border-[#fecdd3]">
                            {r.permissions.length} Permissions
                          </span>
                        </td>

                        {/* STATUS DROPDOWN — matches the Bharat admin panel's
                            Roles page. Only custom roles (customRoles.model.ts)
                            have a real status to persist; built-in roles
                            (SUPER_ADMIN down to CALL_EXECUTIVE) aren't DB
                            documents, so they show a fixed badge instead. */}
                        <td className="px-[12px] py-[8px]">
                          {r.isCustom ? (
                            <select
                              key={`${r.id}-${r.status}`}
                              value={r.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => { e.stopPropagation(); handleStatusChange(r, e.target.value as 'ACTIVE' | 'INACTIVE'); }}
                              className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                                r.status === 'ACTIVE'
                                  ? 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]'
                                  : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                              }`}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                              }}
                            >
                              <option value="ACTIVE" className="bg-white text-[#23714a] font-bold">ACTIVE</option>
                              <option value="INACTIVE" className="bg-white text-[#dc2626] font-bold">INACTIVE</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex h-[24px] items-center rounded-[4px] px-[8px] text-[11px] font-bold border ${
                                isSystemRole
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-[#e8f5e9] text-[#23714a] border-[#a5d6a7]'
                              }`}
                            >
                              {isSystemRole ? 'SYSTEM' : 'ACTIVE'}
                            </span>
                          )}
                        </td>

                        {/* ACTIONS — glass icon buttons */}
                        <td className="px-[12px] py-[8px] text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Manage Permissions"
                              onClick={(e) => { e.stopPropagation(); setSelectedRoleId(r.id); }}
                              className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95"
                            >
                              <Key className="h-[12px] w-[12px]" />
                            </button>
                            {r.isCustom ? (
                              <button
                                type="button"
                                title="Delete Role"
                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(r); }}
                                className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95"
                              >
                                <Trash2 className="h-[12px] w-[12px]" />
                              </button>
                            ) : (
                              <div
                                title="Built-in role — protected"
                                className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              >
                                <Lock className="h-[11px] w-[11px]" />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalRoles > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#2563eb]">
                  Total Roles: <strong className="font-bold text-[#1d4ed8]">{totalRoles}</strong>
                </span>
                <span className="text-[11px] text-[#8a92a0]">
                  (Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalRoles)} of {totalRoles})
                </span>
              </div>

              <div className="flex items-center gap-[4px]">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] border px-1.5 text-[11px] font-bold transition ${
                      p === safePage ? 'border-[#233D4D] bg-[#233D4D] text-white shadow-xs' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedRole && roles && (
          <div className="mt-6">
            <RolePermissionsPanel role={selectedRole} allRoles={roles} canManage={isSuperAdmin} />
          </div>
        )}
      </div>
    </div>
  );
}
