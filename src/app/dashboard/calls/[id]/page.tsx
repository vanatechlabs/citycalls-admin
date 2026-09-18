'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { ArrowLeft, User, Sparkles, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCall, useUpdateCall } from '@/lib/hooks/useCalls';
import { useSummarizeCall } from '@/lib/hooks/useAISettings';
import { useUsers } from '@/lib/hooks/useUsers';

function EditCallForm({ id, outcome, notes, onClose }: { id: string; outcome?: string; notes?: string; onClose: () => void }) {
  const updateCall = useUpdateCall();
  const { data: users } = useUsers();
  const [outcomeValue, setOutcomeValue] = useState(outcome ?? '');
  const [notesValue, setNotesValue] = useState(notes ?? '');
  const [assignedTo, setAssignedTo] = useState('');

  const onSubmit = () => {
    updateCall.mutate(
      { id, outcome: outcomeValue || undefined, notes: notesValue || undefined, assignedTo: assignedTo || undefined },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="space-y-4">
      <AppFormField label="Outcome" placeholder="e.g. Resolved, Follow-up required" value={outcomeValue} onChange={(e) => setOutcomeValue(e.target.value)} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Assign Follow-up To (Optional)</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">No change</option>
          {(users || []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
      </div>
      {updateCall.isError && <p className="text-sm text-destructive">{updateCall.error.response?.data?.message ?? 'Failed to update call.'}</p>}
      <Button className="w-full" onClick={onSubmit} disabled={updateCall.isPending}>
        {updateCall.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: call, isLoading, isError } = useCall(id);
  const summarizeCall = useSummarizeCall();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading call details...</div>;
  if (isError || !call) return <div className="p-8 text-center text-destructive">Failed to load call details.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Call: {call.number}</h1>
          <p className="text-[13px] text-muted-foreground">Recorded on {new Date(call.callDate).toLocaleDateString()} at {call.callTime}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge label={call.direction} category={call.direction === 'INCOMING' ? 'info' : 'default'} />
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="w-4 h-4 mr-2" /> {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Update Outcome &amp; Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <EditCallForm id={id} outcome={call.outcome} notes={call.notes} onClose={() => setEditing(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {call.notes || 'No notes recorded for this call.'}
              </p>
              {call.recordingUrl && (
                <audio controls className="mt-4 w-full">
                  <source src={call.recordingUrl} />
                </audio>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Summary
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => summarizeCall.mutate({ callId: id })}
                disabled={summarizeCall.isPending || !call.notes}
              >
                {summarizeCall.isPending ? 'Summarizing...' : 'Summarize with AI'}
              </Button>
            </CardHeader>
            <CardContent>
              {!call.notes && <p className="text-sm text-muted-foreground">Add call notes first — there is nothing to summarize.</p>}
              {summarizeCall.data && summarizeCall.data.aiAvailable && (
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{summarizeCall.data.text}</p>
              )}
              {summarizeCall.data && !summarizeCall.data.aiAvailable && (
                <p className="text-sm text-amber-600">
                  {summarizeCall.data.reason === 'DISABLED' && 'AI summarization is disabled — enable it in AI Settings.'}
                  {summarizeCall.data.reason === 'PROVIDER_NOT_CONFIGURED' && 'AI provider is not configured on the server.'}
                  {summarizeCall.data.reason === 'AI_LIMIT_REACHED' && 'Daily AI usage limit reached — try again tomorrow.'}
                  {summarizeCall.data.reason === 'FAILED' && 'AI summarization failed. Try again later.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Caller Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{call.customerName || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">Customer</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm pt-2">
                <span className="text-muted-foreground">Mobile:</span>
                <span className="font-medium">{call.callerNumber}</span>
                <span className="text-muted-foreground pt-2">Call Type:</span>
                <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {call.callType.replace(/_/g, ' ')}
                </span>
                <span className="text-muted-foreground pt-2">Outcome:</span>
                <span className="font-medium">{call.outcome || 'Not set'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
