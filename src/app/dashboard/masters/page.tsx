'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Separator } from '@/components/ui/separator';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [failed, setFailed] = useState(false);

  if (!image || failed) return <div className="w-10 h-10 bg-slate-100 rounded-md border flex items-center justify-center text-slate-400 text-xs">No img</div>;

  let url = resolveFileUrl(image);
  if (url.startsWith('/')) {
    url = `http://localhost:4000${url}`;
  }

  return (
    <img src={url} alt="Master Icon" className="w-10 h-10 object-cover rounded-md border" onError={() => setFailed(true)} />
  );
}

export default function MastersPage() {
  const [selectedType, setSelectedType] = useState('SERVICE_CATEGORY');
  const { data: masters, isLoading, isError } = useMasters([selectedType]);
  const updateMaster = useUpdateMaster();

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const total = masters?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedMasters = (masters ?? []).slice(startIndex, startIndex + PAGE_SIZE);

  const handleStatusChange = (item: Master, active: boolean) => {
    if (item.active === active) return;
    updateMaster.mutate({ masterType: item.masterType, id: item._id, active });
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        {/* TOP HEADING — matching Roles & Permissions / Staff */}
        <div className="mb-[20px] flex shrink-0 items-center justify-between border-b-[2px] border-[#293681] pb-[8px]">
          <div>
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">
              Masters Configuration
            </h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
              Manage system master lists — pick a type below to see only that list.
            </p>
          </div>
          <FormSheet
            triggerLabel="Add Master"
            title="Add Master Entry"
            description="Create a new master-list entry."
            triggerElement={
              <button
                type="button"
                className="flex h-[30px] items-center justify-center gap-[5px] rounded-[6px] bg-[#4B1426] px-[14px] text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] transition hover:bg-[#3a0f1d]"
              >
                Add Master
              </button>
            }
          >
            {(close) => <AddMasterForm defaultType={selectedType} siblings={masters || []} onClose={close} />}
          </FormSheet>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
          {MASTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setSelectedType(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                selectedType === t
                  ? 'bg-[#4B1426] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {MASTER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-[4px] shrink-0">
          <h2 className="text-[14px] font-bold text-[#23471d]">{MASTER_TYPE_LABELS[selectedType]}</h2>
          {!isLoading && !isError && (
            <span className="text-[11px] font-semibold text-[#6c7587] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              {total} entries
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8 text-[12px] text-[#6c7587]">Loading {MASTER_TYPE_LABELS[selectedType].toLowerCase()}...</div>
        ) : isError ? (
          <div className="flex justify-center p-8 text-[12px] text-destructive">Failed to load masters.</div>
        ) : (
          // MASTERS TABLE — same border/thead/data/status/action treatment as Staff & Team Members
          <div className="mt-[4px] flex min-h-0 flex-1 flex-col overflow-hidden bg-white border border-[#e8e5df]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="h-[32px] border-b border-[#e8e5df] bg-[#233D4D]">
                    <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Icon</th>
                    <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Name</th>
                    <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">System Key</th>
                    {selectedType === 'SERVICE_CATEGORY' && (
                      <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Vertical</th>
                    )}
                    <th className="px-[12px] py-[6px] text-[12px] font-bold text-white uppercase tracking-wider">Status</th>
                    <th className="px-[12px] py-[6px] text-right text-[12px] font-bold text-white uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0ec]">
                  {paginatedMasters.length === 0 ? (
                    <tr>
                      <td colSpan={selectedType === 'SERVICE_CATEGORY' ? 6 : 5} className="py-12 text-center text-[12px] text-[#6c7587]">
                        No {MASTER_TYPE_LABELS[selectedType].toLowerCase()} yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedMasters.map((item) => (
                      <tr key={item._id} className="transition hover:bg-slate-50/80">
                        <td className="px-[12px] py-[8px]"><MasterImageCell masterId={item._id} /></td>
                        <td className="px-[12px] py-[8px] text-[12px] font-semibold text-[#4B1426]">{item.label}</td>
                        <td className="px-[12px] py-[8px] text-[11px] font-medium text-[#334155]">{item.key}</td>
                        {selectedType === 'SERVICE_CATEGORY' && (
                          <td className="px-[12px] py-[8px] text-[11px] font-medium text-[#6c7587]">
                            {typeof item.meta?.vertical === 'string' && item.meta.vertical ? item.meta.vertical : '—'}
                          </td>
                        )}
                        <td className="px-[12px] py-[8px]">
                          <select
                            key={`${item._id}-${item.active}`}
                            value={item.active ? 'ACTIVE' : 'INACTIVE'}
                            onChange={(e) => handleStatusChange(item, e.target.value === 'ACTIVE')}
                            className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                              item.active
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
                        <td className="px-[12px] py-[8px] text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <FormSheet
                              triggerLabel="Edit"
                              title="Edit Master Entry"
                              description={`Update ${item.label}.`}
                              triggerElement={
                                <button
                                  type="button"
                                  title="Edit Master Entry"
                                  className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95"
                                >
                                  <Pencil className="h-[12px] w-[12px] text-blue-600" />
                                </button>
                              }
                            >
                              {(close) => <EditMasterForm master={item} siblings={masters || []} onClose={close} />}
                            </FormSheet>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION — matching Staff & Team Members */}
            {total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-[12px] py-[6px] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#2563eb]">
                    Total Entries: <strong className="font-bold text-[#1d4ed8]">{total}</strong>
                  </span>
                  <span className="text-[11px] text-[#8a92a0]">
                    (Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, total)} of {total})
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
        )}
      </div>
    </div>
  );
}
