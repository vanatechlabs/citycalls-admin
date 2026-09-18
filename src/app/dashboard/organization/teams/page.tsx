'use client';

import { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam, useBranches, useSubBranches, Team } from '@/lib/hooks/useOrganization';
import { useEmployees, Employee } from '@/lib/hooks/useEmployees';

const teamFormSchema = z.object({
  branchId: z.string().min(1, 'Select a branch'),
  subBranchId: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
});
type TeamFormValues = z.infer<typeof teamFormSchema>;

function MemberPicker({
  branchId,
  subBranchId,
  employees,
  memberIds,
  onToggle,
}: {
  branchId: string;
  subBranchId?: string;
  employees: Employee[];
  memberIds: string[];
  onToggle: (userId: string) => void;
}) {
  if (!branchId) {
    return <p className="text-xs text-muted-foreground">Select a branch to see available employees.</p>;
  }
  const scoped = employees.filter((e) => e.branchId === branchId && (!subBranchId || e.subBranchId === subBranchId));
  if (scoped.length === 0) {
    return <p className="text-xs text-muted-foreground">No employees found for this branch{subBranchId ? '/sub-branch' : ''} yet.</p>;
  }
  return (
    <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
      {scoped.map((e) => (
        <label key={e._id} className="flex items-center gap-2 text-sm py-0.5">
          <input type="checkbox" className="w-4 h-4" checked={memberIds.includes(e.userId._id)} onChange={() => onToggle(e.userId._id)} />
          {e.userId.name}
        </label>
      ))}
    </div>
  );
}

