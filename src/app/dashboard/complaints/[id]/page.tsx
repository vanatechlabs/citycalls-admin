'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ArrowLeft } from 'lucide-react';
import { useComplaint, useRespondComplaint, customerName, serviceRequestNumber, ComplaintStatus } from '@/lib/hooks/useComplaints';

function statusCategory(status: ComplaintStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
  if (status === 'OPEN') return 'error';
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success';
  return 'default';
}

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: complaint, isLoading, isError } = useComplaint(id);
  const respond = useRespondComplaint(id);

  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<'RESOLVED' | 'CLOSED'>('RESOLVED');

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading complaint...</div>;
  if (isError || !complaint) return <div className="p-8 text-center text-destructive">Failed to load complaint.</div>;

  const alreadyResponded = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED';
  const srNumber = serviceRequestNumber(complaint);

  const handleSubmit = () => {
    if (!response.trim()) return;
    respond.mutate({ response, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">{complaint.subject}</h1>
          <p className="text-[13px] text-muted-foreground">
            Raised by {customerName(complaint)} on {new Date(complaint.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge label={complaint.status.replace('_', ' ')} category={statusCategory(complaint.status)} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{customerName(complaint)}</span>
              <span className="text-muted-foreground">Service Request:</span>
              {srNumber ? (
                <Link href={`/dashboard/service-requests/${typeof complaint.serviceRequestId === 'object' ? complaint.serviceRequestId?._id : ''}`} className="font-medium text-primary hover:underline">
                  {srNumber}
                </Link>
              ) : (
                <span className="font-medium text-muted-foreground">Not linked to a request</span>
              )}
            </div>
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-sm">Description:</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{complaint.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{alreadyResponded ? 'Response' : 'Respond to Complaint'}</CardTitle>
          </CardHeader>
          {alreadyResponded ? (
            <CardContent className="space-y-2">
              <p className="text-sm whitespace-pre-wrap">{complaint.response}</p>
              {complaint.respondedAt && (
                <p className="text-xs text-muted-foreground">Responded on {new Date(complaint.respondedAt).toLocaleString()}</p>
              )}
            </CardContent>
          ) : (
            <>
              <CardContent className="space-y-4">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="status" checked={status === 'RESOLVED'} onChange={() => setStatus('RESOLVED')} className="accent-primary" />
                    Mark as Resolved
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="status" checked={status === 'CLOSED'} onChange={() => setStatus('CLOSED')} className="accent-primary" />
                    Mark as Closed
                  </label>
                </div>
                {respond.isError && <p className="text-sm text-destructive">{respond.error.response?.data?.message ?? 'Failed to submit response.'}</p>}
              </CardContent>
              <CardFooter className="flex justify-end bg-muted/30 border-t px-6 py-4">
                <Button onClick={handleSubmit} disabled={!response.trim() || respond.isPending}>
                  {respond.isPending ? 'Submitting...' : 'Submit Response'}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
