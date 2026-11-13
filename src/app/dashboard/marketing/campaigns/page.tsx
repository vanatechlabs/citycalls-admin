'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSheet } from '@/components/ui/FormSheet';
import { CampaignEditorForm } from './CampaignEditorForm';
import { Campaign, useCampaigns, useSendCampaign, useCancelCampaign, useDuplicateCampaign, useDeleteCampaign, useCampaignAudiencePreview, useCampaignRecipients } from '@/lib/hooks/useCampaigns';

function errorMessage(error: unknown) { return (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Request failed. Please try again.'; }
function DeliveryLog({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useCampaignRecipients(id, page);
  return <div className="space-y-3"><p className="text-xs text-muted-foreground">Sent means accepted by the provider. Read/delivered receipts are not tracked here.</p>{isLoading ? <p>Loading...</p> : isError ? <p role="alert">Could not load recipients.</p> : data?.items.map(item => <div className="rounded border p-3 text-sm" key={item._id}><p>{item.name} · {item.destination}</p><strong>{item.status}</strong>{item.failureReason && <p className="text-xs text-destructive">{item.failureReason}</p>}</div>)}<div className="flex items-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-xs">Page {page} / {Math.max(1, data?.meta?.totalPages ?? 1)}</span><Button variant="outline" disabled={!data?.meta || page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>;
}
function CampaignActions({ campaign }: { campaign: Campaign }) {
  const send = useSendCampaign(); const cancel = useCancelCampaign(); const duplicate = useDuplicateCampaign(); const remove = useDeleteCampaign(); const preview = useCampaignAudiencePreview();
  const editable = ['DRAFT', 'SCHEDULED'].includes(campaign.status);
  return <div className="flex flex-wrap gap-2">
    <Button size="sm" variant="outline" disabled={preview.isPending} onClick={() => preview.mutate(campaign._id, { onSuccess: data => toast.info(`${data.eligible} eligible; ${data.duplicatesRemoved} duplicate; ${data.noContact} invalid/missing; ${data.noConsent} without consent; ${data.manuallyExcluded} excluded.`), onError: error => toast.error(errorMessage(error)) })}>Preview audience</Button>
    {editable && <FormSheet triggerLabel="Edit" title="Edit campaign">{close => <CampaignEditorForm campaign={campaign} onClose={close} />}</FormSheet>}
    {editable && <Button size="sm" disabled={send.isPending} onClick={() => { if (window.confirm(`Send "${campaign.name}" now? This queues its eligible audience immediately.`)) send.mutate(campaign._id, { onSuccess: () => toast.success('Queued for background delivery'), onError: error => toast.error(errorMessage(error)) }); }}>Send now</Button>}
    {['DRAFT', 'SCHEDULED', 'SENDING'].includes(campaign.status) && <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => { if (window.confirm('Cancel this campaign? Unsent recipients will be skipped. Messages already in flight may still arrive.')) cancel.mutate(campaign._id, { onError: error => toast.error(errorMessage(error)) }); }}>Cancel</Button>}
    <FormSheet triggerLabel="Delivery log" title="Recipient delivery log">{() => <DeliveryLog id={campaign._id} />}</FormSheet>
    <Button size="sm" variant="outline" disabled={duplicate.isPending} onClick={() => duplicate.mutate(campaign._id, { onSuccess: () => toast.success('Copied as a new draft'), onError: error => toast.error(errorMessage(error)) })}>Duplicate</Button>
    {['DRAFT', 'COMPLETED', 'CANCELLED'].includes(campaign.status) && <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => { if (window.confirm('Delete this campaign and its delivery history?')) remove.mutate(campaign._id, { onError: error => toast.error(errorMessage(error)) }); }}>Delete</Button>}
  </div>;
}
export default function CampaignsPage() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useCampaigns(page);
  const campaigns = data?.items.filter(item => `${item.name} ${item.providerCampaignName ?? ''} ${item.status}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-medium">Marketing campaigns</h1><p className="text-sm text-muted-foreground">AiSensy campaign name, recipients, optional media and an optional schedule.</p></div><FormSheet triggerLabel="Create campaign" title="Create campaign">{close => <CampaignEditorForm onClose={close} />}</FormSheet></div>
    <Input aria-label="Search this page" placeholder="Search this page by name, AiSensy name or status" value={search} onChange={event => setSearch(event.target.value)} />
    {isLoading ? <p>Loading campaigns...</p> : isError ? <p role="alert">Could not load campaigns.</p> : !campaigns?.length ? <p>No campaigns on this page.</p> : campaigns.map(campaign => <article key={campaign._id} className="space-y-3 rounded-lg border bg-card p-4"><div className="flex justify-between gap-2"><div><h2 className="font-medium">{campaign.name}</h2><p className="text-xs text-muted-foreground">{campaign.channel} · {campaign.providerCampaignName || 'Email template'} · {campaign.contentType || 'Existing template'}</p></div><span className="text-xs font-semibold">{campaign.status}</span></div>
      <p className="text-sm">{campaign.stats.sent} accepted · {campaign.stats.failed} failed · {campaign.audienceFilter.manualMobiles?.length ?? 0} pasted numbers</p>
      {campaign.status === 'SCHEDULED' && campaign.scheduledAt && <p className="text-sm">Scheduled: {new Date(campaign.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>}
      {campaign.lastError && <p role="alert" className="text-sm text-destructive">Schedule could not start: {campaign.lastError}. The worker retries; edit or cancel to change it.</p>}
      <CampaignActions campaign={campaign} />
    </article>)}
    <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-xs">Page {page} / {Math.max(1, data?.meta?.totalPages ?? 1)} · {data?.meta?.total ?? 0} campaigns</span><Button variant="outline" disabled={!data?.meta || page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div>
  </div>;
}
