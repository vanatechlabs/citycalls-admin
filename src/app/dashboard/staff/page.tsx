'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Pencil, Trash2, ExternalLink, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';

import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, CreateUserInput, UpdateUserInput, STAFF_ROLES, User } from '@/lib/hooks/useUsers';
import { useBranches, useSubBranches, useTeams } from '@/lib/hooks/useOrganization';
import { useVendors } from '@/lib/hooks/useVendors';

// Same dark, top-end, auto-dismissing toast used on the Roles & Permissions
// page and matched to the Bharat admin panel.
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: '#1e2433',
  color: '#e2e8f0',
});

function showToast(icon: 'success' | 'error', title: string) {
  Toast.fire({ icon, title, iconColor: icon === 'success' ? '#4ade80' : '#f87171' });
}

// Shared field styling for the Add/Edit staff forms — tighter radius and a
// brand-matched focus ring instead of the generic shadcn default, so these
// forms read as part of the same admin panel as the wine-accented pages.
const FIELD_INPUT_CLASS =
  'rounded-[6px] border-[#d8dce2] bg-white px-[10px] text-[13px] text-[#18233b] shadow-none focus-visible:border-[#4B1426] focus-visible:ring-[#4B1426]/15 disabled:bg-[#f8fafc] disabled:text-[#94a3b8]';
const FIELD_SELECT_CLASS =
  'w-full h-9 rounded-[6px] border border-[#d8dce2] bg-white px-[10px] text-[13px] text-[#18233b] outline-none transition focus:border-[#4B1426] focus:ring-2 focus:ring-[#4B1426]/15 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#94a3b8]';