function AddTeamForm({ onClose }: { onClose: () => void }) {
  const createTeam = useCreateTeam();
  const { data: branches } = useBranches();
  const { data: employees } = useEmployees();
  const { register, handleSubmit, control, formState: { errors } } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
  });
  const branchId = useWatch({ control, name: 'branchId' });
  const subBranchId = useWatch({ control, name: 'subBranchId' });
  const { data: subBranches } = useSubBranches(branchId || undefined);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const toggleMember = (userId: string) => {
    setMemberIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const onSubmit = (values: TeamFormValues) => {
    createTeam.mutate(
      { ...values, subBranchId: values.subBranchId || undefined, memberIds },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Branch</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('branchId')}>
          <option value="">Select a branch...</option>
          {(branches || []).map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Sub-Branch (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" disabled={!branchId} {...register('subBranchId')}>
          <option value="">{branchId ? 'Whole branch (no specific sub-branch)' : 'Select a branch first'}</option>
          {(subBranches || []).map((sb) => (
            <option key={sb._id} value={sb._id}>{sb.name}</option>
          ))}
        </select>
      </div>

      <AppFormField label="Team Name" placeholder="AC Repair Team A" error={errors.name?.message} {...register('name')} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Members (Optional)</label>
        <MemberPicker branchId={branchId} subBranchId={subBranchId} employees={employees || []} memberIds={memberIds} onToggle={toggleMember} />
      </div>

      {createTeam.isError && (
        <p className="text-sm text-destructive">{createTeam.error.response?.data?.message ?? 'Failed to create team.'}</p>
      )}
      <Button type="submit" className="w-full" disabled={createTeam.isPending}>
        {createTeam.isPending ? 'Creating...' : 'Create Team'}
      </Button>
    </form>
  );
}

function EditTeamForm({ team, onClose }: { team: Team; onClose: () => void }) {
  const updateTeam = useUpdateTeam();
  const { data: branches } = useBranches();
  const { data: employees } = useEmployees();
  const { register, handleSubmit, control, formState: { errors } } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: { branchId: team.branchId, subBranchId: team.subBranchId ?? '', name: team.name },
  });
  const branchId = useWatch({ control, name: 'branchId' });
  const subBranchId = useWatch({ control, name: 'subBranchId' });
  const { data: subBranches } = useSubBranches(branchId || undefined);
  const [memberIds, setMemberIds] = useState<string[]>(team.memberIds ?? []);

  const toggleMember = (userId: string) => {
    setMemberIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const onSubmit = (values: TeamFormValues) => {
    updateTeam.mutate(
      { id: team._id, ...values, subBranchId: values.subBranchId || undefined, memberIds },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Branch</label>
        {/* key remounts this select once real branch options exist — registering
            a value against a not-yet-rendered <option> (async data) never gets
            picked up retroactively by the browser once the option later appears. */}
        <select
          key={branches ? 'branch-ready' : 'branch-loading'}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          {...register('branchId')}
        >
          <option value="">Select a branch...</option>
          {(branches || []).map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Sub-Branch (Optional)</label>
        <select
          key={subBranches ? 'subbranch-ready' : 'subbranch-loading'}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          disabled={!branchId}
          {...register('subBranchId')}
        >
          <option value="">{branchId ? 'Whole branch (no specific sub-branch)' : 'Select a branch first'}</option>
          {(subBranches || []).map((sb) => (
            <option key={sb._id} value={sb._id}>{sb.name}</option>
          ))}
        </select>
      </div>

      <AppFormField label="Team Name" placeholder="AC Repair Team A" error={errors.name?.message} {...register('name')} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Members (Optional)</label>
        <MemberPicker branchId={branchId} subBranchId={subBranchId} employees={employees || []} memberIds={memberIds} onToggle={toggleMember} />
      </div>

      {updateTeam.isError && (
        <p className="text-sm text-destructive">{updateTeam.error.response?.data?.message ?? 'Failed to update team.'}</p>
      )}
      <Button type="submit" className="w-full" disabled={updateTeam.isPending}>
        {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

export default function TeamsPage() {
  const { data: teams, isLoading, isError } = useTeams();
  const deleteTeam = useDeleteTeam();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: branches } = useBranches();
  const { data: subBranches } = useSubBranches();
  const { data: employees } = useEmployees();

  const branchName = (id: string) => branches?.find((b) => b._id === id)?.name ?? '—';
  const subBranchName = (id?: string) => (id ? subBranches?.find((sb) => sb._id === id)?.name ?? '—' : '—');
  const memberNames = (ids: string[]) =>
    ids.length === 0
      ? '—'
      : ids.map((id) => employees?.find((e) => e.userId._id === id)?.userId.name ?? 'Unknown').join(', ');

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!searchTerm) return teams;
    const lowerQ = searchTerm.toLowerCase();
    return teams.filter(t => 
      t.name.toLowerCase().includes(lowerQ)
    );
  }, [teams, searchTerm]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      deleteTeam.mutate(id, {
        onSuccess: () => toast.success('Team deleted successfully'),
        onError: () => toast.error('Failed to delete team'),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Teams</h1>
          <p className="text-[13px] text-muted-foreground">Manage field and internal teams.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search teams..."
              className="w-64 pl-9 bg-background h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <FormSheet triggerLabel="Add Team" title="Add Team" description="Create a new team within a branch.">
            {(close) => <AddTeamForm onClose={close} />}
          </FormSheet>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading teams...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load teams.</div>
      ) : (
        <>
          {/* <p className="text-sm text-muted-foreground">{teams?.length ?? 0} teams</p> */}
          <DataTable<Team>
            data={filteredTeams}
            pageSize={10}
            columns={[
              { key: 'name', header: 'Team Name' },
              { key: 'branchId', header: 'Branch', render: (item) => branchName(item.branchId) },
              { key: 'subBranchId', header: 'Sub-Branch', render: (item) => subBranchName(item.subBranchId) },
              {
                key: 'memberIds',
                header: 'Members',
                render: (item) => (
                  <span className="text-sm text-muted-foreground" title={memberNames(item.memberIds)}>
                    {item.memberIds?.length ?? 0} member{item.memberIds?.length === 1 ? '' : 's'}
                  </span>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                render: (item) => <StatusBadge label={item.active ? 'ACTIVE' : 'INACTIVE'} category={item.active ? 'success' : 'default'} />,
              },
              {
                key: 'actions',
                header: 'Action',
                render: (item) => (
                  <div className="flex items-center gap-2">
                    <FormSheet
                      triggerLabel="Edit"
                      title="Edit Team"
                      description={`Update ${item.name}'s branch, sub-branch, or members.`}
                      triggerElement={<Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>}
                    >
                      {(close) => <EditTeamForm team={item} onClose={close} />}
                    </FormSheet>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item._id)} disabled={deleteTeam.isPending}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
