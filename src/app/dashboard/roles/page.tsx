'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Key, Trash2, Lock, Pencil } from 'lucide-react';

import { useUsers, useCreateUser, useUpdateUser, CreateUserInput, UpdateUserInput, STAFF_ROLES, User } from '@/lib/hooks/useUsers';
import {
  useRoles,
  useCreateRolePermission,
  useUpdateRolePermission,
  useDeleteRolePermission,
  Role,
  RolePermissionRow,
  DataScope,
  DATA_SCOPES,
} from '@/lib/hooks/useRoles';
import { useBranches, useSubBranches, useTeams } from '@/lib/hooks/useOrganization';
import { useVendors } from '@/lib/hooks/useVendors';
import { useMe } from '@/lib/hooks/useAuth';

function AddUserForm({ close }: { close: () => void }) {
  const createUser = useCreateUser();
  const { data: branches } = useBranches();
  const { register, handleSubmit } = useForm<CreateUserInput>({ defaultValues: { role: 'EMPLOYEE' } });

  const onSubmit = (values: CreateUserInput) => {
    createUser.mutate(
      { ...values, branchId: values.branchId || undefined },
      { onSuccess: () => close() }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Full Name" required {...register('name', { required: true })} />
      <AppFormField label="Mobile Number" required {...register('mobile', { required: true })} />
      <AppFormField label="Email (Optional)" type="email" {...register('email')} />
      <AppFormField label="Temporary Password" type="password" required {...register('password', { required: true, minLength: 8 })} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Role</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('role', { required: true })}>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Branch (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('branchId')}>
          <option value="">Unassigned</option>
          {(branches || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {createUser.isError && (
        <p className="text-sm text-destructive">{createUser.error.response?.data?.message ?? 'Failed to create user.'}</p>
      )}

      <Button type="submit" className="w-full" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
}

function EditUserForm({ user, close }: { user: User; close: () => void }) {
  const updateUser = useUpdateUser();
  const { data: branches } = useBranches();
  const { data: vendors } = useVendors();
  const { register, handleSubmit, control } = useForm<Omit<UpdateUserInput, 'id'>>({
    defaultValues: {
      name: user.name,
      email: user.email ?? '',
      role: user.role,
      branchId: user.branchId ?? '',
      subBranchId: user.subBranchId ?? '',
      teamId: user.teamId ?? '',
      vendorId: user.vendorId ?? '',
      status: user.status,
    },
  });
  const branchId = useWatch({ control, name: 'branchId' });
  const { data: subBranches } = useSubBranches(branchId || undefined);
  const { data: teams } = useTeams();
  const branchTeams = teams?.filter((t) => t.branchId === branchId) ?? [];

  const onSubmit = (values: Omit<UpdateUserInput, 'id'>) => {
    updateUser.mutate(
      {
        id: user._id,
        ...values,
        branchId: values.branchId || undefined,
        subBranchId: values.subBranchId || undefined,
        teamId: values.teamId || undefined,
        vendorId: values.vendorId || undefined,
        email: values.email || undefined,
      },
      { onSuccess: () => close() }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Full Name" required {...register('name', { required: true })} />
      <AppFormField label="Mobile Number" value={user.mobile} disabled readOnly />
      <AppFormField label="Email (Optional)" type="email" {...register('email')} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Role</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('role', { required: true })}>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Branch (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('branchId')}>
          <option value="">Unassigned</option>
          {(branches || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Sub-Branch (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" disabled={!branchId} {...register('subBranchId')}>
          <option value="">None</option>
          {(subBranches || []).map((sb) => <option key={sb._id} value={sb._id}>{sb.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Team (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" disabled={!branchId} {...register('teamId')}>
          <option value="">None</option>
          {branchTeams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Vendor (Optional — for vendor-affiliated staff)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('vendorId')}>
          <option value="">None</option>
          {(vendors || []).map((v) => <option key={v._id} value={v._id}>{v.companyName}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Status</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('status', { required: true })}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <p className="text-xs text-muted-foreground">Setting a user to Inactive immediately revokes their active sessions.</p>
      </div>

      {updateUser.isError && (
        <p className="text-sm text-destructive">{updateUser.error.response?.data?.message ?? 'Failed to update user.'}</p>
      )}

      <Button type="submit" className="w-full" disabled={updateUser.isPending}>
        {updateUser.isPending ? 'Saving...' : 'Save Changes'}
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

// Priority: whoever last updated the record (if it was ever updated) is shown
// first/primary; who originally added it is always shown, second if there's
// an update, or alone (as the only line) if the record was never touched since.
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
        <DataTable<RolePermissionRow>
          data={role.permissions}
          pageSize={10}
          emptyMessage="No permissions granted to this role yet."
          columns={[
            { key: 'module', header: 'Module' },
            { key: 'action', header: 'Action' },
            {
              key: 'dataScope',
              header: 'Data Scope',
              render: (item) =>
                role.editable && canManage ? (
                  <select
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                    defaultValue={item.dataScope}
                    onChange={(e) => updatePermission.mutate({ role: role.id, id: item.id, dataScope: e.target.value as DataScope })}
                  >
                    {DATA_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-medium">{item.dataScope}</span>
                ),
            },
            {
              key: 'audit',
              header: 'Audit',
              render: (item) => {
                const { primary, secondary } = auditLines(item);
                return (
                  <div className="text-xs space-y-0.5">
                    <div className="font-medium text-slate-700">{primary}</div>
                    {secondary && <div className="text-muted-foreground">{secondary}</div>}
                  </div>
                );
              },
            },
            ...(role.editable && canManage
              ? [
                  {
                    key: 'actions',
                    header: '',
                    render: (item: RolePermissionRow) => (
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
                    ),
                  },
                ]
              : []),
          ]}
        />
      </CardContent>
    </Card>
  );
}

export default function RolesAndUsersPage() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const selectedRole = roles?.find((r) => r.id === selectedRoleId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Roles & Users</h1>
          <p className="text-[13px] text-muted-foreground">Manage system access, user accounts, and permission matrices.</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">System Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Directory</CardTitle>
                <CardDescription>All employees and admins who can log into the dashboard.</CardDescription>
              </div>
              <FormSheet triggerLabel="Add User" title="Add User" description="Create a staff login for the admin panel.">
                {(close) => <AddUserForm close={close} />}
              </FormSheet>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading users...</div>
              ) : (
                <>
                {/* <p className="text-sm text-muted-foreground mb-2">{users?.length ?? 0} users</p> */}
                <DataTable<User>
                  data={users || []}
                  pageSize={10}
                  columns={[
                    { key: 'name', header: 'Full Name' },
                    { key: 'mobile', header: 'Mobile Number' },
                    { key: 'email', header: 'Email Address', render: (item) => item.email ?? '—' },
                    {
                      key: 'role',
                      header: 'Assigned Role',
                      render: (item) => <span className="font-semibold text-slate-700">{item.role.replace(/_/g, ' ')}</span>,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (item) => <StatusBadge label={item.status} category={item.status === 'ACTIVE' ? 'success' : 'default'} />,
                    },
                    {
                      key: 'modifiedAt',
                      header: 'Modified At',
                      render: (item) => {
                        const { primary, secondary } = auditLines(item);
                        return (
                          <div className="text-xs space-y-0.5">
                            <div className="font-medium text-slate-700">{primary}</div>
                            {secondary && <div className="text-muted-foreground">{secondary}</div>}
                          </div>
                        );
                      },
                    },
                    {
                      key: 'actions',
                      header: '',
                      render: (item) => (
                        <FormSheet
                          triggerLabel="Edit"
                          title="Edit User"
                          description={`Update ${item.name}'s role, branch, or status.`}
                          triggerElement={
                            <Button size="sm" variant="ghost">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          }
                        >
                          {(close) => <EditUserForm user={item} close={close} />}
                        </FormSheet>
                      ),
                    },
                  ]}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Role Permission Matrix
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 mt-1">
                  <Key className="w-3.5 h-3.5" />
                  {isSuperAdmin
                    ? 'Click a role to view and manage its permission grants.'
                    : 'Click a role to view its permission grants. Only Super Admin can make changes.'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading roles...</div>
              ) : (
                <>
                {/* <p className="text-sm text-muted-foreground mb-2">{roles?.length ?? 0} roles</p> */}
                <DataTable<Role>
                  data={roles || []}
                  pageSize={10}
                  onRowClick={(item) => setSelectedRoleId(item.id)}
                  columns={[
                    {
                      key: 'name',
                      header: 'Role Name',
                      render: (item) => (
                        <span className="flex items-center gap-1.5">
                          {item.name}
                          {!item.editable && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                        </span>
                      ),
                    },
                    {
                      key: 'permissions',
                      header: 'Access Scope',
                      render: (item) => <span className="text-sm text-muted-foreground">{item.permissions.length} permissions granted</span>,
                    },
                  ]}
                />
                </>
              )}
            </CardContent>
          </Card>

          {selectedRole && roles && (
            <RolePermissionsPanel role={selectedRole} allRoles={roles} canManage={isSuperAdmin} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
