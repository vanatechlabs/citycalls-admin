'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useServiceRequests, stageForStatus, useDeleteServiceRequest } from '@/lib/hooks/useServiceRequests';

export default function ServiceRequestsPage() {
  return (
    <Suspense>
      <ServiceRequestsPageContent />
    </Suspense>
  );
}

function ServiceRequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vertical = searchParams.get('vertical') ?? undefined;
  const { data: tickets, isLoading, isError } = useServiceRequests({ vertical });
  const deleteServiceRequest = useDeleteServiceRequest();
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const escalatedCount = useMemo(() => (tickets || []).filter((t) => t.isEscalated).length, [tickets]);
  const visibleTickets = useMemo(() => (escalatedOnly ? (tickets || []).filter((t) => t.isEscalated) : tickets || []), [tickets, escalatedOnly]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteServiceRequest.mutate(id, {
      onSuccess: () => {
        toast.success('Service request deleted successfully');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">{vertical === 'BEAUTY' ? 'Beauty & Salon Requests' : 'Service Requests'}</h1>
          <p className="text-[13px] text-muted-foreground">Manage and track customer tickets.</p>
        </div>
        <div className="space-x-2">
          <Button
            size="sm"
            variant={escalatedOnly ? 'destructive' : 'outline'}
            className="gap-1.5"
            onClick={() => setEscalatedOnly((v) => !v)}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {escalatedOnly ? 'Showing Escalated' : `Escalated (${escalatedCount})`}
          </Button>
          <Button size="sm" variant="outline" render={<Link href="/dashboard/dispatch" />}>
            Dispatch Board
          </Button>
          <Button render={<Link href="/dashboard/service-requests/create" />}>
            Create Request
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading service requests...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load service requests.</div>
      ) : (
        <>
          {/* <p className="text-sm text-muted-foreground">{tickets?.length ?? 0} service requests</p> */}
          <DataTable
            data={visibleTickets}
            pageSize={10}
            onRowClick={(item) => router.push(`/dashboard/service-requests/${item._id}`)}
            columns={[
              {
                key: 'number',
                header: 'SR ID',
                render: (item) => (
                  <span className="inline-flex items-center gap-1.5">
                    {item.isEscalated && <AlertTriangle className="w-3.5 h-3.5 text-red-600" aria-label="SLA breached" />}
                    {item.number}
                  </span>
                ),
              },
              {
                key: 'customer',
                header: 'Customer',
                render: (item) => item.customer?.name || 'Unknown'
              },
              {
                key: 'priority',
                header: 'Priority',
                render: (item) => (
                  <span className={`text-xs font-semibold ${item.priority === 'URGENT' || item.priority === 'HIGH' ? 'text-red-600' : item.priority === 'NORMAL' ? 'text-amber-600' : 'text-green-600'}`}>
                    {item.priority}
                  </span>
                )
              },
              {
                key: 'status',
                header: 'Status',
                render: (item) => {
                  const stage = stageForStatus(item.status);
                  const category =
                    item.status === 'CANCELLED' ? 'error' :
                      stage === 'Open' ? 'error' :
                        stage === 'Assigned' ? 'info' :
                          stage === 'In Progress' ? 'warning' :
                            stage === 'Resolved' ? 'success' : 'default';
                  return <StatusBadge label={item.status} category={category} />;
                }
              },
              {
                key: 'assignee',
                header: 'Assignee',
                render: (item) => item.assignee?.name || 'Unassigned'
              },
              {
                key: 'createdAt',
                header: 'Created On',
                render: (item) => new Date(item.createdAt).toLocaleDateString()
              },
              {
                key: 'actions',
                header: 'Action',
                render: (item) => (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/service-requests/${item._id}`);
                    }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, item._id)} disabled={deleteServiceRequest.isPending}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
