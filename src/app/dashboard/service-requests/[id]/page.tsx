'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, UserCog, XCircle, IndianRupee } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

import {
  useServiceRequest,
  useAssignmentHistory,
  useServiceVisits,
  AssignmentHistoryEntry,
  ServiceVisit,
  SERVICE_REQUEST_STAGE_NAMES,
  stageIndexForStatus,
} from '@/lib/hooks/useServiceRequests';
import { useEstimates, Estimate } from '@/lib/hooks/useEstimates';
import { useInvoices, Invoice } from '@/lib/hooks/useInvoices';
import { Wrench } from 'lucide-react';

function FinancialDocRow({ label, status, total, onClick }: { label: string; status: string; total: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between rounded border border-slate-200 bg-white p-3 text-sm text-left hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        <StatusBadge label={status} category={status === 'APPROVED' || status === 'PAID' ? 'success' : status === 'REJECTED' || status === 'CANCELLED' ? 'error' : 'warning'} />
      </div>
      <span className="font-semibold">₹{total.toLocaleString('en-IN')}</span>
    </button>
  );
}

function warrantyLabel(warrantyExpiresAt?: string): { text: string; className: string } {
  if (!warrantyExpiresAt) return { text: 'Not recorded', className: 'text-muted-foreground' };
  const expired = new Date(warrantyExpiresAt).getTime() < Date.now();
  const date = new Date(warrantyExpiresAt).toLocaleDateString();
  return expired
    ? { text: `Out of Warranty (expired ${date})`, className: 'text-red-600' }
    : { text: `In Warranty (until ${date})`, className: 'text-green-600' };
}

function ServiceVisitItem({ visit }: { visit: ServiceVisit }) {
  const partsTotal = visit.parts.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  return (
    <div className="rounded border border-slate-200 bg-white p-4 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-900">Visit #{visit.visitNumber}</span>
        <StatusBadge label={visit.completedAt ? 'COMPLETED' : 'IN PROGRESS'} category={visit.completedAt ? 'success' : 'info'} />
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
        <span>Arrived:</span>
        <span className="text-right">{visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleString() : 'Not recorded'}</span>
        <span>Completed:</span>
        <span className="text-right">{visit.completedAt ? new Date(visit.completedAt).toLocaleString() : '—'}</span>
      </div>
      {visit.inspection?.defectFound && (
        <p className="text-xs text-slate-600"><span className="font-medium">Defect:</span> {visit.inspection.defectFound}</p>
      )}
      {visit.parts.length > 0 && (
        <div className="text-xs text-slate-600">
          <span className="font-medium">Parts used:</span> {visit.parts.map((p) => `${p.name} x${p.qty}`).join(', ')} (₹{partsTotal.toLocaleString('en-IN')})
        </div>
      )}
      {visit.labourCharge != null && (
        <p className="text-xs text-slate-600"><span className="font-medium">Labour charge:</span> ₹{visit.labourCharge.toLocaleString('en-IN')}</p>
      )}
      {visit.workNotes && <p className="text-xs text-slate-600"><span className="font-medium">Notes:</span> {visit.workNotes}</p>}
      <p className="text-xs text-muted-foreground">{visit.beforeImages.length} before / {visit.afterImages.length} after photo(s)</p>
    </div>
  );
}

function AssignmentHistoryItem({ entry, isFirst }: { entry: AssignmentHistoryEntry; isFirst: boolean }) {
  const label = entry.toAssigneeType ? `${entry.action.replace(/_/g, ' ')} — ${entry.toAssigneeType.replace(/_/g, ' ')}` : entry.action.replace(/_/g, ' ');
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${isFirst ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-600'}`}>
        <UserCog className="w-4 h-4" />
      </div>
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between space-x-2 mb-1">
          <div className="font-bold text-slate-900 text-sm capitalize">{label.toLowerCase()}</div>
          <time className="font-mono text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</time>
        </div>
        <div className="text-slate-500 text-xs">
          By {entry.actorId?.name ?? 'Unknown'} ({entry.actorRole.replace(/_/g, ' ')}) — {entry.method.replace(/_/g, ' ')}
          {entry.reason ? ` — ${entry.reason}` : ''}
        </div>
      </div>
    </div>
  );
}

