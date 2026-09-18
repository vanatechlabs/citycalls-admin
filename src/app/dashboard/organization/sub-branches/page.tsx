'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { useSubBranches, useCreateSubBranch, useUpdateSubBranch, useDeleteSubBranch, useBranches, SubBranch } from '@/lib/hooks/useOrganization';
import { useUsers } from '@/lib/hooks/useUsers';

const subBranchFormSchema = z.object({
  branchId: z.string().min(1, 'Select a branch'),
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(2, 'Code is required').max(10),
  pinCodes: z.string().optional(),
  managerId: z.string().optional(),
  active: z.boolean(),
});
type SubBranchFormValues = z.infer<typeof subBranchFormSchema>;

function splitList(value?: string): string[] {
  return (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

function SubBranchForm({ subBranch, onClose }: { subBranch?: SubBranch; onClose: () => void }) {
  const isEdit = !!subBranch;
  const createSubBranch = useCreateSubBranch();
  const updateSubBranch = useUpdateSubBranch();
  const mutation = isEdit ? updateSubBranch : createSubBranch;
  const { data: branches } = useBranches();
  const { data: users } = useUsers();
  const { register, handleSubmit, formState: { errors } } = useForm<SubBranchFormValues>({
    resolver: zodResolver(subBranchFormSchema),
    defaultValues: {
      branchId: subBranch?.branchId ?? '',
      name: subBranch?.name ?? '',
      code: subBranch?.code ?? '',
      pinCodes: subBranch?.coverage?.pinCodes?.join(', ') ?? '',
      managerId: subBranch?.managerId ?? '',
      active: subBranch?.active ?? true,
    },
  });

  const onSubmit = (values: SubBranchFormValues) => {
    const payload = {
      branchId: values.branchId,
      name: values.name,
      code: values.code,
      coverage: { pinCodes: splitList(values.pinCodes) },
      managerId: values.managerId || undefined,
      active: values.active,
    };
    if (isEdit && subBranch) {
      updateSubBranch.mutate({ id: subBranch._id, ...payload }, { onSuccess: onClose });
    } else {
      createSubBranch.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Parent Branch</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('branchId')}>
          <option value="">Select a branch...</option>
          {(branches || []).map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
      </div>
      <AppFormField label="Sub-Branch Name" placeholder="South Delhi Hub" error={errors.name?.message} {...register('name')} />
      <AppFormField label="Sub-Branch Code" placeholder="DEL01-S" error={errors.code?.message} {...register('code')} />
      <AppFormField label="Coverage Pincodes (comma-separated)" placeholder="110001, 110002" {...register('pinCodes')} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Manager (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('managerId')}>
          <option value="">Unassigned</option>
          {(users || []).map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>)}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="w-4 h-4" {...register('active')} />
        Active
      </label>

      {mutation.isError && (
        <p className="text-sm text-destructive">{mutation.error.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} sub-branch.`}</p>
      )}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Sub-Branch'}
      </Button>
    </form>
  );
}

export default function SubBranchesPage() {
  const { data: branches } = useBranches();
  const [branchFilter, setBranchFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { data: subBranches, isLoading, isError } = useSubBranches(branchFilter || undefined);
  const deleteSubBranch = useDeleteSubBranch();

  const branchName = (id: string) => branches?.find((b) => b._id === id)?.name ?? id;

  const filteredSubBranches = useMemo(() => {
    if (!subBranches) return [];
    if (!searchTerm) return subBranches;
    const lowerQ = searchTerm.toLowerCase();
    return subBranches.filter(sb => 
      sb.name.toLowerCase().includes(lowerQ) ||
      sb.code.toLowerCase().includes(lowerQ)
    );
  }, [subBranches, searchTerm]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this sub-branch?')) {
      deleteSubBranch.mutate(id, {
        onSuccess: () => toast.success('Sub-branch deleted successfully'),
        onError: () => toast.error('Failed to delete sub-branch'),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Sub-Branches</h1>
          <p className="text-[13px] text-muted-foreground">Manage sub-branches under main branches.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sub-branches..."
              className="w-64 pl-9 bg-background h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <FormSheet triggerLabel="Add Sub-Branch" title="Add Sub-Branch" description="Create a new sub-branch under a parent branch.">
            {(close) => <SubBranchForm onClose={close} />}
          </FormSheet>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">Filter by Parent Branch:</label>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="">All Branches</option>
          {(branches || []).map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading sub-branches...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load sub-branches.</div>
      ) : (
        <>
          {/* <p className="text-sm text-muted-foreground">{subBranches?.length ?? 0} sub-branches</p> */}
          <DataTable<SubBranch>
            data={filteredSubBranches}
            pageSize={10}
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'branchId', header: 'Parent Branch', render: (item) => branchName(item.branchId) },
              { key: 'name', header: 'Sub-Branch Name' },
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
                      title="Edit Sub-Branch"
                      description={`Update ${item.name}.`}
                      triggerElement={<Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>}
                    >
                      {(close) => <SubBranchForm subBranch={item} onClose={close} />}
                    </FormSheet>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item._id)} disabled={deleteSubBranch.isPending}>
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
