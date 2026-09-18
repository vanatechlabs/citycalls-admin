'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Phone, Sparkles } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AppFormField } from '@/components/ui/AppFormField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { useLead, useAddLeadNote, useConvertLead, useChangeLeadStage, LEAD_STAGES, useUpdateLead, Lead } from '@/lib/hooks/useLeads';
import { useCalls } from '@/lib/hooks/useCalls';
import { useClassifyComplaint } from '@/lib/hooks/useAISettings';

const updateLeadSchema = z.object({
  contactName: z.string().optional(),
  contactMobile: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  productInterest: z.string().optional(),
  requirement: z.string().optional(),
});
type UpdateLeadValues = z.infer<typeof updateLeadSchema>;

function EditLeadSheet({ lead, open, onOpenChange }: { lead: Lead; open: boolean; onOpenChange: (open: boolean) => void }) {
  const updateLead = useUpdateLead(lead._id);
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateLeadValues>({
    resolver: zodResolver(updateLeadSchema),
    defaultValues: {
      contactName: lead.contactName || '',
      contactMobile: lead.contactMobile || '',
      source: lead.source || '',
      priority: lead.priority || '',
      productInterest: lead.productInterest || '',
      requirement: lead.requirement || '',
    },
  });

  const onSubmit = (values: UpdateLeadValues) => {
    updateLead.mutate(values, {
      onSuccess: () => {
        toast.success('Lead updated successfully');
        onOpenChange(false);
      },
      onError: () => toast.error('Failed to update lead'),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-[400px]">
        <SheetHeader className="mb-4">
          <SheetTitle>Edit Lead</SheetTitle>
          <SheetDescription>Update lead details and requirements.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1">
          <AppFormField label="Contact Name" {...register('contactName')} error={errors.contactName?.message} />
          <AppFormField label="Contact Mobile" {...register('contactMobile')} error={errors.contactMobile?.message} />
          <AppFormField label="Source" {...register('source')} error={errors.source?.message} />
          <AppFormField label="Priority" {...register('priority')} error={errors.priority?.message} />
          <AppFormField label="Product Interest" {...register('productInterest')} error={errors.productInterest?.message} />
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Requirement</label>
            <textarea
              {...register('requirement')}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <Button type="submit" className="w-full mt-4" disabled={updateLead.isPending}>
            {updateLead.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: lead, isLoading, isError } = useLead(id);
  const { data: allCalls } = useCalls();
  const addNote = useAddLeadNote(id);
  const convertLead = useConvertLead(id);
  const changeStage = useChangeLeadStage(id);
  const classifyComplaint = useClassifyComplaint();
  const [noteText, setNoteText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading lead details...</div>;
  if (isError || !lead) return <div className="p-8 text-center text-destructive">Failed to load lead details.</div>;

  const relatedCalls = (allCalls || []).filter((c) => c.relatedLeadId === id);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ text: noteText }, { onSuccess: () => setNoteText('') });
  };

  const handleStageChange = (toStage: string) => {
    if (!toStage || toStage === lead.stage) return;
    let lostReason: string | undefined;
    if (toStage === 'LOST') {
      lostReason = window.prompt('Why was this lead lost?') ?? undefined;
      if (!lostReason) return;
    }
    changeStage.mutate({ toStage, lostReason });
  };

  const handleConvert = () => {
    if (!lead.contactName) {
      alert('This lead has no contact name on file — add one via a note before converting.');
      return;
    }
    convertLead.mutate(
      { convertTo: 'CUSTOMER', name: lead.contactName },
      { onSuccess: () => router.push('/dashboard/customers') }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium tracking-tight text-foreground">Lead: {lead.contactName || lead.number}</h1>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground">{lead.number} • Created on {new Date(lead.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge label={lead.stage.replace(/_/g, ' ')} category={lead.stage === 'CONVERTED' ? 'success' : 'info'} />
          {lead.stage !== 'CONVERTED' && (
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value=""
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={changeStage.isPending}
            >
              <option value="">Move to stage...</option>
              {LEAD_STAGES.filter((s) => s !== lead.stage).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
          {lead.stage !== 'CONVERTED' && (
            <Button onClick={handleConvert} disabled={convertLead.isPending}>
              {convertLead.isPending ? 'Converting...' : 'Convert to Customer'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.contactMobile || 'No mobile on file'}</span>
              </div>
              <div className="pt-4 border-t grid grid-cols-2 gap-y-4 text-sm">
                <span className="text-muted-foreground">Source:</span>
                <span className="font-medium text-right">{lead.source}</span>
                <span className="text-muted-foreground">Priority:</span>
                <span className="font-medium text-right">{lead.priority}</span>
                {lead.productInterest && (
                  <>
                    <span className="text-muted-foreground">Interest:</span>
                    <span className="font-medium text-right">{lead.productInterest}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {lead.requirement || 'No requirement text recorded for this lead.'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={() => classifyComplaint.mutate({ text: lead.requirement || '' })}
                disabled={!lead.requirement || classifyComplaint.isPending}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {classifyComplaint.isPending ? 'Classifying...' : 'Suggest Category with AI'}
              </Button>
              {classifyComplaint.data && classifyComplaint.data.aiAvailable && (
                <p className="text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md px-3 py-2">
                  Suggested category: {classifyComplaint.data.category}
                </p>
              )}
              {classifyComplaint.data && !classifyComplaint.data.aiAvailable && (
                <p className="text-sm text-amber-600">
                  {classifyComplaint.data.reason === 'DISABLED' && 'AI classification is disabled — enable it in AI Settings.'}
                  {classifyComplaint.data.reason === 'PROVIDER_NOT_CONFIGURED' && 'AI provider is not configured on the server.'}
                  {classifyComplaint.data.reason === 'AI_LIMIT_REACHED' && 'Daily AI usage limit reached — try again tomorrow.'}
                  {classifyComplaint.data.reason === 'FAILED' && 'AI classification failed. Try again later.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="calls">Call History</TabsTrigger>
            </TabsList>

            <TabsContent value="notes">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Add a note..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || addNote.isPending}>
                      {addNote.isPending ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                  <div className="space-y-4 pt-4 border-t">
                    {lead.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                    {[...lead.notes].reverse().map((note, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-muted-foreground text-xs">{new Date(note.createdAt).toLocaleString()}</span>
                        <p className="mt-1 text-slate-700">{note.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calls">
              <Card>
                <CardContent className="pt-6">
                  {relatedCalls.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No calls logged for this lead yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {relatedCalls.map((c) => (
                        <div key={c._id} className="flex justify-between items-center text-sm border-b pb-2">
                          <span>{c.number} — {c.callType.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {lead && <EditLeadSheet lead={lead} open={isEditing} onOpenChange={setIsEditing} />}
    </div>
  );
}
