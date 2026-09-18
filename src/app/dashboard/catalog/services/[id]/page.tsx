'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MediaGallery } from '@/components/media/MediaGallery';
import { AppFormField } from '@/components/ui/AppFormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useCatalogService, useUpdateCatalogService } from '@/lib/hooks/useCatalogServices';
import { useMasters, Master } from '@/lib/hooks/useMasters';

const updateServiceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Select a category'),
  basePrice: z.number().min(0),
  visitingCharge: z.number().min(0),
  expectedDurationMinutes: z.number().min(1),
  warrantyPeriodDays: z.number().min(0),
});
type UpdateServiceValues = z.infer<typeof updateServiceSchema>;

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: service, isLoading, isError } = useCatalogService(id);
  const { data: categories } = useMasters(['SERVICE_CATEGORY']);
  const { data: complaintTypes } = useMasters(['COMPLAINT_TYPE']);
  const { data: symptoms } = useMasters(['SYMPTOM']);
  const { data: defects } = useMasters(['DEFECT']);
  const { data: solutions } = useMasters(['SOLUTION']);
  const updateService = useUpdateCatalogService(id);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<UpdateServiceValues>({
    resolver: zodResolver(updateServiceSchema),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading service...</div>;
  if (isError || !service) return <div className="p-8 text-center text-destructive">Failed to load service.</div>;

  const categoryLabel = categories?.find((c) => c._id === service.categoryId)?.label ?? 'N/A';

  const handleEditClick = () => {
    reset({
      name: service.name,
      description: service.description ?? '',
      categoryId: service.categoryId ?? '',
      basePrice: service.pricing?.basePrice ?? 0,
      visitingCharge: service.pricing?.visitingCharge ?? 0,
      expectedDurationMinutes: service.expectedDurationMinutes ?? 60,
      warrantyPeriodDays: service.warrantyPeriodDays ?? 0,
    });
    setIsEditing(true);
  };

  const onUpdateDetails = (values: UpdateServiceValues) => {
    updateService.mutate(
      {
        name: values.name,
        description: values.description,
        categoryId: values.categoryId,
        pricing: { ...service.pricing, basePrice: values.basePrice, visitingCharge: values.visitingCharge },
        expectedDurationMinutes: values.expectedDurationMinutes,
        warrantyPeriodDays: values.warrantyPeriodDays,
      },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">{service.name}</h1>
          <p className="text-[13px] text-muted-foreground">Manage service configuration and pricing.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge label={service.active ? 'Active' : 'Inactive'} category={service.active ? 'success' : 'default'} />
          <Button
            size="sm"
            variant={service.active ? 'outline' : 'default'}
            onClick={() => updateService.mutate({ active: !service.active })}
            disabled={updateService.isPending}
          >
            {service.active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Service Details</CardTitle>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={handleEditClick}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
            )}
          </CardHeader>
          {isEditing ? (
            <form onSubmit={handleSubmit(onUpdateDetails)}>
              <CardContent className="space-y-4">
                <AppFormField label="Name" error={errors.name?.message} {...register('name')} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register('description')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('categoryId')}>
                    <option value="">Select category...</option>
                    {(categories || []).map((c) => <option key={c._id} value={c._id}>{c.label}</option>)}
                  </select>
                  {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AppFormField label="Base Price (₹)" type="number" error={errors.basePrice?.message} {...register('basePrice', { valueAsNumber: true })} />
                  <AppFormField label="Warranty (Days)" type="number" error={errors.warrantyPeriodDays?.message} {...register('warrantyPeriodDays', { valueAsNumber: true })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AppFormField label="Visiting Charge (₹)" type="number" error={errors.visitingCharge?.message} {...register('visitingCharge', { valueAsNumber: true })} />
                  <AppFormField label="Duration (minutes)" type="number" error={errors.expectedDurationMinutes?.message} {...register('expectedDurationMinutes', { valueAsNumber: true })} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={updateService.isPending}>Save</Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{service.name}</span>
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{categoryLabel}</span>
                <span className="text-muted-foreground">Base Price:</span>
                <span className="font-medium">₹{(service.pricing?.basePrice ?? 0).toLocaleString('en-IN')}</span>
                <span className="text-muted-foreground">Visiting Charge:</span>
                <span className="font-medium">₹{(service.pricing?.visitingCharge ?? 0).toLocaleString('en-IN')}</span>
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{service.expectedDurationMinutes ?? 60} minutes</span>
                <span className="text-muted-foreground">Warranty:</span>
                <span className="font-medium">{service.warrantyPeriodDays ?? 0} days</span>
              </div>
              {service.description && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="text-sm mt-1">{service.description}</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="space-y-6">
          <LinkedMastersCard
            title="Linked Complaint Types"
            field="complaintTypeIds"
            allMasters={complaintTypes}
            linkedIds={service.complaintTypeIds}
            updateService={updateService}
          />
          <LinkedMastersCard
            title="Linked Symptoms"
            field="symptomIds"
            allMasters={symptoms}
            linkedIds={service.symptomIds}
            updateService={updateService}
          />
          <LinkedMastersCard
            title="Linked Defects"
            field="defectIds"
            allMasters={defects}
            linkedIds={service.defectIds}
            updateService={updateService}
          />
          <LinkedMastersCard
            title="Linked Solutions"
            field="solutionTypeIds"
            allMasters={solutions}
            linkedIds={service.solutionTypeIds}
            updateService={updateService}
          />
        </div>
      </div>

      <MediaGallery entityType="SERVICE" entityId={id} />
    </div>
  );
}

type LinkableField = 'complaintTypeIds' | 'symptomIds' | 'defectIds' | 'solutionTypeIds';

// Shared shape behind the four "Linked X" cards — each one only ever shows
// two slices of the same master list: what's already in Service.<field> (the
// linked set customer/vendor apps will actually offer as pickers) and what
// isn't yet (candidates to add). Nothing outside the current service's own
// links is ever presented as "linked".
function LinkedMastersCard({
  title,
  field,
  allMasters,
  linkedIds,
  updateService,
}: {
  title: string;
  field: LinkableField;
  allMasters?: Master[];
  linkedIds?: string[];
  updateService: ReturnType<typeof useUpdateCatalogService>;
}) {
  const [adding, setAdding] = useState('');
  const linked = allMasters?.filter((m) => linkedIds?.includes(m._id)) ?? [];
  const unlinked = allMasters?.filter((m) => !linkedIds?.includes(m._id)) ?? [];

  const remove = (masterId: string) => {
    updateService.mutate({ [field]: (linkedIds ?? []).filter((mid) => mid !== masterId) });
  };

  const add = () => {
    if (!adding) return;
    updateService.mutate({ [field]: [...(linkedIds ?? []), adding] }, { onSuccess: () => setAdding('') });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {linked.map((m) => (
            <li key={m._id} className="flex items-center justify-between border-b pb-2">
              <span>{m.label}</span>
              <Button variant="ghost" size="sm" className="text-destructive h-6" onClick={() => remove(m._id)} disabled={updateService.isPending}>
                Remove
              </Button>
            </li>
          ))}
          {linked.length === 0 && <p className="text-muted-foreground text-sm">None linked yet — the app pickers for this service will show nothing here until you link some.</p>}
        </ul>
        <div className="pt-4 flex gap-2">
          <select className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Select...</option>
            {unlinked.map((m) => <option key={m._id} value={m._id}>{m.label}</option>)}
          </select>
          <Button variant="outline" onClick={add} disabled={!adding || updateService.isPending}>Link</Button>
        </div>
      </CardContent>
    </Card>
  );
}
