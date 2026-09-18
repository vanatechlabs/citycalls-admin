'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { useComplaints, Complaint, ComplaintStatus, customerName, serviceRequestNumber } from '@/lib/hooks/useComplaints';

const STATUS_FILTERS: { label: string; value: ComplaintStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

function statusCategory(status: ComplaintStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
  if (status === 'OPEN') return 'error';
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success';
  return 'default';
}

export default function ComplaintsPage() {
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | undefined>(undefined);
  const { data: complaints, isLoading, isError } = useComplaints({ status: statusFilter });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Complaints</h1>
          <p className="text-[13px] text-muted-foreground">Customer-raised complaints and their resolution status.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Complaints</CardTitle>
          <CardDescription>Review and respond to complaints raised by customers in the app.</CardDescription>
          <div className="flex gap-2 pt-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.label}
                size="sm"
                variant={statusFilter === f.value ? 'default' : 'outline'}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading complaints...</div>
          ) : isError ? (
            <div className="flex justify-center p-8 text-destructive">Failed to load complaints.</div>
          ) : (
            <DataTable<Complaint>
              data={complaints || []}
              pageSize={10}
              columns={[
                { key: 'subject', header: 'Subject' },
                { key: 'customerId', header: 'Customer', render: (item) => customerName(item) },
                { key: 'serviceRequestId', header: 'Service Request', render: (item) => serviceRequestNumber(item) ?? '—' },
                { key: 'createdAt', header: 'Raised On', render: (item) => new Date(item.createdAt).toLocaleDateString() },
                {
                  key: 'status',
                  header: 'Status',
                  render: (item) => <StatusBadge label={item.status.replace('_', ' ')} category={statusCategory(item.status)} />,
                },
                {
                  key: 'action',
                  header: '',
                  render: (item) => (
                    <Button size="sm" variant="outline" className="gap-2" render={<Link href={`/dashboard/complaints/${item._id}`} />}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
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