export default function ServiceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: ticket, isLoading, isError } = useServiceRequest(id);
  const { data: history } = useAssignmentHistory(id);
  const { data: visits } = useServiceVisits(id);
  const { data: estimates } = useEstimates(id);
  const { data: invoices } = useInvoices(id);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading ticket details...</div>;
  if (isError || !ticket) return <div className="p-8 text-center text-destructive">Failed to load ticket details or ticket not found.</div>;

  const currentStageIndex = stageIndexForStatus(ticket.status);
  const isCancelled = ticket.status === 'CANCELLED';
  const warranty = warrantyLabel(ticket.customerProduct?.warrantyExpiresAt);
  const applianceLabel = ticket.customerProduct
    ? [ticket.customerProduct.brand, ticket.customerProduct.productType].filter(Boolean).join(' ') || 'Not recorded'
    : 'Not recorded';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Request: {ticket.number}</h1>
          <p className="text-[13px] text-muted-foreground">
            {ticket.service?.name ?? 'Service Ticket'} • Created on {new Date(ticket.createdAt).toLocaleDateString()}
            {ticket.createdByName ? ` by ${ticket.createdByName}` : ''}
          </p>
        </div>
        <div className="ml-auto space-x-2 flex items-center">
          <span className={`text-sm font-bold mr-4 ${ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'text-red-600' : 'text-slate-600'}`}>
            {ticket.priority} Priority
          </span>
          <StatusBadge label={ticket.status} category={ticket.status === 'NEW' ? 'error' : isCancelled ? 'error' : 'info'} />
        </div>
      </div>

      {/* Status Transition Ribbon */}
      {isCancelled ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-2 text-red-700 text-sm font-medium">
            <XCircle className="w-4 h-4" /> This service request was cancelled.
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:h-0.5 before:w-full before:bg-slate-200">
              {SERVICE_REQUEST_STAGE_NAMES.map((stage, i) => (
                <div key={stage} className="relative z-10 flex flex-col items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                      i <= currentStageIndex ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <span className="text-xs font-bold">{i + 1}</span>
                  </div>
                  <span className={`text-xs ${i <= currentStageIndex ? 'font-bold text-primary' : 'font-medium text-slate-500'}`}>{stage}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 text-orange-800 p-4 rounded-md border border-orange-100 text-sm">
                <span className="font-bold">Symptoms Reported:</span>
                <p className="mt-1">{ticket.symptoms && ticket.symptoms.length > 0 ? ticket.symptoms.join(', ') : 'None recorded.'}</p>
                {ticket.notes && <p className="mt-2 text-xs text-orange-700">Notes: {ticket.notes}</p>}
              </div>
              <div className="grid grid-cols-2 gap-y-4 text-sm pt-2">
                <span className="text-muted-foreground">Appliance:</span>
                <span className="font-medium">{applianceLabel}{ticket.customerProduct?.modelNumber ? ` (${ticket.customerProduct.modelNumber})` : ''}</span>
                <span className="text-muted-foreground">Warranty Status:</span>
                <span className={`font-medium ${warranty.className}`}>{warranty.text}</span>
                {ticket.scheduledDate && (
                  <>
                    <span className="text-muted-foreground">Scheduled Appointment:</span>
                    <span className="font-medium">
                      {new Date(ticket.scheduledDate).toLocaleDateString()}
                      {ticket.scheduledSlot ? ` • ${ticket.scheduledSlot}` : ''}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Service Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!visits || visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No technician visits recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {visits.map((v) => (
                    <ServiceVisitItem key={v._id} visit={v} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Estimates</p>
                {!estimates || estimates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No estimates for this request yet.</p>
                ) : (
                  <div className="space-y-2">
                    {estimates.map((e: Estimate) => (
                      <FinancialDocRow key={e._id} label={e.number} status={e.status} total={e.total} onClick={() => router.push('/dashboard/finance/estimates')} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Invoices</p>
                {!invoices || invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices for this request yet.</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv: Invoice) => (
                      <FinancialDocRow key={inv._id} label={inv.number} status={inv.status} total={inv.total} onClick={() => router.push('/dashboard/finance/invoices')} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-primary/10 text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900 text-sm">Ticket Created</div>
                      <time className="font-mono text-xs text-slate-500">{new Date(ticket.createdAt).toLocaleString()}</time>
                    </div>
                    <div className="text-slate-500 text-xs">By {ticket.createdByName ?? 'Unknown'}{ticket.notes ? ` — ${ticket.notes}` : ''}</div>
                  </div>
                </div>
                {(history ?? [])
                  .slice()
                  .reverse()
                  .map((entry, i) => (
                    <AssignmentHistoryItem key={entry._id} entry={entry} isFirst={i === 0 && (history?.length ?? 0) === 1} />
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{ticket.customer?.name || 'Unknown'}</p>
                  {ticket.customer?.mobile && <p className="text-xs text-muted-foreground">{ticket.customer.mobile}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
                {ticket.assignee ? (
                  <p className="text-sm font-medium mb-4">
                    Assigned to: {ticket.assignee.name} <span className="text-xs text-muted-foreground">({ticket.assignee.type.replace(/_/g, ' ')})</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">No technician assigned yet.</p>
                )}
                <Button className="w-full" onClick={() => router.push('/dashboard/dispatch')}>Go to Dispatch Board</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
