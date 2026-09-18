'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { IndianRupee, FileMinus, FilePlus } from 'lucide-react';

import {
  useInvoices,
  useRecordPayment,
  useShareInvoice,
  useCancelInvoice,
  usePaymentHistory,
  useInvoiceNotes,
  useIssueCreditNote,
  useIssueDebitNote,
  Invoice,
  PaymentMethod,
  PAYMENT_METHODS,
} from '@/lib/hooks/useInvoices';
import { useCustomers } from '@/lib/hooks/useCustomers';

function IssueNoteForm({ invoiceId, kind, close }: { invoiceId: string; kind: 'credit' | 'debit'; close: () => void }) {
  const issueCreditNote = useIssueCreditNote();
  const issueDebitNote = useIssueDebitNote();
  const mutation = kind === 'credit' ? issueCreditNote : issueDebitNote;
  const { register, handleSubmit } = useForm<{ amount: number; reason: string }>();

  const onSubmit = (values: { amount: number; reason: string }) => {
    mutation.mutate(
      { invoiceId, amount: Number(values.amount), reason: values.reason },
      { onSuccess: () => close() }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Amount (₹)" type="number" step="0.01" required {...register('amount', { required: true, valueAsNumber: true, min: 0.01 })} />
      <AppFormField label="Reason" required {...register('reason', { required: true })} />
      {mutation.isError && (
        <p className="text-sm text-destructive">{mutation.error.response?.data?.message ?? `Failed to issue ${kind} note.`}</p>
      )}
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Issuing...' : `Issue ${kind === 'credit' ? 'Credit' : 'Debit'} Note`}
      </Button>
    </form>
  );
}

function RecordPaymentForm({ invoiceId, outstanding, recordPayment }: { invoiceId: string; outstanding: number; recordPayment: ReturnType<typeof useRecordPayment> }) {
  const [amount, setAmount] = useState(outstanding);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');

  // Keeps the default amount in sync after a partial payment reduces the
  // outstanding balance for the same invoice (component stays mounted,
  // keyed only by invoice id, not by outstanding amount).
  useEffect(() => setAmount(outstanding), [outstanding]);

  const amountValid = amount > 0 && amount <= outstanding;

  const handleSubmit = () => {
    if (!amountValid) return;
    recordPayment.mutate({ invoiceId, amount, method, reference: reference.trim() || undefined });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={outstanding}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Method</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium">Reference (optional)</label>
        <input
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          placeholder="Transaction ID / cheque no."
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      {!amountValid && (
        <p className="text-sm text-destructive mb-2">Amount must be between ₹0.01 and ₹{outstanding.toLocaleString('en-IN')}.</p>
      )}
      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={recordPayment.isPending || !amountValid}>
        {recordPayment.isPending ? 'Recording...' : `Record Payment (₹${amount.toLocaleString('en-IN')})`}
      </Button>
    </>
  );
}

export default function InvoicesPage() {
  const { data: invoices, isLoading, isError } = useInvoices();
  const { data: customers } = useCustomers();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const recordPayment = useRecordPayment();
  const shareInvoice = useShareInvoice();
  const cancelInvoice = useCancelInvoice();

  const data = invoices || [];
  const selectedInvoice = data.find(i => i._id === selectedInvoiceId) || data[0];
  const { data: payments } = usePaymentHistory(selectedInvoice?._id ?? '');
  const { data: notes } = useInvoiceNotes(selectedInvoice?._id ?? '');
  const customerName = (id?: string) => customers?.find((c) => c._id === id)?.name ?? 'Unknown';
  const outstanding = (inv: Invoice) => inv.total - inv.amountPaid;

  const handleShare = () => {
    if (!selectedInvoice) return;
    shareInvoice.mutate({ invoiceId: selectedInvoice._id, channels: ['EMAIL', 'WHATSAPP'] });
  };

  const handleCancel = () => {
    if (!selectedInvoice) return;
    const reason = window.prompt('Reason for cancelling this invoice?');
    if (!reason) return;
    cancelInvoice.mutate({ invoiceId: selectedInvoice._id, reason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Invoices & Payments</h1>
          <p className="text-[13px] text-muted-foreground">Manage final billing and record customer payments.</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">All Invoices</TabsTrigger>
          <TabsTrigger value="detail">Invoice Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Records</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading invoices...</div>
              ) : isError ? (
                <div className="flex justify-center p-8 text-destructive">Failed to load invoices.</div>
              ) : (
                <>
                <p className="text-sm text-muted-foreground mb-2">{data.length} invoices</p>
                <DataTable<Invoice>
                  data={data}
                  pageSize={10}
                  onRowClick={(item) => setSelectedInvoiceId(item._id)}
                  columns={[
                    { key: 'number', header: 'Invoice ID' },
                    { key: 'customerId', header: 'Customer', render: (item) => customerName(item.customerId) },
                    { key: 'total', header: 'Billed Amount', render: (item) => <span className="font-semibold text-slate-800">₹{(item.total || 0).toLocaleString('en-IN')}</span> },
                    {
                      key: 'status',
                      header: 'Payment Status',
                      render: (item) => <StatusBadge label={item.status} category={item.status === 'PAID' ? 'success' : 'error'} />,
                    },
                    { key: 'createdAt', header: 'Invoice Date', render: (item) => new Date(item.createdAt).toLocaleDateString() },
                  ]}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">Invoice {selectedInvoice?.number}</CardTitle>
                    <CardDescription className="mt-1">Generated on {selectedInvoice ? new Date(selectedInvoice.createdAt).toLocaleDateString() : ''}</CardDescription>
                  </div>
                  {selectedInvoice && <StatusBadge label={selectedInvoice.status} category={selectedInvoice.status === 'PAID' ? 'success' : 'error'} />}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {selectedInvoice ? (
                  <>
                    <div className="grid grid-cols-2 text-sm gap-y-4">
                      <div className="text-slate-500">Bill To:</div>
                      <div className="font-medium text-right">{customerName(selectedInvoice.customerId)}</div>

                      <div className="text-slate-500">Amount Paid:</div>
                      <div className="font-medium text-right">₹{selectedInvoice.amountPaid.toLocaleString('en-IN')}</div>

                      <div className="text-slate-500">Total Amount:</div>
                      <div className="font-bold text-lg text-right text-slate-900">₹{(selectedInvoice.total || 0).toLocaleString('en-IN')}</div>
                    </div>

                    {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                      <div className="border-t pt-6 mt-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <IndianRupee className="w-5 h-5 text-primary" />
                          Record Payment
                        </h4>
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-md mb-4 text-sm text-orange-800">
                          Customer has an outstanding balance of <strong>₹{outstanding(selectedInvoice).toLocaleString('en-IN')}</strong>.
                        </div>
                        <RecordPaymentForm
                          key={selectedInvoice._id}
                          invoiceId={selectedInvoice._id}
                          outstanding={outstanding(selectedInvoice)}
                          recordPayment={recordPayment}
                        />
                        {recordPayment.isError && (
                          <p className="text-sm text-destructive mt-2">{recordPayment.error.response?.data?.message ?? 'Failed to record payment.'}</p>
                        )}
                        <Button className="w-full mt-2" variant="outline" onClick={handleShare} disabled={shareInvoice.isPending}>
                          {shareInvoice.isPending ? 'Sending...' : 'Share via Email/WhatsApp'}
                        </Button>
                        {shareInvoice.isSuccess && <p className="text-sm text-green-600 mt-2">Invoice shared.</p>}
                        {selectedInvoice.amountPaid === 0 && (
                          <Button variant="destructive" className="w-full mt-2" onClick={handleCancel} disabled={cancelInvoice.isPending}>
                            {cancelInvoice.isPending ? 'Cancelling...' : 'Cancel Invoice'}
                          </Button>
                        )}
                        {cancelInvoice.isError && <p className="text-sm text-destructive mt-2">{cancelInvoice.error.response?.data?.message ?? 'Failed to cancel invoice.'}</p>}
                      </div>
                    )}
                    {selectedInvoice.status === 'CANCELLED' && (
                      <div className="border-t pt-4 mt-4 text-sm text-destructive">This invoice has been cancelled.</div>
                    )}

                    <div className="border-t pt-6 mt-6">
                      <h4 className="font-semibold mb-4">Payment History</h4>
                      {(payments || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {(payments || []).map((p) => (
                            <div key={p._id} className="flex items-center justify-between text-sm border-b pb-2">
                              <div>
                                <p className="font-medium">{p.number}</p>
                                <p className="text-xs text-muted-foreground">{p.method.replace(/_/g, ' ')}{p.reference ? ` · ${p.reference}` : ''}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">₹{p.amount.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {(selectedInvoice.status === 'PAID' || selectedInvoice.status === 'PARTIALLY_PAID') && (
                      <div className="border-t pt-6 mt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">Adjustments (Credit/Debit Notes)</h4>
                          <div className="flex gap-2">
                            <FormSheet
                              triggerLabel="Issue Credit Note"
                              title="Issue Credit Note"
                              description="Reduces the effective value of this invoice without editing it in place."
                              triggerElement={<Button size="sm" variant="outline" className="gap-1"><FileMinus className="w-4 h-4" /> Credit Note</Button>}
                            >
                              {(close) => <IssueNoteForm invoiceId={selectedInvoice._id} kind="credit" close={close} />}
                            </FormSheet>
                            <FormSheet
                              triggerLabel="Issue Debit Note"
                              title="Issue Debit Note"
                              description="Increases the effective value of this invoice without editing it in place."
                              triggerElement={<Button size="sm" variant="outline" className="gap-1"><FilePlus className="w-4 h-4" /> Debit Note</Button>}
                            >
                              {(close) => <IssueNoteForm invoiceId={selectedInvoice._id} kind="debit" close={close} />}
                            </FormSheet>
                          </div>
                        </div>
                        {(!notes || (notes.creditNotes.length === 0 && notes.debitNotes.length === 0)) ? (
                          <p className="text-sm text-muted-foreground">No credit or debit notes issued yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {notes.creditNotes.map((n) => (
                              <div key={n._id} className="flex items-center justify-between text-sm border-b pb-2">
                                <div>
                                  <p className="font-medium">{n.number} <span className="text-xs text-green-600">(Credit)</span></p>
                                  <p className="text-xs text-muted-foreground">{n.reason}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">₹{n.amount.toLocaleString('en-IN')}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                            {notes.debitNotes.map((n) => (
                              <div key={n._id} className="flex items-center justify-between text-sm border-b pb-2">
                                <div>
                                  <p className="font-medium">{n.number} <span className="text-xs text-red-600">(Debit)</span></p>
                                  <p className="text-xs text-muted-foreground">{n.reason}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">₹{n.amount.toLocaleString('en-IN')}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">Select an invoice from the list to view details.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