const FIELD_LABEL_CLASS = 'text-[13px] font-semibold text-[#334155]';

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
      <AppFormField label="Full Name" required className={FIELD_INPUT_CLASS} {...register('name', { required: true })} />
      <AppFormField label="Mobile Number" required className={FIELD_INPUT_CLASS} {...register('mobile', { required: true })} />
      <AppFormField label="Email (Optional)" type="email" className={FIELD_INPUT_CLASS} {...register('email')} />
      <AppFormField label="Temporary Password" type="password" required className={FIELD_INPUT_CLASS} {...register('password', { required: true, minLength: 8 })} />

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Role</Label>
        <select className={FIELD_SELECT_CLASS} {...register('role', { required: true })}>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Branch (Optional)</Label>
        <select className={FIELD_SELECT_CLASS} {...register('branchId')}>
          <option value="">Unassigned</option>
          {(branches || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {createUser.isError && (
        <p className="text-sm text-destructive">{createUser.error.response?.data?.message ?? 'Failed to create user.'}</p>
      )}

      <Button
        type="submit"
        disabled={createUser.isPending}
        className="w-full rounded-[6px] bg-[#4B1426] text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
      >
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
      <AppFormField label="Full Name" required className={FIELD_INPUT_CLASS} {...register('name', { required: true })} />
      <AppFormField label="Mobile Number" value={user.mobile} disabled readOnly className={FIELD_INPUT_CLASS} />
      <AppFormField label="Email (Optional)" type="email" className={FIELD_INPUT_CLASS} {...register('email')} />

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Role</Label>
        <select className={FIELD_SELECT_CLASS} {...register('role', { required: true })}>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Branch (Optional)</Label>
        <select className={FIELD_SELECT_CLASS} {...register('branchId')}>
          <option value="">Unassigned</option>
          {(branches || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Sub-Branch (Optional)</Label>
        <select className={FIELD_SELECT_CLASS} disabled={!branchId} {...register('subBranchId')}>
          <option value="">None</option>
          {(subBranches || []).map((sb) => <option key={sb._id} value={sb._id}>{sb.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Team (Optional)</Label>
        <select className={FIELD_SELECT_CLASS} disabled={!branchId} {...register('teamId')}>
          <option value="">None</option>
          {branchTeams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Vendor (Optional — for vendor-affiliated staff)</Label>
        <select className={FIELD_SELECT_CLASS} {...register('vendorId')}>
          <option value="">None</option>
          {(vendors || []).map((v) => <option key={v._id} value={v._id}>{v.companyName}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL_CLASS}>Status</Label>
        <select className={FIELD_SELECT_CLASS} {...register('status', { required: true })}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <p className="text-[11px] font-medium text-[#94a3b8]">Setting a user to Inactive immediately revokes their active sessions.</p>
      </div>

      {updateUser.isError && (
        <p className="text-sm text-destructive">{updateUser.error.response?.data?.message ?? 'Failed to update user.'}</p>
      )}

      <Button
        type="submit"
        disabled={updateUser.isPending}
        className="w-full rounded-[6px] bg-[#4B1426] text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
      >
        {updateUser.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

export default function StaffPage() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const updateStatus = useUpdateUser();
  const deleteUser = useDeleteUser();

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalStaff = users?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalStaff / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedUsers = (users ?? []).slice(startIndex, startIndex + PAGE_SIZE);

  const handleStatusChange = (u: User, status: 'ACTIVE' | 'INACTIVE') => {
    if (u.status === status) return;
    updateStatus.mutate(
      { id: u._id, status },
      {
        onSuccess: () => showToast('success', `"${u.name}" status changed to ${status}`),
        onError: (err) => showToast('error', err.response?.data?.message ?? 'Failed to update status'),
      }
    );
  };

  const handleDelete = async (u: User) => {
    const result = await Swal.fire({
      title: `Delete "${u.name}"?`,
      text: 'This staff account will be permanently removed. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      background: '#1e2433',
      color: '#e2e8f0',
    });
    if (!result.isConfirmed) return;

    deleteUser.mutate(u._id, {
      onSuccess: () => showToast('success', `${u.name}'s account has been deleted.`),
      onError: (err) => showToast('error', err.response?.data?.message ?? 'Failed to delete staff account.'),
    });
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        {/* TOP HEADING — matching Roles & Permissions */}
        <div className="mb-[20px] flex shrink-0 items-center justify-between border-b-[2px] border-[#293681] pb-[8px]">
          <div>
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">
              Staff &amp; Team Members
            </h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
              Admin only — manage internal team accounts, assign roles, and control system access.
            </p>
          </div>

          <FormSheet
            triggerLabel="New Staff Account"
            title="Add User"
            description="Create a staff login for the admin panel."
            triggerElement={
              <button
                type="button"
                className="flex h-[30px] items-center justify-center gap-[5px] rounded-[6px] bg-[#4B1426] px-[14px] text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] transition hover:bg-[#3a0f1d]"
              >
                <UserPlus className="h-[12px] w-[12px]" strokeWidth={1.7} />
                New Staff Account
              </button>
            }
          >
            {(close) => <AddUserForm close={close} />}
          </FormSheet>
        </div>

        {/* STAFF TABLE — clean border, no radius, no box shadow */}
        <div className="mt-[4px] flex min-h-0 flex-1 flex-col overflow-hidden bg-white border border-[#e8e5df]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="h-[32px] border-b border-[#e8e5df] bg-[#233D4D]">
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Name</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Email</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Phone</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Role</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Status</th>
                  <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Last Login</th>
                  <th className="px-[12px] py-[6px] text-right text-[12px] font-bold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0ec]">
                {usersLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[12px] text-[#6c7587]">Loading staff members...</td>
                  </tr>
                ) : !users || users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[12px] text-[#6c7587]">No staff accounts found.</td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u._id} className="transition hover:bg-slate-50/80">
                      <td className="px-[12px] py-[8px] text-[12px] font-semibold text-[#4B1426]">{u.name}</td>
                      <td className="px-[12px] py-[8px]">
                        {u.email ? (
                          <a
                            href={`mailto:${u.email}`}
                            title={`Send email to ${u.email}`}
                            className="group inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                          >
                            <span>{u.email}</span>
                            <ExternalLink className="h-[10px] w-[10px] opacity-60 transition group-hover:opacity-100" />
                          </a>
                        ) : (
                          <span className="text-[11px] font-medium text-[#6c7587]">—</span>
                        )}
                      </td>
                      <td className="px-[12px] py-[8px] text-[11px] font-medium text-[#334155]">{u.mobile}</td>
                      <td className="px-[12px] py-[8px] text-[11px] font-semibold text-[#293681]">{u.role.replace(/_/g, ' ')}</td>
                      <td className="px-[12px] py-[8px]">
                        <select
                          key={`${u._id}-${u.status}`}
                          value={u.status}
                          onChange={(e) => handleStatusChange(u, e.target.value as 'ACTIVE' | 'INACTIVE')}
                          className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                            u.status === 'ACTIVE'
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
                      </td>
                      <td className="px-[12px] py-[8px] text-[11px] text-[#6c7587]">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-[12px] py-[8px] text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <FormSheet
                            triggerLabel="Edit"
                            title="Edit User"
                            description={`Update ${u.name}'s role, branch, or status.`}
                            triggerElement={
                              <button
                                type="button"
                                title="Edit Staff Member"
                                className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95"
                              >
                                <Pencil className="h-[12px] w-[12px] text-blue-600" />
                              </button>
                            }
                          >
                            {(close) => <EditUserForm user={u} close={close} />}
                          </FormSheet>
                          <button
                            type="button"
                            title="Delete Staff Account"
                            onClick={() => handleDelete(u)}
                            className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95"
                          >
                            <Trash2 className="h-[12px] w-[12px] text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION — matching Roles & Permissions */}
          {totalStaff > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#2563eb]">
                  Total Staff Accounts: <strong className="font-bold text-[#1d4ed8]">{totalStaff}</strong>
                </span>
                <span className="text-[11px] text-[#8a92a0]">
                  (Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalStaff)} of {totalStaff})
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
      </div>
    </div>
  );
}
