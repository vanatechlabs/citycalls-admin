'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { useCreateCatalogService } from '@/lib/hooks/useCatalogServices';
import { Master, useMasters } from '@/lib/hooks/useMasters';

type LinkableField = 'complaintTypeIds' | 'symptomIds' | 'defectIds' | 'solutionTypeIds';

const LINKED_MASTER_GROUPS: Array<{ field: LinkableField; masterType: string; label: string }> = [
  { field: 'complaintTypeIds', masterType: 'COMPLAINT_TYPE', label: 'Complaint Types' },
  { field: 'symptomIds', masterType: 'SYMPTOM', label: 'Symptoms' },
  { field: 'defectIds', masterType: 'DEFECT', label: 'Defects' },
  { field: 'solutionTypeIds', masterType: 'SOLUTION', label: 'Solutions' },
];

const createServiceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Select a category'),
  basePrice: z.number().min(0),
  visitingCharge: z.number().min(0),
  expectedDurationMinutes: z.number().min(1),
  active: z.boolean(),
});
type CreateServiceValues = z.infer<typeof createServiceSchema>;

export default function CreateServicePage() {
  const router = useRouter();
  const createService = useCreateCatalogService();
  const { data: categories, isLoading: categoriesLoading } = useMasters(['SERVICE_CATEGORY'], { active: true });
  const { data: linkedMasters, isLoading: linkedMastersLoading } = useMasters(
    LINKED_MASTER_GROUPS.map((group) => group.masterType),
    { active: true },
  );
  const [linkedIds, setLinkedIds] = useState<Record<LinkableField, string[]>>({
    complaintTypeIds: [],
    symptomIds: [],
    defectIds: [],
    solutionTypeIds: [],
  });
  const { register, handleSubmit, formState: { errors } } = useForm<CreateServiceValues>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: { active: true, visitingCharge: 0, expectedDurationMinutes: 60 },
  });

  const onSubmit = (values: CreateServiceValues) => {
    createService.mutate(
      {
        name: values.name,
        description: values.description,
        categoryId: values.categoryId,
        ...linkedIds,
        pricing: { basePrice: values.basePrice, visitingCharge: values.visitingCharge },
        expectedDurationMinutes: values.expectedDurationMinutes,
        active: values.active,
      },
      { onSuccess: () => router.push('/dashboard/catalog/services') }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Add Service</h1>
          <p className="text-[13px] text-muted-foreground">Define a new service for the catalog.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full">
        <div className="max-w-3xl mx-auto">
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1 pb-3 border-b">
                <h2 className="text-lg font-semibold text-foreground">General Details</h2>
                <p className="text-sm text-muted-foreground">
                  Provide basic information about the service including its name, pricing, and category.
                </p>
              </div>

              <div className="space-y-4">
                <AppFormField
                  label="Service Name"
                  placeholder="e.g. AC Gas Refill"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium leading-none">Description</label>
                  <textarea
                    placeholder="What's included in this service, what to expect, etc."
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register('description')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Category</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...register('categoryId')}
                    >
                      <option value="">{categoriesLoading ? 'Loading active categories...' : 'Select an active category...'}</option>
                      {(categories || []).map((c) => <option key={c._id} value={c._id}>{c.label}</option>)}
                    </select>
                    {errors.categoryId && <p className="text-[0.8rem] font-medium text-destructive">{errors.categoryId.message}</p>}
                  </div>

                  <AppFormField
                    label="Base Price (₹)"
                    type="number"
                    placeholder="499"
                    error={errors.basePrice?.message}
                    {...register('basePrice', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-3 border-t pt-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Service Diagnosis Setup</h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Choose the active options customers and technicians can use for this service.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {LINKED_MASTER_GROUPS.map((group) => (
                      <MasterPicker
                        key={group.field}
                        label={group.label}
                        loading={linkedMastersLoading}
                        options={(linkedMasters || []).filter((master) => master.masterType === group.masterType)}
                        selectedIds={linkedIds[group.field]}
                        onChange={(ids) => setLinkedIds((current) => ({ ...current, [group.field]: ids }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AppFormField
                    label="Visiting Charge (₹)"
                    type="number"
                    placeholder="99"
                    error={errors.visitingCharge?.message}
                    {...register('visitingCharge', { valueAsNumber: true })}
                  />

                  <AppFormField
                    label="Expected Duration (minutes)"
                    type="number"
                    placeholder="60"
                    error={errors.expectedDurationMinutes?.message}
                    {...register('expectedDurationMinutes', { valueAsNumber: true })}
                  />
                </div>

                <div className="flex flex-row items-center justify-between rounded-md border bg-slate-50/50 p-3 shadow-sm mt-2">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-foreground">Active Status</label>
                    <p className="text-[13px] text-muted-foreground">
                      Make this service visible to customers immediately.
                    </p>
                  </div>
                  <div>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-input cursor-pointer accent-primary"
                      {...register('active')}
                    />
                  </div>
                </div>

                {createService.isError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-medium">{createService.error.response?.data?.message ?? 'Failed to create service.'}</p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="bg-muted/40 border-t px-6 py-4 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createService.isPending} className="min-w-[100px]">
                {createService.isPending ? 'Saving...' : 'Save Service'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}

function MasterPicker({
  label,
  loading,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  loading: boolean;
  options: Master[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  return (
    <fieldset className="min-w-0 rounded-md border border-border bg-muted/20 p-3">
      <legend className="px-1 text-sm font-medium text-foreground">{label}</legend>
      <div className="mt-1 max-h-36 space-y-1 overflow-y-auto pr-1">
        {loading && <p className="py-2 text-xs text-muted-foreground">Loading active options...</p>}
        {!loading && options.length === 0 && <p className="py-2 text-xs text-muted-foreground">No active options available.</p>}
        {options.map((option) => (
          <label key={option._id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={selectedIds.includes(option._id)}
              onChange={() => toggle(option._id)}
            />
            <span className="min-w-0 truncate" title={option.label}>{option.label}</span>
          </label>
        ))}
      </div>
      {selectedIds.length > 0 && (
        <p className="mt-2 border-t pt-2 text-xs font-medium text-primary">{selectedIds.length} selected</p>
      )}
    </fieldset>
  );
}
