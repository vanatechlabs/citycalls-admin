'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, FileText } from 'lucide-react';

import { useEstimates, useCreateEstimate, useShareEstimate, useConvertEstimate, useApproveEstimate, useRejectEstimate, Estimate, LineItem } from '@/lib/hooks/useEstimates';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { useBranches } from '@/lib/hooks/useOrganization';
import { useServiceRequests } from '@/lib/hooks/useServiceRequests';

interface EstimateFormValues {
  customerId: string;
  branchId: string;
  serviceRequestId: string;
  items: LineItem[];
}

function CreateEstimateForm() {
  const createEstimate = useCreateEstimate();
  const { data: customers } = useCustomers();
  const { data: branches } = useBranches();
  const { data: serviceRequests } = useServiceRequests();

  const { register, control, handleSubmit, reset } = useForm<EstimateFormValues>({
    defaultValues: { items: [{ description: '', qty: 1, unitPrice: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const grandTotal = items?.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0) ?? 0;

  const onSubmit = (values: EstimateFormValues) => {
    createEstimate.mutate(
      {
        customerId: values.customerId,
        branchId: values.branchId,
        serviceRequestId: values.serviceRequestId || undefined,
        items: values.items.map((i) => ({ description: i.description, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })),
      },
      { onSuccess: () => reset({ items: [{ description: '', qty: 1, unitPrice: 0 }] }) }
    );
  };

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>New Estimate</CardTitle>
        <CardDescription>Select a customer and branch, then add line items for spares and labor.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-6 pb-6 border-b">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Customer</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('customerId', { required: true })}>
                <option value="">Select customer...</option>
                {(customers || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Branch</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('branchId', { required: true })}>
                <option value="">Select branch...</option>
                {(branches || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Link Service Request (Optional)</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('serviceRequestId')}>
                <option value="">None</option>
                {(serviceRequests || []).map((sr) => <option key={sr._id} value={sr._id}>{sr.number}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Line Items</h3>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => append({ description: '', qty: 1, unitPrice: 0 })}>
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item / Description</th>
                    <th className="px-4 py-3 font-semibold w-24 text-right">Qty</th>
                    <th className="px-4 py-3 font-semibold w-32 text-right">Price (₹)</th>
                    <th className="px-4 py-3 font-semibold w-32 text-right">Total (₹)</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => {
                    const qty = Number(items?.[index]?.qty) || 0;
                    const unitPrice = Number(items?.[index]?.unitPrice) || 0;
                    return (
                      <tr key={field.id}>
                        <td className="px-4 py-2">
                          <input className="w-full h-8 rounded border border-input bg-transparent px-2 text-sm" {...register(`items.${index}.description`, { required: true })} placeholder="e.g. AC Gas Recharge" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" step="1" className="w-full h-8 rounded border border-input bg-transparent px-2 text-sm text-right" {...register(`items.${index}.qty`, { valueAsNumber: true, min: 1 })} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" step="0.01" className="w-full h-8 rounded border border-input bg-transparent px-2 text-sm text-right" {...register(`items.${index}.unitPrice`, { valueAsNumber: true, min: 0 })} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{(qty * unitPrice).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-right font-bold text-lg">Grand Total:</td>
                    <td colSpan={2} className="px-4 py-4 text-right font-bold text-lg text-primary">₹{grandTotal.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {createEstimate.isError && (
            <p className="text-sm text-destructive">{createEstimate.error.response?.data?.message ?? 'Failed to create estimate.'}</p>
          )}
          {createEstimate.isSuccess && <p className="text-sm text-green-600">Estimate created successfully.</p>}
        </CardContent>
        <div className="flex justify-end p-6 pt-0">
          <Button type="submit" className="gap-2" disabled={createEstimate.isPending}>
            <FileText className="w-4 h-4" /> {createEstimate.isPending ? 'Saving...' : 'Save Estimate'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function EstimatesPage() {
  const { data: estimates, isLoading, isError } = useEstimates();
  const { data: customers } = useCustomers();
  const customerName = (id: string) => customers?.find((c) => c._id === id)?.name ?? 'Unknown';
  const shareEstimate = useShareEstimate();
  const convertEstimate = useConvertEstimate();
  const approveEstimate = useApproveEstimate();
  const rejectEstimate = useRejectEstimate();
  const anyActionPending = shareEstimate.isPending || convertEstimate.isPending || approveEstimate.isPending || rejectEstimate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Estimates</h1>
          <p className="text-[13px] text-muted-foreground">Manage and generate cost estimates for service requests.</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">All Estimates</TabsTrigger>
          <TabsTrigger value="create">Create Estimate</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Estimate Records</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading estimates...</div>
              ) : isError ? (
                <div className="flex justify-center p-8 text-destructive">Failed to load estimates.</div>
              ) : (
                <>
                {/* <p className="text-sm text-muted-foreground mb-2">{estimates?.length ?? 0} estimates</p> */}
                <DataTable<Estimate>
                  data={estimates || []}
                  pageSize={10}
                  columns={[
                    { key: 'number', header: 'Estimate ID' },
                    { key: 'customerId', header: 'Customer', render: (item) => customerName(item.customerId) },
                    { key: 'total', header: 'Total Amount', render: (item) => <span className="font-semibold">₹{(item.total || 0).toLocaleString('en-IN')}</span> },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (item) => (
                        <StatusBadge label={item.status} category={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'error' : 'warning'} />
                      ),
                    },
                    { key: 'createdAt', header: 'Date', render: (item) => new Date(item.createdAt).toLocaleDateString() },
                    {
                      key: 'actions',
                      header: '',
                      render: (item) => (
                        <div className="flex items-center gap-1">
                          {item.status === 'DRAFT' && (
                            <Button size="sm" variant="outline" disabled={anyActionPending} onClick={() => shareEstimate.mutate({ id: item._id, channels: ['WHATSAPP'] })}>
                              Share
                            </Button>
                          )}
                          {item.status === 'SHARED' && (
                            <>
                              <Button size="sm" disabled={anyActionPending} title="Admin override — customer hasn't responded yet" onClick={() => approveEstimate.mutate(item._id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" disabled={anyActionPending} title="Admin override — customer hasn't responded yet" onClick={() => rejectEstimate.mutate(item._id)}>
                                Reject
                              </Button>
                            </>
                          )}
                          {item.status === 'APPROVED' && (
                            <Button size="sm" disabled={anyActionPending} onClick={() => convertEstimate.mutate(item._id)}>
                              Convert to Proforma
                            </Button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <CreateEstimateForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
