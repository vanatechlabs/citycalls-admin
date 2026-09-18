'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { useCreateServiceRequest } from '@/lib/hooks/useServiceRequests';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { useCatalogServices } from '@/lib/hooks/useCatalogServices';

interface FormValues {
  customerId: string;
  addressIndex: string;
  serviceId: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  symptoms: string;
}

export default function CreateServiceRequestPage() {
  const router = useRouter();
  const createReq = useCreateServiceRequest();
  const { data: customers } = useCustomers();
  const { data: services } = useCatalogServices();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { priority: 'NORMAL' },
  });

  const customerId = useWatch({ control, name: 'customerId' });
  const selectedCustomer = customers?.find((c) => c._id === (customerId || selectedCustomerId));

  const onSubmit = (data: FormValues) => {
    const address = selectedCustomer?.addresses[Number(data.addressIndex)];
    // The dropdown only lists addresses that already have a line1 (see the
    // note above the select), so this is always true in practice here —
    // just narrowing the type, not a real runtime fallback.
    if (!selectedCustomer || !address || !address.line1) return;

    createReq.mutate(
      {
        customerId: selectedCustomer._id,
        serviceId: data.serviceId,
        source: 'CALL',
        priority: data.priority,
        symptoms: data.symptoms ? [data.symptoms] : [],
        addressSnapshot: {
          line1: address.line1,
          line2: address.line2,
          landmark: address.landmark,
          city: address.city,
          state: address.state,
          pinCode: address.pinCode,
          country: address.country || 'India',
        },
      },
      {
        onSuccess: () => router.push('/dashboard/service-requests'),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Create Service Request</h1>
          <p className="text-[13px] text-muted-foreground">Log a new ticket for a customer.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-3 pt-2">
            
            {/* Customer Section */}
            <div className="space-y-3">
              <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
                <h2 className="text-base font-semibold text-foreground">Customer &amp; Address</h2>
                <p className="text-[13px] text-muted-foreground">Select the customer and the service address.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Select Customer</label>
                  <Controller
                    control={control}
                    name="customerId"
                    rules={{ required: 'Select a customer' }}
                    render={({ field }) => (
                      <select
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setSelectedCustomerId(e.target.value);
                        }}
                      >
                        <option value="">Search customer...</option>
                        {(customers || []).map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.contacts.find((ct) => ct.isPrimary)?.mobile ?? c.contacts[0]?.mobile})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.customerId && <p className="text-sm text-destructive">{errors.customerId.message}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Select Address</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('addressIndex', { required: 'Select an address' })} disabled={!selectedCustomer}>
                    <option value="">{selectedCustomer ? 'Choose registered address...' : 'Select a customer first'}</option>
                    {(selectedCustomer?.addresses || []).map((addr, i) =>
                      addr.line1 ? (
                        <option key={addr._id ?? i} value={i}>
                          {[addr.line1, addr.city, addr.pinCode].filter(Boolean).join(', ')}
                        </option>
                      ) : null
                    )}
                  </select>
                  {errors.addressIndex && <p className="text-sm text-destructive">{errors.addressIndex.message}</p>}
                  {selectedCustomer && selectedCustomer.addresses.length > 0 && selectedCustomer.addresses.every((a) => !a.line1) && (
                    <p className="text-xs text-amber-600">
                      This customer&apos;s saved address(es) don&apos;t have a street line yet — add one from their profile before creating a service request.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Service & Priority Section */}
            <div className="space-y-3 pt-2">
              <h2 className="text-base font-semibold text-foreground border-b border-border/50 pb-1 mb-2">Service Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Service Type</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('serviceId', { required: 'Select a service' })}>
                    <option value="">Select a service...</option>
                    {(services || []).map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  {errors.serviceId && <p className="text-sm text-destructive">{errors.serviceId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Priority</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('priority')}>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Request Details Section */}
            <div className="space-y-3 pt-2">
              <h2 className="text-base font-semibold text-foreground border-b border-border/50 pb-1 mb-2">Request Details</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Symptoms / Issue Description</label>
                <textarea
                  {...register('symptoms')}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Describe the issue reported by the customer..."
                />
              </div>
              {createReq.isError && (
                <p className="text-sm text-destructive">{createReq.error.response?.data?.message ?? 'Failed to create service request.'}</p>
              )}
            </div>

          </CardContent>
          <CardFooter className="flex justify-between gap-2 bg-muted/30 p-4 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={createReq.isPending}>
              {createReq.isPending ? 'Creating...' : 'Create Request'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
