'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Separator } from '@/components/ui/separator';
import { Pencil } from 'lucide-react';
import { MediaGallery } from '@/components/media/MediaGallery';
import { useUploadFile, resolveFileUrl, useFileList } from '@/lib/hooks/useFiles';

import { useMasters, useCreateMaster, useUpdateMaster, Master } from '@/lib/hooks/useMasters';

const MASTER_TYPES = ['SERVICE_CATEGORY', 'BRAND', 'PRODUCT_TYPE', 'COMPLAINT_TYPE', 'SYMPTOM', 'DEFECT', 'SOLUTION', 'PART', 'UNIT', 'TAX_RATE', 'PRIORITY', 'LEAD_SOURCE', 'CALL_TYPE', 'APPOINTMENT_SLOT', 'PAYMENT_METHOD', 'CUSTOMER_TYPE'];

const MASTER_TYPE_LABELS: Record<string, string> = {
  SERVICE_CATEGORY: 'Service Categories',
  BRAND: 'Brands',
  PRODUCT_TYPE: 'Product Types',
  COMPLAINT_TYPE: 'Complaint Types',
  SYMPTOM: 'Symptoms',
  DEFECT: 'Defects',
  SOLUTION: 'Solutions',
  PART: 'Parts',
  UNIT: 'Units',
  TAX_RATE: 'Tax Rates',
  PRIORITY: 'Priorities',
  LEAD_SOURCE: 'Lead Sources',
  CALL_TYPE: 'Call Types',
  APPOINTMENT_SLOT: 'Appointment Slots',
  PAYMENT_METHOD: 'Payment Methods',
  CUSTOMER_TYPE: 'Customer Types',
};

const createMasterSchema = z.object({
  masterType: z.string().min(1, 'Select a master type'),
  key: z.string().min(1, 'Key is required'),
  label: z.string().min(1, 'Label is required'),
  parentId: z.string().optional(),
  sortOrder: z.number().optional(),
  vertical: z.string().optional(),
});
type CreateMasterValues = z.infer<typeof createMasterSchema>;

