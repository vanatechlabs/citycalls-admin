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
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, Branch, WorkingHoursRow } from '@/lib/hooks/useOrganization';
import { useMasters } from '@/lib/hooks/useMasters';
import { useUsers } from '@/lib/hooks/useUsers';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function defaultWorkingHours(): WorkingHoursRow[] {
  return DAY_NAMES.map((_, day) => ({ day, openTime: '09:00', closeTime: '18:00', closed: day === 0 }));
}

const branchFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(2, 'Code is required').max(10),
  pinCodes: z.string().optional(),
  cities: z.string().optional(),
  states: z.string().optional(),
  managerId: z.string().optional(),
  gstin: z.string().optional(),
  addressLine1: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPinCode: z.string().optional(),
  holidays: z.string().optional(),
  dailyCapacityPerSlot: z.number().int().min(1, 'Must be at least 1'),
  active: z.boolean(),
});
type BranchFormValues = z.infer<typeof branchFormSchema>;

function splitList(value?: string): string[] {
  return (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

function WorkingHoursEditor({ rows, onChange }: { rows: WorkingHoursRow[]; onChange: (rows: WorkingHoursRow[]) => void }) {
  const updateRow = (day: number, patch: Partial<WorkingHoursRow>) => {
    onChange(rows.map((r) => (r.day === day ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Working Hours</label>
      <div className="border rounded-md divide-y">
        {rows.map((row) => (
          <div key={row.day} className="p-2 text-sm space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{DAY_NAMES[row.day]}</span>
              <label className="flex items-center gap-1.5 text-xs shrink-0">
                <input type="checkbox" checked={row.closed} onChange={(e) => updateRow(row.day, { closed: e.target.checked })} />
                Closed
              </label>
            </div>
            {!row.closed && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={row.openTime ?? ''}
                  onChange={(e) => updateRow(row.day, { openTime: e.target.value })}
                />
                <span className="text-muted-foreground text-xs shrink-0">to</span>
                <input
                  type="time"
                  className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={row.closeTime ?? ''}
                  onChange={(e) => updateRow(row.day, { closeTime: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchForm({ branch, onClose }: { branch?: Branch; onClose: () => void }) {
  const isEdit = !!branch;
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const mutation = isEdit ? updateBranch : createBranch;
  const { data: categories } = useMasters(['SERVICE_CATEGORY']);
  const { data: users } = useUsers();
  const { register, handleSubmit, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: branch?.name ?? '',
      code: branch?.code ?? '',
      pinCodes: branch?.coverage?.pinCodes?.join(', ') ?? '',
      cities: branch?.coverage?.cities?.join(', ') ?? '',
      states: branch?.coverage?.states?.join(', ') ?? '',
      managerId: branch?.managerId ?? '',
      gstin: branch?.gstin ?? '',
      addressLine1: branch?.registeredAddress?.line1 ?? '',
      addressCity: branch?.registeredAddress?.city ?? '',
      addressState: branch?.registeredAddress?.state ?? '',
      addressPinCode: branch?.registeredAddress?.pinCode ?? '',
      holidays: branch?.holidays?.map((h) => new Date(h).toISOString().slice(0, 10)).join(', ') ?? '',
      dailyCapacityPerSlot: branch?.dailyCapacityPerSlot ?? 5,
      active: branch?.active ?? true,
    },
  });
  const [categoryIds, setCategoryIds] = useState<string[]>(branch?.serviceCategoryIds ?? []);
  const [workingHours, setWorkingHours] = useState<WorkingHoursRow[]>(branch?.workingHours?.length ? branch.workingHours : defaultWorkingHours());

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const onSubmit = (values: BranchFormValues) => {
    const hasAddress = values.addressLine1 && values.addressCity && values.addressState && values.addressPinCode;
    const payload = {
      name: values.name,
      code: values.code,
      coverage: { pinCodes: splitList(values.pinCodes), cities: splitList(values.cities), states: splitList(values.states) },
      serviceCategoryIds: categoryIds,
      workingHours,
      holidays: splitList(values.holidays),
      dailyCapacityPerSlot: values.dailyCapacityPerSlot,
      managerId: values.managerId || undefined,
      gstin: values.gstin || undefined,
      registeredAddress: hasAddress
        ? { line1: values.addressLine1!, city: values.addressCity!, state: values.addressState!, pinCode: values.addressPinCode! }
        : undefined,
      active: values.active,
    };
    if (isEdit && branch) {
      updateBranch.mutate({ id: branch._id, ...payload }, { onSuccess: onClose });
    } else {
      createBranch.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <AppFormField label="Branch Name" placeholder="Delhi Central" error={errors.name?.message} {...register('name')} />
        <AppFormField label="Branch Code" placeholder="DEL01" error={errors.code?.message} {...register('code')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AppFormField label="Coverage Pincodes (comma-separated)" placeholder="110001, 110002" {...register('pinCodes')} />
        <AppFormField label="Coverage Cities (comma-separated)" placeholder="Delhi" {...register('cities')} />
      </div>
      <AppFormField label="Coverage States (comma-separated)" placeholder="Delhi, Haryana" {...register('states')} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Service Categories</label>
        <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
          {(categories || []).map((c) => (
            <label key={c._id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" checked={categoryIds.includes(c._id)} onChange={() => toggleCategory(c._id)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <WorkingHoursEditor rows={workingHours} onChange={setWorkingHours} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Manager (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('managerId')}>
          <option value="">Unassigned</option>
          {(users || []).map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>)}
        </select>
      </div>

      <AppFormField label="GSTIN (Optional)" {...register('gstin')} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Registered Address (Optional)</label>
        <div className="grid grid-cols-2 gap-2">
          <AppFormField label="Line 1" {...register('addressLine1')} />
          <AppFormField label="City" {...register('addressCity')} />
          <AppFormField label="State" {...register('addressState')} />
          <AppFormField label="Pin Code" {...register('addressPinCode')} />
        </div>
      </div>

      <AppFormField label="Holidays (comma-separated dates, YYYY-MM-DD)" placeholder="2026-01-26, 2026-08-15" {...register('holidays')} />

      <AppFormField
        label="Daily Capacity Per Time Slot"
        type="number"
        min={1}
        error={errors.dailyCapacityPerSlot?.message}
        {...register('dailyCapacityPerSlot', { valueAsNumber: true })}
      />
      <p className="text-xs text-muted-foreground -mt-2">Max Service Requests the customer app will let customers book into the same appointment slot per day.</p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="w-4 h-4" {...register('active')} />
        Active
      </label>

      {mutation.isError && (
        <p className="text-sm text-destructive">{mutation.error.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} branch.`}</p>
      )}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Branch'}
      </Button>
    </form>
  );
}

export default function BranchesPage() {
  const { data: branches, isLoading, isError } = useBranches();
  const deleteBranch = useDeleteBranch();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBranches = useMemo(() => {
    if (!branches) return [];
    if (!searchTerm) return branches;
    const lowerQ = searchTerm.toLowerCase();
    return branches.filter(b => 
      b.name.toLowerCase().includes(lowerQ) ||
      b.code.toLowerCase().includes(lowerQ)
    );
  }, [branches, searchTerm]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      deleteBranch.mutate(id, {
        onSuccess: () => toast.success('Branch deleted successfully'),
        onError: () => toast.error('Failed to delete branch'),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Branches</h1>
          <p className="text-[13px] text-muted-foreground">Manage main organizational branches.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search branches..."
              className="w-64 pl-9 bg-background h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <FormSheet triggerLabel="Add Branch" title="Add Branch" description="Create a new branch.">
            {(close) => <BranchForm onClose={close} />}
          </FormSheet>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading branches...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load branches.</div>
      ) : (
        <>
          {/* <p className="text-sm text-muted-foreground">{branches?.length ?? 0} branches</p> */}
          <DataTable<Branch>
            data={filteredBranches}
            pageSize={10}
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Branch Name' },
              {
                key: 'coverage',
                header: 'Coverage',
                render: (item) => (
                  <span className="text-xs text-muted-foreground">
                    {item.coverage?.cities?.length ? item.coverage.cities.join(', ') : '—'}
                    {item.coverage?.pinCodes?.length ? ` (${item.coverage.pinCodes.length} pincodes)` : ''}
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
                      title="Edit Branch"
                      description={`Update ${item.name}.`}
                      triggerElement={<Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>}
                    >
                      {(close) => <BranchForm branch={item} onClose={close} />}
                    </FormSheet>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item._id)} disabled={deleteBranch.isPending}>
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
