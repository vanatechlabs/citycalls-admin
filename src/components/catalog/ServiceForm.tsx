'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { useMasters, Master } from '@/lib/hooks/useMasters';
import type { CatalogService, CreateCatalogServiceInput } from '@/lib/hooks/useCatalogServices';
import {
  DIAGNOSIS_GROUPS,
  DiagnosisField,
  getCategoryConfig,
} from '@/lib/catalog/categoryConfig';

const ALL_DIAGNOSIS_FIELDS = Object.keys(DIAGNOSIS_GROUPS) as DiagnosisField[];

const serviceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Select a category'),
  basePrice: z.number().min(0),
  visitingCharge: z.number().min(0),
  inspectionCharge: z.number().min(0),
  expectedDurationMinutes: z.number().min(1),
  warrantyPeriodDays: z.number().min(0),
  active: z.boolean(),
});
type ServiceFormValues = z.infer<typeof serviceSchema>;

const FIELD_LABEL = 'text-sm font-medium leading-none text-foreground';
const SELECT =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

interface ServiceFormProps {
  // Present when editing an existing service; absent on create.
  service?: CatalogService;
  submitLabel: string;
  isPending: boolean;
  errorMessage?: string;
  onSubmit: (input: CreateCatalogServiceInput) => void;
  onCancel: () => void;
}
export function ServiceForm({
  service,
  submitLabel,
  isPending,
  errorMessage,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const { data: categories, isLoading: categoriesLoading } = useMasters(['SERVICE_CATEGORY']);
  const { data: diagnosisMasters, isLoading: diagnosisLoading } = useMasters(
    ALL_DIAGNOSIS_FIELDS.map((f) => DIAGNOSIS_GROUPS[f].masterType),
    { active: true },
  );

  const [linkedIds, setLinkedIds] = useState<Record<DiagnosisField, string[]>>({
    complaintTypeIds: service?.complaintTypeIds ?? [],
    symptomIds: service?.symptomIds ?? [],
    defectIds: service?.defectIds ?? [],
    solutionTypeIds: service?.solutionTypeIds ?? [],
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? '',
      description: service?.description ?? '',
      categoryId: service?.categoryId ?? '',
      basePrice: service?.pricing?.basePrice ?? 0,
      visitingCharge: service?.pricing?.visitingCharge ?? 0,
      inspectionCharge: service?.pricing?.inspectionCharge ?? 0,
      expectedDurationMinutes: service?.expectedDurationMinutes ?? 60,
      warrantyPeriodDays: service?.warrantyPeriodDays ?? 0,
      // A new service is published straight away unless switched off here.
      active: service?.active ?? true,
    },
  });

  const categoryId = useWatch({ control, name: 'categoryId' });
  const selectedCategory = categories?.find((c) => c._id === categoryId);
  const config = getCategoryConfig(selectedCategory);

  // Edit keeps an inactive-but-currently-assigned category selectable.
  const selectableCategories = useMemo(
    () => (categories ?? []).filter((c) => c.active || c._id === service?.categoryId),
    [categories, service?.categoryId],
  );

  const submit = (values: ServiceFormValues) => {
    // Groups the chosen category doesn't use are sent empty, so switching a
    // service to e.g. Beauty & Salon also clears links that no longer apply.
    const diagnosis = Object.fromEntries(
      ALL_DIAGNOSIS_FIELDS.map((f) => [f, config.diagnosis.includes(f) ? linkedIds[f] : []]),
    ) as Record<DiagnosisField, string[]>;

    onSubmit({
      name: values.name.trim(),
      description: values.description?.trim() ?? '',
      categoryId: values.categoryId,
      ...diagnosis,
      pricing: {
        basePrice: values.basePrice,
        visitingCharge: values.visitingCharge,
        inspectionCharge: config.inspectionCharge
          ? values.inspectionCharge
          : service?.pricing?.inspectionCharge ?? 0,
        emergencyCharge: service?.pricing?.emergencyCharge ?? 0,
      },
      expectedDurationMinutes: values.expectedDurationMinutes,
      warrantyPeriodDays: config.warranty
        ? values.warrantyPeriodDays
        : service?.warrantyPeriodDays ?? 0,
      active: values.active,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="mx-auto max-w-4xl space-y-5">
      <Section title="Basic Details" description="What the customer sees when browsing this service.">
        <AppFormField
          label="Service Name"
          placeholder="e.g. AC Gas Refill"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="space-y-1.5">
          <label className={FIELD_LABEL}>Description</label>
          <textarea
            placeholder="What's included in this service, what to expect, etc."
            className="flex min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('description')}
          />
        </div>

        <div className="space-y-1.5">
          <label className={FIELD_LABEL}>Category</label>
          <select className={SELECT} {...register('categoryId')}>
            <option value="">
              {categoriesLoading ? 'Loading categories...' : 'Select a category...'}
            </option>
            {selectableCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.label}
                {c.active ? '' : ' (Inactive - currently assigned)'}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.categoryId.message}</p>
          )}
          {selectedCategory && (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{config.label}:</span> {config.hint}
            </p>
          )}
        </div>
      </Section>

      <Section title="Pricing & Timing" description="Charges are shown to customers in ₹.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AppFormField
            label="Base Price (₹)"
            type="number"
            error={errors.basePrice?.message}
            {...register('basePrice', { valueAsNumber: true })}
          />
          <AppFormField
            label="Visiting Charge (₹)"
            type="number"
            error={errors.visitingCharge?.message}
            {...register('visitingCharge', { valueAsNumber: true })}
          />
          {config.inspectionCharge && (
            <AppFormField
              label="Inspection Charge (₹)"
              type="number"
              error={errors.inspectionCharge?.message}
              {...register('inspectionCharge', { valueAsNumber: true })}
            />
          )}
          <AppFormField
            label="Expected Duration (minutes)"
            type="number"
            error={errors.expectedDurationMinutes?.message}
            {...register('expectedDurationMinutes', { valueAsNumber: true })}
          />
          {config.warranty && (
            <AppFormField
              label="Warranty (days)"
              type="number"
              error={errors.warrantyPeriodDays?.message}
              {...register('warrantyPeriodDays', { valueAsNumber: true })}
            />
          )}
        </div>
      </Section>

      {config.diagnosis.length > 0 && (
        <Section
          title="Service Diagnosis Setup"
          description="Choose the active options customers and technicians can pick for this service."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {config.diagnosis.map((field) => (
              <MasterPicker
                key={field}
                label={DIAGNOSIS_GROUPS[field].label}
                loading={diagnosisLoading}
                options={(diagnosisMasters ?? []).filter(
                  (m) => m.masterType === DIAGNOSIS_GROUPS[field].masterType,
                )}
                selectedIds={linkedIds[field]}
                onChange={(ids) => setLinkedIds((cur) => ({ ...cur, [field]: ids }))}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Visibility">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border bg-slate-50/60 p-3">
          <span>
            <span className="block text-sm font-medium text-foreground">Active</span>
            <span className="block text-[13px] text-muted-foreground">
              Active services are visible to customers in the app.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
            {...register('active')}
          />
        </label>
      </Section>

      {errorMessage && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pb-4">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="min-w-[120px]">
          {isPending ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-xs">
      <div className="border-b bg-muted/30 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
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
  const [query, setQuery] = useState('');
  const shown = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);

  return (
    <fieldset className="min-w-0 rounded-lg border border-border bg-muted/20 p-3">
      <legend className="px-1 text-sm font-medium text-foreground">
        {label}
        {selectedIds.length > 0 && (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {selectedIds.length}
          </span>
        )}
      </legend>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}...`}
          className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
        {loading && <p className="py-2 text-xs text-muted-foreground">Loading options...</p>}
        {!loading && shown.length === 0 && (
          <p className="py-2 text-xs text-muted-foreground">No options found.</p>
        )}
        {shown.map((option) => (
          <label
            key={option._id}
            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-muted"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={selectedIds.includes(option._id)}
              onChange={() => toggle(option._id)}
            />
            <span className="min-w-0 truncate" title={option.label}>
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
