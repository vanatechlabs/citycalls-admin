'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { useCreateCatalogService } from '@/lib/hooks/useCatalogServices';
import { useMasters } from '@/lib/hooks/useMasters';

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
  const { data: categories } = useMasters(['SERVICE_CATEGORY']);
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
                      <option value="">Select a category...</option>
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
