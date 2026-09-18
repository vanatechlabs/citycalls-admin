'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useVendors, useCreateVendor, Vendor, useDeleteVendor } from '@/lib/hooks/useVendors';

function splitList(value?: string): string[] {
  return (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

const createVendorSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactMobile: z.string().min(10, 'Enter a valid mobile number'),
  pinCodes: z.string().optional(),
  gst: z.string().optional(),
  pan: z.string().optional(),
  commissionModel: z.enum(['FIXED', 'SERVICE_WISE']),
  commissionRate: z.number().min(0).max(100).optional(),
});
type CreateVendorValues = z.infer<typeof createVendorSchema>;

function OnboardVendorForm({ onClose }: { onClose: () => void }) {
  const createVendor = useCreateVendor();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateVendorValues>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: { commissionModel: 'FIXED' },
  });

  const onSubmit = (values: CreateVendorValues) => {
    createVendor.mutate(
      {
        companyName: values.companyName,
        contactPersons: [{ name: values.contactName, mobile: values.contactMobile }],
        serviceAreas: { pinCodes: splitList(values.pinCodes) },
        gst: values.gst || undefined,
        pan: values.pan || undefined,
        commissionModel: values.commissionModel,
        commissionRate: values.commissionRate,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Company / Agency Name" error={errors.companyName?.message} {...register('companyName')} />
      <AppFormField label="Primary Contact Name" error={errors.contactName?.message} {...register('contactName')} />
      <AppFormField label="Primary Contact Mobile" error={errors.contactMobile?.message} {...register('contactMobile')} />
      <AppFormField label="Service Area Pincodes (comma-separated)" placeholder="110001, 110002" {...register('pinCodes')} />
      <div className="grid grid-cols-2 gap-4">
        <AppFormField label="GST (Optional)" {...register('gst')} />
        <AppFormField label="PAN (Optional)" {...register('pan')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Commission Model</label>
          <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('commissionModel')}>
            <option value="FIXED">Fixed</option>
            <option value="SERVICE_WISE">Service-wise</option>
          </select>
        </div>
        <AppFormField label="Commission Rate (%)" type="number" {...register('commissionRate', { valueAsNumber: true })} />
      </div>
      {createVendor.isError && <p className="text-sm text-destructive">{createVendor.error.response?.data?.message ?? 'Failed to onboard vendor.'}</p>}
      <Button type="submit" className="w-full" disabled={createVendor.isPending}>
        {createVendor.isPending ? 'Onboarding...' : 'Onboard Vendor'}
      </Button>
    </form>
  );
}

export default function VendorsPage() {
  const router = useRouter();
  const { data: vendors, isLoading, isError } = useVendors();
  const deleteVendor = useDeleteVendor();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    if (!searchTerm) return vendors;
    const lowerQ = searchTerm.toLowerCase();
    return vendors.filter(v => 
      v.companyName.toLowerCase().includes(lowerQ) ||
      v.contactPersons?.some(p => p.name.toLowerCase().includes(lowerQ) || p.mobile.includes(lowerQ)) ||
      v.serviceAreas?.pinCodes?.some(pin => pin.includes(lowerQ))
    );
  }, [vendors, searchTerm]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteVendor.mutate(id, {
      onSuccess: () => toast.success('Vendor deleted successfully'),
      onError: () => toast.error('Failed to delete vendor'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Vendors</h1>
          <p className="text-[13px] text-muted-foreground">Manage third-party service agencies and partners.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search vendors..."
              className="w-64 pl-9 bg-background h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <FormSheet triggerLabel="Onboard Vendor" title="Onboard Vendor" description="Register a new vendor company.">
            {(close) => <OnboardVendorForm onClose={close} />}
          </FormSheet>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading vendors...</div>
          ) : isError ? (
            <div className="flex justify-center p-8 text-destructive">Failed to load vendors.</div>
          ) : (
            <>
            <DataTable<Vendor>
              data={filteredVendors}
              pageSize={10}
              onRowClick={(item) => router.push(`/dashboard/vendors/${item._id}`)}
              columns={[
                { key: 'companyName', header: 'Agency Name' },
                { key: 'contactPersons', header: 'Primary Contact', render: (item) => item.contactPersons?.[0]?.name || 'N/A' },
                { key: 'mobile', header: 'Mobile', render: (item) => item.contactPersons?.[0]?.mobile || 'N/A' },
                { key: 'serviceAreas', header: 'Pin Codes Served', render: (item) => item.serviceAreas?.pinCodes?.join(', ') || 'N/A' },
                {
                  key: 'active',
                  header: 'Status',
                  render: (item) => (
                    <StatusBadge
                      label={item.blacklisted ? 'BLACKLISTED' : item.active ? 'ACTIVE' : 'INACTIVE'}
                      category={item.blacklisted ? 'error' : item.active ? 'success' : 'default'}
                    />
                  ),
                },
                {
                  key: 'actions',
                  header: 'Action',
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/vendors/${item._id}`); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, item._id)} disabled={deleteVendor.isPending}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
