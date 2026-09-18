'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import {
  useProformaInvoices,
  useShareProformaInvoice,
  useAcceptProformaInvoice,
  useConvertProformaInvoice,
  ProformaInvoice,
} from '@/lib/hooks/useProformaInvoices';
import { useCustomers } from '@/lib/hooks/useCustomers';

export default function ProformaInvoicesPage() {
  const { data: proformas, isLoading, isError } = useProformaInvoices();
  const { data: customers } = useCustomers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shareProforma = useShareProformaInvoice();
  const acceptProforma = useAcceptProformaInvoice();
  const convertProforma = useConvertProformaInvoice();

  const data = proformas || [];
  const selected = data.find((p) => p._id === selectedId) || data[0];
  const customerName = (id?: string) => customers?.find((c) => c._id === id)?.name ?? 'Unknown';
  const anyActionPending = shareProforma.isPending || acceptProforma.isPending || convertProforma.isPending;

  const statusCategory = (status: ProformaInvoice['status']) =>
    status === 'ACCEPTED' || status === 'CONVERTED' ? 'success' : status === 'CANCELLED' ? 'error' : 'warning';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Proforma Invoices</h1>
          <p className="text-[13px] text-muted-foreground">
            Advance billing documents generated from approved estimates, pending customer acceptance before final invoicing.
          </p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">All Proforma Invoices</TabsTrigger>
          <TabsTrigger value="detail">Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Proforma Invoice Records</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading proforma invoices...</div>
              ) : isError ? (
                <div className="flex justify-center p-8 text-destructive">Failed to load proforma invoices.</div>
              ) : (
                <DataTable<ProformaInvoice>
                  data={data}
                  pageSize={10}
                  onRowClick={(item) => setSelectedId(item._id)}
                  columns={[
                    { key: 'number', header: 'Proforma ID' },
                    { key: 'customerId', header: 'Customer', render: (item) => customerName(item.customerId) },
                    { key: 'total', header: 'Amount', render: (item) => <span className="font-semibold text-slate-800">₹{(item.total || 0).toLocaleString('en-IN')}</span> },
                    { key: 'status', header: 'Status', render: (item) => <StatusBadge label={item.status} category={statusCategory(item.status)} /> },
                    { key: 'createdAt', header: 'Date', render: (item) => new Date(item.createdAt).toLocaleDateString() },
                    {
                      key: 'actions',
                      header: '',
                      render: (item) => (
                        <div className="flex items-center gap-1">
                          {item.status === 'DRAFT' && (
                            <Button size="sm" variant="outline" disabled={anyActionPending} onClick={() => shareProforma.mutate({ id: item._id, channels: ['WHATSAPP'] })}>
                              Share
                            </Button>
                          )}
                          {item.status === 'SHARED' && (
                            <Button size="sm" disabled={anyActionPending} onClick={() => acceptProforma.mutate(item._id)}>
                              Mark Accepted
                            </Button>
                          )}
                          {item.status === 'ACCEPTED' && (
                            <Button size="sm" disabled={anyActionPending} onClick={() => convertProforma.mutate(item._id)}>
                              Convert to Invoice
                            </Button>
                          )}
                          {item.status === 'CONVERTED' && <span className="text-xs text-muted-foreground">Converted to invoice</span>}
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <Card className="max-w-2xl">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Proforma {selected?.number}</CardTitle>
                  <CardDescription className="mt-1">
                    {selected ? `Generated on ${new Date(selected.createdAt).toLocaleDateString()}` : ''}
                  </CardDescription>
                </div>
                {selected && <StatusBadge label={selected.status} category={statusCategory(selected.status)} />}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {selected ? (
                <div className="grid grid-cols-2 text-sm gap-y-4">
                  <div className="text-slate-500">Customer:</div>
                  <div className="font-medium text-right">{customerName(selected.customerId)}</div>
                  <div className="text-slate-500">Total Amount:</div>
                  <div className="font-bold text-lg text-right text-slate-900">₹{(selected.total || 0).toLocaleString('en-IN')}</div>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">Select a proforma invoice from the list to view details.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
