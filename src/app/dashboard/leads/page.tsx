'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';

import { useLeads, useCreateLead, CreateLeadInput, LEAD_STAGES } from '@/lib/hooks/useLeads';
import { useMasters } from '@/lib/hooks/useMasters';
import { useUsers } from '@/lib/hooks/useUsers';

function AddLeadForm({ close }: { close: () => void }) {
  const createLead = useCreateLead();
  const { data: sources } = useMasters(['LEAD_SOURCE']);
  const { data: users } = useUsers();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateLeadInput>({
    defaultValues: { priority: 'NORMAL' },
  });

  const onSubmit = (values: CreateLeadInput) => {
    createLead.mutate(values, { onSuccess: () => close() });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Contact Name" {...register('contactName')} />
      <AppFormField label="Contact Mobile" {...register('contactMobile')} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Source</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('source', { required: true })}>
          <option value="">Select a source...</option>
          {(sources || []).map((s) => <option key={s._id} value={s.key}>{s.label}</option>)}
        </select>
        {errors.source && <p className="text-sm text-destructive">Select a source</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Priority</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('priority')}>
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Owner</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('ownerId', { required: true })}>
          <option value="">Select an owner...</option>
          {(users || []).map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role.replace(/_/g, ' ')})</option>)}
        </select>
        {errors.ownerId && <p className="text-sm text-destructive">Select an owner</p>}
      </div>

      <AppFormField label="Product Interest (Optional)" {...register('productInterest')} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Requirement (Optional)</label>
        <textarea
          {...register('requirement')}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {createLead.isError && (
        <p className="text-sm text-destructive">{createLead.error.response?.data?.message ?? 'Failed to create lead.'}</p>
      )}
      <Button type="submit" className="w-full" disabled={createLead.isPending}>
        {createLead.isPending ? 'Creating...' : 'Create Lead'}
      </Button>
    </form>
  );
}

export default function LeadsPipelinePage() {
  const { data: allLeads, isLoading, isError } = useLeads();
  const leads = allLeads || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Lead Pipeline</h1>
          <p className="text-[13px] text-muted-foreground">Manage leads through the sales cycle.</p>
        </div>
        <div className="space-x-2 flex items-center">
          <Button variant="outline" render={<Link href="/dashboard/leads/list" />}>
            List View
          </Button>
          <Button variant="outline" render={<Link href="/dashboard/leads/import" />}>
            Import Leads
          </Button>
          <FormSheet triggerLabel="Add Lead" title="Add Lead" description="Manually log a new lead into the pipeline.">
            {(close) => <AddLeadForm close={close} />}
          </FormSheet>
        </div>
      </div>

      <div className="space-y-8 pb-12">
        {isLoading ? (
          <div className="py-12 text-muted-foreground text-center">Loading leads...</div>
        ) : isError ? (
          <div className="py-12 text-destructive text-center">Failed to load leads.</div>
        ) : LEAD_STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage);
          return (
            <div key={stage} className="flex flex-col space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/70"></div>
                  <h3 className="font-semibold text-base text-foreground tracking-tight">{stage.replace(/_/g, ' ')}</h3>
                </div>
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-medium bg-muted/60 text-muted-foreground">
                  {stageLeads.length} {stageLeads.length === 1 ? 'Lead' : 'Leads'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2.5 max-h-[290px] overflow-y-auto pr-2 pb-2">
                {stageLeads.map(lead => (
                  <Card key={lead._id} className="cursor-pointer border border-border/70 shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-primary/[0.03] transition-all duration-200 bg-card group flex flex-col relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-transparent group-hover:bg-primary/60 transition-colors"></div>
                    <CardContent className="px-3.5 py-3 flex flex-col gap-2">
                      <div>
                        <Link href={`/dashboard/leads/${lead._id}`} className="font-semibold text-[14px] text-foreground group-hover:text-primary transition-colors line-clamp-1 block mb-0.5">
                          {lead.contactName || 'Unnamed Lead'}
                        </Link>
                        <div className="text-[13px] text-muted-foreground">
                          {lead.contactMobile || 'No mobile number'}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border/40 mt-auto">
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          {lead.number}
                        </span>
                        {lead.source && (
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                            {lead.source}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {stageLeads.length === 0 && (
                  <div className="col-span-full text-center py-6 text-[13px] text-muted-foreground border border-dashed border-border/50 rounded-lg bg-muted/10">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
