'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';

import {
  useReopenRequests,
  useApproveReopenRequest,
  useRejectReopenRequest,
  ReopenRequest,
} from '@/lib/hooks/useReopenRequests';

function statusCategory(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'error';
  return 'default';
}

export default function ReopenRequestsPage() {
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const pending = useReopenRequests({ status: 'PENDING' });
  const all = useReopenRequests();
  const approve = useApproveReopenRequest();
  const reject = useRejectReopenRequest();

  const active = tab === 'PENDING' ? pending : all;
  const { data: reopenRequests, isLoading, isError } = active;
  const pendingCount = pending.data?.length ?? 0;

  const handleApprove = (item: ReopenRequest) => {
    if (!window.confirm(`Approve this reopen request for ${item.requestNumber ?? item.originalServiceRequestId}? A new visit will be scheduled immediately.`)) return;
    approve.mutate(item.id, {
      onSuccess: () => toast.success('Reopen request approved — new visit scheduled'),
      onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to approve reopen request'),
    });
  };

  const handleReject = (item: ReopenRequest) => {
    const reason = window.prompt('Reason for rejecting this reopen request?');
    if (!reason || !reason.trim()) return;
    reject.mutate(
      { id: item.id, reason: reason.trim() },
      {
        onSuccess: () => toast.success('Reopen request rejected — customer notified'),
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to reject reopen request'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Reopen Requests</h1>
          <p className="text-[13px] text-muted-foreground">Customer reopen requests awaiting review, and full reopen history.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === 'PENDING' ? 'default' : 'outline'} onClick={() => setTab('PENDING')}>
            Pending Review{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Button>
          <Button size="sm" variant={tab === 'ALL' ? 'default' : 'outline'} onClick={() => setTab('ALL')}>
            All History
          </Button>
        </div>
      </div>

      <Card className="border-orange-200">
        <CardHeader className="bg-orange-50/50">
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {tab === 'PENDING' ? 'Pending Reopen Review' : 'Reopen Request History'}
          </CardTitle>
          <CardDescription>
            {tab === 'PENDING'
              ? 'Customer-submitted reopen requests do not apply automatically — approve to schedule a new visit, or reject with a reason.'
              : 'Full history of reopen requests, including approved, rejected, and staff-initiated (auto-approved) reopens.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading reopen requests...</div>
          ) : isError ? (
            <div className="flex justify-center p-8 text-destructive">Failed to load reopen requests.</div>
          ) : tab === 'PENDING' && (reopenRequests?.length ?? 0) === 0 ? (
            <div className="flex justify-center p-8 text-muted-foreground">No reopen requests are pending review.</div>
          ) : (
            <DataTable<ReopenRequest>
              data={reopenRequests || []}
              pageSize={10}
              columns={[
                { key: 'requestNumber', header: 'Service Request', render: (item) => item.requestNumber ?? item.originalServiceRequestId },
                { key: 'customerName', header: 'Customer' },
                {
                  key: 'reason',
                  header: 'Reopen Reason',
                  render: (item) => <span className="text-sm font-medium text-slate-700">{item.reason}</span>,
                },
                {
                  key: 'reopenedAt',
                  header: 'Requested On',
                  render: (item) => new Date(item.reopenedAt).toLocaleDateString(),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (item) => (
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge label={item.status} category={statusCategory(item.status)} />
                      {item.status === 'REJECTED' && item.rejectionReason && (
                        <span className="text-xs text-muted-foreground">{item.rejectionReason}</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      {item.status === 'PENDING' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-success hover:text-success"
                            disabled={approve.isPending || reject.isPending}
                            onClick={() => handleApprove(item)}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-destructive hover:text-destructive"
                            disabled={approve.isPending || reject.isPending}
                            onClick={() => handleReject(item)}
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-2" render={<Link href={`/dashboard/service-requests/${item.originalServiceRequestId}`} />}>
                          <ExternalLink className="w-3 h-3" /> View Service Request
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