function AddMasterForm({ defaultType, siblings, onClose }: { defaultType: string; siblings: Master[]; onClose: () => void }) {
  const createMaster = useCreateMaster();
  const { upload, isPending: isUploading } = useUploadFile('MASTER', 'dummy');
  const [file, setFile] = useState<File | null>(null);
  
  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateMasterValues>({
    resolver: zodResolver(createMasterSchema),
    defaultValues: { masterType: defaultType, sortOrder: 0 },
  });
  const masterType = useWatch({ control, name: 'masterType' });

  const onSubmit = (values: CreateMasterValues) => {
    const { vertical, ...rest } = values;
    createMaster.mutate(
      {
        ...rest,
        parentId: values.parentId || undefined,
        meta: masterType === 'SERVICE_CATEGORY' && vertical ? { vertical } : undefined,
      },
      { 
        onSuccess: async (newMaster) => {
          if (file) {
            try {
              await upload(file, 'CATALOG_IMAGE', newMaster._id);
            } catch (error) {
              console.error('Failed to upload image:', error);
            }
          }
          onClose();
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Master Type</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('masterType')}>
          {MASTER_TYPES.map((t) => <option key={t} value={t}>{MASTER_TYPE_LABELS[t]}</option>)}
        </select>
        {errors.masterType && <p className="text-sm text-destructive">{errors.masterType.message}</p>}
      </div>
      <AppFormField label="System Key" placeholder="e.g. AC_LEAK" error={errors.key?.message} {...register('key')} />
      <AppFormField label="Display Label" placeholder="e.g. AC Gas Leak" error={errors.label?.message} {...register('label')} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Parent Entry (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('parentId')}>
          <option value="">None</option>
          {siblings.map((s) => <option key={s._id} value={s._id}>{s.label}</option>)}
        </select>
      </div>
      <AppFormField label="Sort Order" type="number" {...register('sortOrder', { valueAsNumber: true })} />
      {masterType === 'SERVICE_CATEGORY' && (
        <AppFormField
          label="Vertical (Optional)"
          placeholder="e.g. BEAUTY"
          {...register('vertical')}
        />
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Icon / Image (Optional)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm border border-input rounded-md p-1.5 bg-transparent"
        />
      </div>
      {createMaster.isError && <p className="text-sm text-destructive">{createMaster.error.response?.data?.message ?? 'Failed to create master.'}</p>}
      <Button type="submit" className="w-full" disabled={createMaster.isPending || isUploading}>
        {createMaster.isPending || isUploading ? 'Creating & Uploading...' : 'Add Master'}
      </Button>
    </form>
  );
}

const editMasterSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  parentId: z.string().optional(),
  sortOrder: z.number().optional(),
  vertical: z.string().optional(),
});
type EditMasterValues = z.infer<typeof editMasterSchema>;

function EditMasterForm({ master, siblings, onClose }: { master: Master; siblings: Master[]; onClose: () => void }) {
  const updateMaster = useUpdateMaster();
  const { register, handleSubmit, formState: { errors } } = useForm<EditMasterValues>({
    resolver: zodResolver(editMasterSchema),
    defaultValues: {
      label: master.label,
      parentId: master.parentId ?? '',
      sortOrder: master.sortOrder ?? 0,
      vertical: typeof master.meta?.vertical === 'string' ? master.meta.vertical : '',
    },
  });

  const onSubmit = (values: EditMasterValues) => {
    const { vertical, ...rest } = values;
    updateMaster.mutate(
      {
        masterType: master.masterType,
        id: master._id,
        ...rest,
        parentId: values.parentId || undefined,
        ...(master.masterType === 'SERVICE_CATEGORY' ? { meta: { ...master.meta, vertical: vertical || undefined } } : {}),
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="space-y-6 pb-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AppFormField label="System Key" value={master.key} disabled readOnly />
        <AppFormField label="Display Label" error={errors.label?.message} {...register('label')} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Parent Entry (Optional)</label>
          <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('parentId')}>
            <option value="">None</option>
            {siblings.filter((s) => s._id !== master._id).map((s) => <option key={s._id} value={s._id}>{s.label}</option>)}
          </select>
        </div>
        <AppFormField label="Sort Order" type="number" {...register('sortOrder', { valueAsNumber: true })} />
        {master.masterType === 'SERVICE_CATEGORY' && (
          <AppFormField
            label="Vertical (Optional)"
            placeholder="e.g. BEAUTY"
            {...register('vertical')}
          />
        )}
        {updateMaster.isError && <p className="text-sm text-destructive">{updateMaster.error.response?.data?.message ?? 'Failed to update master.'}</p>}
        <Button type="submit" className="w-full" disabled={updateMaster.isPending}>
          {updateMaster.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
      
      <Separator />
      
      <MediaGallery entityType="MASTER" entityId={master._id} title="Master Media (Icon/Image)" />
    </div>
  );
}

function MasterImageCell({ masterId }: { masterId: string }) {
  const { data: files } = useFileList('MASTER', masterId);
  const image = files?.find((f) => f.category === 'CATALOG_IMAGE' || !f.category.includes('VIDEO'));
  
  if (!image) return <div className="w-10 h-10 bg-slate-100 rounded-md border flex items-center justify-center text-slate-400 text-xs">No img</div>;
  
  let url = resolveFileUrl(image);
  if (url.startsWith('/')) {
    url = `http://localhost:4000${url}`;
  }

  return (
    <img src={url} alt="Master Icon" className="w-10 h-10 object-cover rounded-md border" onError={(e) => console.error('Image failed to load:', url)} />
  );
}

export default function MastersPage() {
  const [selectedType, setSelectedType] = useState('SERVICE_CATEGORY');
  const { data: masters, isLoading, isError } = useMasters([selectedType]);
  const updateMaster = useUpdateMaster();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 mb-2 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Masters Configuration</h1>
          <p className="text-[13px] text-muted-foreground">Manage system master lists — pick a type below to see only that list.</p>
        </div>
        <FormSheet triggerLabel="Add Master" title="Add Master Entry" description="Create a new master-list entry.">
          {(close) => <AddMasterForm defaultType={selectedType} siblings={masters || []} onClose={close} />}
        </FormSheet>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MASTER_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
              selectedType === t
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {MASTER_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="pt-2">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{MASTER_TYPE_LABELS[selectedType]}</h2>
          {!isLoading && !isError && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              {masters?.length ?? 0} entries
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8 text-muted-foreground">Loading {MASTER_TYPE_LABELS[selectedType].toLowerCase()}...</div>
        ) : isError ? (
          <div className="flex justify-center p-8 text-destructive">Failed to load masters.</div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <DataTable<Master>
              data={masters || []}
              pageSize={10}
              emptyMessage={`No ${MASTER_TYPE_LABELS[selectedType].toLowerCase()} yet.`}
              columns={[
                {
                  key: 'image',
                  header: 'Icon',
                  render: (item) => <MasterImageCell masterId={item._id} />,
                },
                { key: 'label', header: 'Name' },
                { key: 'key', header: 'System Key' },
                ...(selectedType === 'SERVICE_CATEGORY'
                  ? [{ key: 'vertical', header: 'Vertical', render: (item: Master) => (typeof item.meta?.vertical === 'string' ? item.meta.vertical : '—') }]
                  : []),
                {
                  key: 'active',
                  header: 'Status',
                  render: (item) => <StatusBadge label={item.active ? 'Active' : 'Inactive'} category={item.active ? 'success' : 'default'} />,
                },
                {
                  key: 'actions',
                  header: <div className="text-center">Action</div>,
                  render: (item) => (
                    <div className="flex items-center justify-center gap-1">
                      <FormSheet
                        triggerLabel="Edit"
                        title="Edit Master Entry"
                        description={`Update ${item.label}.`}
                        triggerElement={<Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>}
                      >
                        {(close) => <EditMasterForm master={item} siblings={masters || []} onClose={close} />}
                      </FormSheet>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 text-xs ${item.active ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                        disabled={updateMaster.isPending}
                        onClick={() => updateMaster.mutate({ masterType: item.masterType, id: item._id, active: !item.active })}
                      >
                        {item.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
