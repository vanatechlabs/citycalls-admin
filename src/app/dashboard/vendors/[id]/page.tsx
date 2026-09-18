'use client';

import { use, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil } from 'lucide-react';

import { useVendor, useUpdateVendor, useSetVendorBlacklist, useVendorTechnicians, useAddVendorTechnician, Vendor } from '@/lib/hooks/useVendors';
import { useUsers } from '@/lib/hooks/useUsers';
import { useFileList, useUploadFile, useDeleteFile, resolveFileUrl } from '@/lib/hooks/useFiles';
import { useServiceRequests } from '@/lib/hooks/useServiceRequests';
import {
  useVendorInvoices,
  useCreateVendorInvoice,
  useApproveVendorInvoice,
  useVendorPayouts,
  useCreateVendorPayout,
  useMarkPayoutPaid,
} from '@/lib/hooks/useVendorFinance';
import { FileText, Trash2, IndianRupee } from 'lucide-react';

function splitList(value?: string): string[] {
  return (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

const vendorFormSchema = z.object({
  companyName: z.string().min(2, 'Name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactMobile: z.string().min(10, 'Enter a valid mobile number'),
  pinCodes: z.string().optional(),
  skills: z.string().optional(),
  gst: z.string().optional(),
  pan: z.string().optional(),
  commissionModel: z.enum(['FIXED', 'SERVICE_WISE']),
  commissionRate: z.number().min(0).max(100).optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankAccountHolderName: z.string().optional(),
  agreementUrl: z.string().optional(),
  agreementExpiryDate: z.string().optional(),
  active: z.boolean(),
});
type VendorFormValues = z.infer<typeof vendorFormSchema>;

function EditVendorForm({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const updateVendor = useUpdateVendor();
  const { register, handleSubmit, formState: { errors } } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      companyName: vendor.companyName,
      contactName: vendor.contactPersons?.[0]?.name ?? '',
      contactMobile: vendor.contactPersons?.[0]?.mobile ?? '',
      pinCodes: vendor.serviceAreas?.pinCodes?.join(', ') ?? '',
      skills: vendor.skills?.join(', ') ?? '',
      gst: vendor.gst ?? '',
      pan: vendor.pan ?? '',
      commissionModel: vendor.commissionModel,
      commissionRate: vendor.commissionRate ?? 0,
      bankAccountNumber: vendor.bankDetails?.accountNumber ?? '',
      bankIfsc: vendor.bankDetails?.ifsc ?? '',
      bankAccountHolderName: vendor.bankDetails?.accountHolderName ?? '',
      agreementUrl: vendor.agreement?.url ?? '',
      agreementExpiryDate: vendor.agreement?.expiryDate ? vendor.agreement.expiryDate.slice(0, 10) : '',
      active: vendor.active,
    },
  });

  const onSubmit = (values: VendorFormValues) => {
    const hasBank = values.bankAccountNumber && values.bankIfsc && values.bankAccountHolderName;
    const hasAgreement = values.agreementUrl && values.agreementExpiryDate;
    updateVendor.mutate(
      {
        id: vendor._id,
        companyName: values.companyName,
        contactPersons: [{ name: values.contactName, mobile: values.contactMobile }],
        serviceAreas: { pinCodes: splitList(values.pinCodes) },
        skills: splitList(values.skills),
        gst: values.gst || undefined,
        pan: values.pan || undefined,
        commissionModel: values.commissionModel,
        commissionRate: values.commissionRate,
        bankDetails: hasBank
          ? { accountNumber: values.bankAccountNumber!, ifsc: values.bankIfsc!, accountHolderName: values.bankAccountHolderName! }
          : undefined,
        agreement: hasAgreement ? { url: values.agreementUrl!, expiryDate: values.agreementExpiryDate! } : undefined,
        active: values.active,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Company / Agency Name" error={errors.companyName?.message} {...register('companyName')} />
      <AppFormField label="Primary Contact Name" error={errors.contactName?.message} {...register('contactName')} />
      <AppFormField label="Primary Contact Mobile" error={errors.contactMobile?.message} {...register('contactMobile')} />
      <AppFormField label="Service Area Pincodes (comma-separated)" {...register('pinCodes')} />
      <AppFormField label="Skills (comma-separated)" {...register('skills')} />
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

      <div className="space-y-1.5 border-t pt-4">
        <label className="text-sm font-medium">Bank Details (Optional)</label>
        <div className="grid grid-cols-2 gap-2">
          <AppFormField label="Account Number" {...register('bankAccountNumber')} />
          <AppFormField label="IFSC" {...register('bankIfsc')} />
        </div>
        <AppFormField label="Account Holder Name" {...register('bankAccountHolderName')} />
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <label className="text-sm font-medium">Agreement (Optional)</label>
        <AppFormField label="Document URL" {...register('agreementUrl')} />
        <AppFormField label="Expiry Date" type="date" {...register('agreementExpiryDate')} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="w-4 h-4" {...register('active')} />
        Active
      </label>

      {updateVendor.isError && <p className="text-sm text-destructive">{updateVendor.error.response?.data?.message ?? 'Failed to update vendor.'}</p>}
      <Button type="submit" className="w-full" disabled={updateVendor.isPending}>
        {updateVendor.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

function AddTechnicianForm({ vendorId, onClose }: { vendorId: string; onClose: () => void }) {
  const addTechnician = useAddVendorTechnician();
  const { data: users } = useUsers('VENDOR_TECHNICIAN');
  const [userId, setUserId] = useState('');
  const [skills, setSkills] = useState('');

  const onSubmit = () => {
    if (!userId) return;
    addTechnician.mutate({ vendorId, userId, skills: splitList(skills) }, { onSuccess: onClose });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">User Account</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Select a user...</option>
          {(users || []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        {(users || []).length === 0 && (
          <p className="text-xs text-muted-foreground">No users with the VENDOR_TECHNICIAN role found. Create one from Roles &amp; Users first.</p>
        )}
      </div>
      <AppFormField label="Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} />
      {addTechnician.isError && <p className="text-sm text-destructive">{addTechnician.error.response?.data?.message ?? 'Failed to add technician.'}</p>}
      <Button className="w-full" disabled={!userId || addTechnician.isPending} onClick={onSubmit}>
        {addTechnician.isPending ? 'Adding...' : 'Add Technician'}
      </Button>
    </div>
  );
}

function VendorDocumentsCard({ vendorId }: { vendorId: string }) {
  const { data: files, isLoading } = useFileList('VENDOR', vendorId);
  const { upload, isPending } = useUploadFile('VENDOR', vendorId);
  const deleteFile = useDeleteFile();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      await upload(file, 'VENDOR_DOCUMENT');
    } catch {
      setError('Failed to upload document.');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Documents</CardTitle>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
          {isPending ? 'Uploading...' : 'Upload Document'}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} disabled={isPending} />
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        ) : !files || files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          files.map((f) => (
            <div key={f._id} className="flex items-center justify-between border-b pb-2 text-sm">
              <a href={resolveFileUrl(f)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <FileText className="w-4 h-4" /> {f.key.split('/').pop()}
              </a>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteFile.mutate({ id: f._id, entityType: 'VENDOR', entityId: vendorId })}
                  disabled={deleteFile.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// No ratings concept exists on this platform (checked serviceRequests.model.ts
// and vendors.model.ts) — "performance" is a job-count breakdown by status,
// computed client-side from this vendor's own assigned requests.
function VendorPerformanceCard({ vendorId }: { vendorId: string }) {
  const { data: requests, isLoading } = useServiceRequests({ assigneeId: vendorId, limit: 100 });
  const list = requests || [];
  const completedStatuses = new Set(['SERVICE_COMPLETED', 'CUSTOMER_CONFIRMATION_PENDING', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'CLOSED']);
  const cancelledStatuses = new Set(['CANCELLED', 'REASSIGNMENT_REQUIRED']);
  const total = list.length;
  const completed = list.filter((r) => completedStatuses.has(r.status)).length;
  const cancelled = list.filter((r) => cancelledStatuses.has(r.status)).length;
  const inProgress = total - completed - cancelled;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading performance data...</p>
        ) : (
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-muted-foreground">Total Jobs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{cancelled}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
            <div className="col-span-4 pt-2 border-t text-sm">
              <span className="text-muted-foreground">Completion rate: </span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateVendorInvoiceForm({ vendorId, onClose }: { vendorId: string; onClose: () => void }) {
  const { data: requests } = useServiceRequests({ assigneeId: vendorId, limit: 100 });
  const createInvoice = useCreateVendorInvoice();
  const [selected, setSelected] = useState<string[]>([]);
  const [grossAmount, setGrossAmount] = useState('');

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onSubmit = () => {
    const amount = Number(grossAmount);
    if (selected.length === 0 || !amount || amount <= 0) return;
    createInvoice.mutate({ vendorId, serviceRequestIds: selected, grossAmount: amount }, { onSuccess: onClose });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Service Requests to Bill</label>
        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
          {(requests || []).map((r) => (
            <label key={r._id} className="flex items-center gap-2 text-sm py-1">
              <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggle(r._id)} />
              {r.number} <span className="text-muted-foreground text-xs">({r.status})</span>
            </label>
          ))}
          {(!requests || requests.length === 0) && <p className="text-xs text-muted-foreground">No service requests assigned to this vendor yet.</p>}
        </div>
      </div>
      <AppFormField label="Gross Amount (₹)" type="number" value={grossAmount} onChange={(e) => setGrossAmount(e.target.value)} />
      {createInvoice.isError && <p className="text-sm text-destructive">{createInvoice.error.response?.data?.message ?? 'Failed to create invoice.'}</p>}
      <Button className="w-full" onClick={onSubmit} disabled={createInvoice.isPending || selected.length === 0 || !grossAmount}>
        {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
      </Button>
    </div>
  );
}

function VendorFinanceCard({ vendorId }: { vendorId: string }) {
  const { data: invoices } = useVendorInvoices(vendorId);
  const { data: payouts } = useVendorPayouts(vendorId);
  const approveInvoice = useApproveVendorInvoice();
  const createPayout = useCreateVendorPayout();
  const markPaid = useMarkPayoutPaid();

  const approvedUnpaidInvoices = (invoices || []).filter((i) => i.status === 'APPROVED');

  const handleCreatePayout = () => {
    if (approvedUnpaidInvoices.length === 0) return;
    createPayout.mutate({ vendorId, vendorInvoiceIds: approvedUnpaidInvoices.map((i) => i._id) });
  };

  const handleMarkPaid = (payoutId: string) => {
    const reference = window.prompt('Payment reference (transaction ID / UTR)?');
    if (!reference) return;
    markPaid.mutate({ id: payoutId, vendorId, reference });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary" /> Invoices &amp; Payouts
        </CardTitle>
        <div className="flex gap-2">
          <FormSheet
            triggerLabel="Bill Service Requests"
            title="Create Vendor Invoice"
            description="Bill this vendor's completed service requests to compute their net payable amount."
          >
            {(close) => <CreateVendorInvoiceForm vendorId={vendorId} onClose={close} />}
          </FormSheet>
          <Button size="sm" onClick={handleCreatePayout} disabled={approvedUnpaidInvoices.length === 0 || createPayout.isPending}>
            {createPayout.isPending ? 'Creating...' : `Create Payout (${approvedUnpaidInvoices.length} approved)`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Invoices</p>
          {(!invoices || invoices.length === 0) ? (
            <p className="text-sm text-muted-foreground">No invoices billed yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <p className="font-medium">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross ₹{inv.commissionBreakup.grossAmount.toLocaleString('en-IN')} − {inv.commissionBreakup.commissionRate}% commission = Net ₹{inv.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={inv.status} category={inv.status === 'PAID' ? 'success' : inv.status === 'DISPUTED' ? 'error' : 'warning'} />
                    {inv.status === 'PENDING' && (
                      <Button size="sm" variant="outline" onClick={() => approveInvoice.mutate({ id: inv._id, vendorId })} disabled={approveInvoice.isPending}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Payouts</p>
          {(!payouts || payouts.length === 0) ? (
            <p className="text-sm text-muted-foreground">No payouts created yet.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p._id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <p className="font-medium">{p.number}</p>
                    <p className="text-xs text-muted-foreground">₹{p.amount.toLocaleString('en-IN')}{p.reference ? ` · ${p.reference}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={p.status} category={p.status === 'PAID' ? 'success' : p.status === 'FAILED' ? 'error' : 'warning'} />
                    {p.status !== 'PAID' && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaid(p._id)} disabled={markPaid.isPending}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: vendor, isLoading, isError } = useVendor(id);
  const { data: technicians } = useVendorTechnicians(id);
  const setBlacklist = useSetVendorBlacklist();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading vendor details...</div>;
  if (isError || !vendor) return <div className="p-8 text-center text-destructive">Failed to load vendor details.</div>;

  const handleBlacklistToggle = () => {
    if (vendor.blacklisted) {
      setBlacklist.mutate({ id, blacklisted: false });
      return;
    }
    const reason = window.prompt('Reason for blacklisting this vendor?');
    if (!reason) return;
    setBlacklist.mutate({ id, blacklisted: true, blacklistReason: reason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">{vendor.companyName}</h1>
          <p className="text-[13px] text-muted-foreground">Vendor ID: {vendor._id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge
            label={vendor.blacklisted ? 'BLACKLISTED' : vendor.active ? 'ACTIVE' : 'INACTIVE'}
            category={vendor.blacklisted ? 'error' : vendor.active ? 'success' : 'default'}
          />
          <Button variant={vendor.blacklisted ? 'outline' : 'destructive'} size="sm" onClick={handleBlacklistToggle} disabled={setBlacklist.isPending}>
            {vendor.blacklisted ? 'Remove from Blacklist' : 'Blacklist Vendor'}
          </Button>
          <FormSheet
            triggerLabel="Edit Vendor"
            title="Edit Vendor"
            description={`Update ${vendor.companyName}.`}
            triggerElement={<Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-2" />Edit</Button>}
          >
            {(close) => <EditVendorForm vendor={vendor} onClose={close} />}
          </FormSheet>
        </div>
      </div>

      {vendor.blacklisted && vendor.blacklistReason && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-sm text-red-700">
            <span className="font-semibold">Blacklist reason:</span> {vendor.blacklistReason}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Contact:</span>
              <span className="font-medium">{vendor.contactPersons?.[0]?.name || 'N/A'}</span>
              <span className="text-muted-foreground">Mobile:</span>
              <span className="font-medium">{vendor.contactPersons?.[0]?.mobile || 'N/A'}</span>
              <span className="text-muted-foreground">Service Areas:</span>
              <span className="font-medium">{vendor.serviceAreas?.pinCodes?.join(', ') || 'N/A'}</span>
              <span className="text-muted-foreground">Skills:</span>
              <span className="font-medium">{vendor.skills?.join(', ') || 'N/A'}</span>
              <span className="text-muted-foreground">GST:</span>
              <span className="font-medium">{vendor.gst || 'N/A'}</span>
              <span className="text-muted-foreground">PAN:</span>
              <span className="font-medium">{vendor.pan || 'N/A'}</span>
              <span className="text-muted-foreground">Commission:</span>
              <span className="font-medium">{vendor.commissionModel.replace('_', '-')} — {vendor.commissionRate ?? 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank &amp; Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Account Number:</span>
              <span className="font-medium">{vendor.bankDetails?.accountNumber || 'N/A'}</span>
              <span className="text-muted-foreground">IFSC:</span>
              <span className="font-medium">{vendor.bankDetails?.ifsc || 'N/A'}</span>
              <span className="text-muted-foreground">Account Holder:</span>
              <span className="font-medium">{vendor.bankDetails?.accountHolderName || 'N/A'}</span>
              <span className="text-muted-foreground">Agreement:</span>
              <span className="font-medium">
                {vendor.agreement?.url ? (
                  <a href={vendor.agreement.url} target="_blank" rel="noreferrer" className="text-primary underline">View Document</a>
                ) : 'N/A'}
              </span>
              <span className="text-muted-foreground">Agreement Expiry:</span>
              <span className="font-medium">{vendor.agreement?.expiryDate ? new Date(vendor.agreement.expiryDate).toLocaleDateString() : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Technicians</CardTitle>
          <FormSheet triggerLabel="Add Technician" title="Add Technician" description={`Add a technician for ${vendor.companyName}.`}>
            {(close) => <AddTechnicianForm vendorId={id} onClose={close} />}
          </FormSheet>
        </CardHeader>
        <CardContent className="space-y-3">
          {(technicians || []).map((t) => (
            <div key={t._id} className="flex items-center justify-between border-b pb-2 text-sm">
              <div>
                <p className="font-medium">{t.userId?.name ?? 'Unknown'}</p>
                <p className="text-muted-foreground text-xs">{t.userId?.mobile}{t.skills?.length ? ` · ${t.skills.join(', ')}` : ''}</p>
              </div>
              <StatusBadge label={t.active ? 'ACTIVE' : 'INACTIVE'} category={t.active ? 'success' : 'default'} />
            </div>
          ))}
          {(!technicians || technicians.length === 0) && (
            <p className="text-muted-foreground text-sm">No technicians added yet.</p>
          )}
        </CardContent>
      </Card>

      <VendorPerformanceCard vendorId={id} />
      <VendorDocumentsCard vendorId={id} />
      <VendorFinanceCard vendorId={id} />
    </div>
  );
}
