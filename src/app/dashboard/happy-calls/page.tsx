'use client';

import Link from 'next/link';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PhoneCall } from 'lucide-react';

import { useState } from 'react';
import { FormSheet } from '@/components/ui/FormSheet';
import { RefreshCcw } from 'lucide-react';
import { useHappyCalls, useReassignHappyCall, HappyCall, serviceRequestNumber, assignedToName } from '@/lib/hooks/useHappyCalls';
import { useUsers } from '@/lib/hooks/useUsers';

function ReassignForm({ happyCallId, onClose }: { happyCallId: string; onClose: () => void }) {
  const { data: users } = useUsers();
  const reassign = useReassignHappyCall();
  const [assignedTo, setAssignedTo] = useState('');

  const onSubmit = () => {
    if (!assignedTo) return;
    reassign.mutate({ id: happyCallId, assignedTo }, { onSuccess: onClose });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Assign To</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">Select a user...</option>
          {(users || []).map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>)}
        </select>
      </div>
      {reassign.isError && <p className="text-sm text-destructive">{reassign.error.response?.data?.message ?? 'Failed to reassign.'}</p>}
      <Button className="w-full" disabled={!assignedTo || reassign.isPending} onClick={onSubmit}>
        {reassign.isPending ? 'Reassigning...' : 'Reassign'}
      </Button>
    </div>
  );
}

export default function HappyCallsPage() {
  const { data: happyCalls, isLoading, isError } = useHappyCalls();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Happy Calls</h1>
          <p className="text-[13px] text-muted-foreground">Follow up with customers on recently closed service requests.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Follow-ups</CardTitle>
          <CardDescription>Tickets that were recently closed and need a satisfaction check.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading happy calls...</div>
          ) : isError ? (
            <div className="flex justify-center p-8 text-destructive">Failed to load happy calls.</div>
          ) : (
            <>
            {/* <p className="text-sm text-muted-foreground mb-2">{happyCalls?.length ?? 0} happy calls</p> */}
            <DataTable<HappyCall>
              data={happyCalls || []}
              pageSize={10}
              columns={[
                { key: 'serviceRequestId', header: 'Service Request', render: (item) => serviceRequestNumber(item) },
                { key: 'assignedTo', header: 'Assigned To', render: (item) => assignedToName(item) },
                { key: 'retryCount', header: 'Attempts' },
                { key: 'createdAt', header: 'Scheduled On', render: (item) => new Date(item.createdAt).toLocaleDateString() },
                {
                  key: 'status',
                  header: 'Status',
                  render: (item) => (
                    <div className="flex items-center gap-1.5">
                      <StatusBadge label={item.status} category={item.status === 'COMPLETED' ? 'success' : 'warning'} />
                      {item.status !== 'COMPLETED' && item.customerSatisfaction && (
                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Customer responded in-app</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  render: (item) => (
                    <div className="flex items-center gap-1">
                      {item.status !== 'COMPLETED' ? (
                        <Button size="sm" variant="outline" className="gap-2" render={<Link href={`/dashboard/happy-calls/entry?id=${item._id}`} />}>
                          <PhoneCall className="w-3 h-3" /> Log Call
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Done</span>
                      )}
                      {item.status !== 'COMPLETED' && (
                        <FormSheet
                          triggerLabel="Reassign"
                          title="Reassign Happy Call"
                          description="Assign this follow-up to a different user."
                          triggerElement={<Button size="sm" variant="ghost"><RefreshCcw className="w-3.5 h-3.5" /></Button>}
                        >
                          {(close) => <ReassignForm happyCallId={item._id} onClose={close} />}
                        </FormSheet>
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
    </div>
  );
}
