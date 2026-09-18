'use client';

import { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Separator } from '@/components/ui/separator';
import { Megaphone, Users, Send, Pencil, Trash2, Search, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCampaigns, useCreateCampaign, useSendCampaign, Campaign, useUpdateCampaign, useDeleteCampaign, useDuplicateCampaign, useCampaignAudiencePreview, CampaignRecipientType } from '@/lib/hooks/useCampaigns';
import { useNotificationTemplates } from '@/lib/hooks/useNotificationTemplates';
import { useMasters, Master } from '@/lib/hooks/useMasters';
import { useBranches } from '@/lib/hooks/useOrganization';
import { useVendors } from '@/lib/hooks/useVendors';
import { STAFF_ROLES } from '@/lib/hooks/useUsers';
import { useUploadFile } from '@/lib/hooks/useFiles';

interface CampaignFormValues {
  name: string;
  channel: 'WHATSAPP' | 'EMAIL';
  templateId: string;
  providerCampaignName: string;
  templateParams: string;
  festivalMessage: string;
  recipientTypes: CampaignRecipientType[];
  roles: string[];
  branchIds: string[];
  vendorIds: string[];
  excludeMobiles: string;
  manualMobiles: string;
  tags: string;
  segments: string;
  customerType: string;
  scheduledAt: string;
}

function audienceSummary(campaign: Campaign, customerTypes?: Master[]) {
  const parts: string[] = [];
  if (campaign.audienceFilter.tags?.length) parts.push(`tags: ${campaign.audienceFilter.tags.join(', ')}`);
  if (campaign.audienceFilter.segments?.length) parts.push(`segments: ${campaign.audienceFilter.segments.join(', ')}`);
  if (campaign.audienceFilter.customerType) {
    const label = customerTypes?.find((t) => t.key === campaign.audienceFilter.customerType)?.label ?? campaign.audienceFilter.customerType;
    parts.push(label);
  }
  return parts.length ? parts.join(' · ') : 'All customers';
}

function CreateCampaignForm() {
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const mediaUpload = useUploadFile('CAMPAIGN', 'new');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preset, setPreset] = useState<'FESTIVAL' | 'INDEPENDENCE_DAY'>('FESTIVAL');
  const { data: templates } = useNotificationTemplates();
  const { data: customerTypes } = useMasters(['CUSTOMER_TYPE']);
  const { data: branches } = useBranches();
  const { data: vendors } = useVendors();
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CampaignFormValues>({
    defaultValues: {
      channel: 'WHATSAPP', tags: '', segments: '', customerType: '', scheduledAt: '',
      providerCampaignName: 'citycalls_festival_greeting_api', templateParams: '{{firstName}}, {{firstName}}',
      festivalMessage: '',
      recipientTypes: ['CUSTOMER'], roles: [], branchIds: [], vendorIds: [], excludeMobiles: '', manualMobiles: '',
    },
  });
  const channel = useWatch({ control, name: 'channel' });
  const eligibleTemplates = (templates || []).filter((t) => t.channel === channel);
  const onSubmit = async (values: CampaignFormValues) => {
    if (!preset || values.recipientTypes.length === 0) {
      toast.error('Pick at least one "Send message to" option.');
      return;
    }
    try {
      const campaign = await createCampaign.mutateAsync(
        showAdvanced
          ? {
            name: values.name,
            channel: values.channel,
            templateId: values.templateId || undefined,
            providerCampaignName: values.channel === 'WHATSAPP' ? values.providerCampaignName : undefined,
            templateParams: values.templateParams ? values.templateParams.split(',').map((item) => item.trim()) : [],
            audienceFilter: {
              recipientTypes: values.recipientTypes,
              roles: values.roles,
              branchIds: values.branchIds,
              vendorIds: values.vendorIds,
              tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
              segments: values.segments ? values.segments.split(',').map((s) => s.trim()).filter(Boolean) : [],
              customerType: values.customerType || undefined,
              excludeMobiles: values.excludeMobiles ? values.excludeMobiles.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean) : [],
              manualMobiles: values.manualMobiles ? values.manualMobiles.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean) : [],
            },
          }
          : {
            name: values.name,
            channel: 'WHATSAPP',
            campaignPreset: preset,
            templateParams: preset === 'FESTIVAL' ? ['{{firstName}}', values.festivalMessage] : [],
            audienceFilter: {
              recipientTypes: values.recipientTypes,
              manualMobiles: values.manualMobiles ? values.manualMobiles.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean) : [],
            },
          }
      );
      if (mediaFile) {
        const uploaded = await mediaUpload.upload(mediaFile, 'MARKETING_MEDIA', campaign._id);
        await updateCampaign.mutateAsync({ id: campaign._id, media: { fileId: uploaded._id, url: uploaded.url, filename: mediaFile.name } });
      }
      toast.success('Campaign saved as draft. Send it from the campaign list when ready.');
      reset(); setMediaFile(null);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? (e instanceof Error ? e.message : 'Could not create campaign'));
    }
  };
  return (
    <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
      <form onSubmit={handleSubmit(onSubmit)}>
        {!showAdvanced && (
          <CardContent className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Which template?</label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={preset === 'FESTIVAL' ? 'default' : 'outline'} onClick={() => setPreset('FESTIVAL')}>
                  Festival Greeting
                </Button>
                <Button type="button" size="sm" variant={preset === 'INDEPENDENCE_DAY' ? 'default' : 'outline'} onClick={() => setPreset('INDEPENDENCE_DAY')}>
                  Independence Day
                </Button>
              </div>
            </div>
            <AppFormField
              label="Campaign name"
              placeholder="e.g. Diwali Greeting"
              error={errors.name ? 'Campaign name is required' : undefined}
              {...register('name', { required: true })}
            />
            {preset === 'FESTIVAL' ? (
              <>
                <AppFormField
                  label="Occasion / Festival name"
                  placeholder="e.g. Independence Day, Diwali, Raksha Bandhan"
                  error={errors.festivalMessage ? 'Occasion name is required' : undefined}
                  {...register('festivalMessage', { required: preset === 'FESTIVAL' })}
                />
                <p className="text-xs text-muted-foreground -mt-3">
                  {'The approved message reads: "Hello '}<strong>{'{{1}}'}</strong>{', wishing you and your family a very Happy '}<strong>{'{{2}}'}</strong>
                  {' from City Calls." {{1}} is filled in automatically with each recipient’s first name — this field is just the occasion name for {{2}}, not a full message or offer text.'}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground -mt-3">
                This approved template has no text placeholders — just the image below and its own fixed caption. No message field needed.
              </p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Send message to</label>
              <div className="flex flex-wrap gap-3 rounded-md border p-3">
                {([['CUSTOMER', 'Customers'], ['USER', 'Users'], ['EMPLOYEE', 'Employees'], ['VENDOR', 'Vendors'], ['VENDOR_TECHNICIAN', 'Vendor technicians'], ['MANUAL', 'Other numbers']] as [CampaignRecipientType, string][]).map(([type, label]) => (
                  <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" value={type} {...register('recipientTypes')} />{label}</label>
                ))}
              </div>
            </div>
            <AppFormField label="Other WhatsApp numbers (comma separated)" placeholder="8448245145, 9876543210" {...register('manualMobiles')} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{preset === 'INDEPENDENCE_DAY' ? 'Independence Day image' : 'Festival image'}</label>
              <Input type="file" accept="image/*" required onChange={(event) => setMediaFile(event.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">Image automatically Cloudinary par upload hokar approved AiSensy template ke saath jayegi.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Sending a different approved template, or need finer audience targeting? Switch to advanced mode →
            </button>
          </CardContent>
        )}
        {showAdvanced && (
        <CardContent>
          <button
            type="button"
            onClick={() => setShowAdvanced(false)}
            className="text-xs text-indigo-600 hover:underline mb-3"
          >
            ← Back to simple festival-message mode
          </button>
          <div className="space-y-3">
            <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> 1. Target Audience
              </h2>
              <p className="text-[13px] text-muted-foreground">Filter your audience by tag, segment, or customer type.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Send to</label>
                <div className="flex flex-wrap gap-3 rounded-md border p-3">
                  {(['CUSTOMER', 'USER', 'EMPLOYEE', 'VENDOR', 'VENDOR_TECHNICIAN', 'MANUAL'] as CampaignRecipientType[]).map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" value={type} {...register('recipientTypes')} />{type.replaceAll('_', ' ')}</label>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Employee/User roles (optional)</label>
                <div className="flex flex-wrap gap-3 rounded-md border p-3">
                  {STAFF_ROLES.map((role) => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" value={role} {...register('roles')} />{role.replaceAll('_', ' ')}</label>)}
                </div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Branches (optional)</label><div className="max-h-32 space-y-2 overflow-auto rounded-md border p-3">
                {(branches || []).map((branch) => <label key={branch._id} className="flex items-center gap-2 text-sm"><input type="checkbox" value={branch._id} {...register('branchIds')} />{branch.name}</label>)}
              </div></div>
              <div className="space-y-2"><label className="text-sm font-medium">Vendors (optional)</label><div className="max-h-32 space-y-2 overflow-auto rounded-md border p-3">
                {(vendors || []).map((vendor) => <label key={vendor._id} className="flex items-center gap-2 text-sm"><input type="checkbox" value={vendor._id} {...register('vendorIds')} />{vendor.companyName}</label>)}
              </div></div>
              <AppFormField label="Tags (comma-separated, optional)" placeholder="e.g., out-of-warranty, amc-expiring" {...register('tags')} />
              <AppFormField label="Segments (comma-separated, optional)" placeholder="e.g., delhi-ncr" {...register('segments')} />
              <AppFormField label="Exclude mobiles (comma/newline separated)" placeholder="9188..., 9199..." {...register('excludeMobiles')} />
              <AppFormField label="Manual WhatsApp numbers (comma/newline separated)" placeholder="8448245145, 9199..." {...register('manualMobiles')} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Customer Type (Optional)</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register('customerType')}>
                  <option value="">Any</option>
                  {customerTypes?.map((t) => (
                    <option key={t._id} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 mt-2">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-[12.5px] text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Note:</span> Only customers who granted marketing consent for this channel will be included. Reach is determined at send time — no pre-send estimate is available.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600" /> 2. Content
              </h2>
              <p className="text-[13px] text-muted-foreground">Set campaign name and approved message template.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <AppFormField
                label="Campaign Name"
                placeholder="e.g., Summer Discount Push"
                error={errors.name ? 'Campaign name is required' : undefined}
                {...register('name', { required: true })}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Channel</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register('channel', { required: true })}>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>

              {channel === 'WHATSAPP' && <>
                <AppFormField label="AiSensy API campaign name" placeholder="citycalls_festival_greeting_api" {...register('providerCampaignName', { required: true })} />
                <AppFormField label="Template params (exact AiSensy order)" placeholder="{{firstName}}, {{firstName}}" {...register('templateParams')} />
                <div className="col-span-2 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100">
                  Festival image/video: first save this campaign, then open its <strong>Edit</strong> action and upload the media under <strong>Festival image/video (Cloudinary)</strong>.
                </div>
              </>}

              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Message Template</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register('templateId')}>
                  <option value="">Select an approved template...</option>
                  {eligibleTemplates.map((t) => (
                    <option key={t._id} value={t._id}>{t.triggerKey}</option>
                  ))}
                </select>
                {eligibleTemplates.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No {channel} templates available.</p>
                )}
              </div>
            </div>
          </div>

          {createCampaign.isError && (
            <p className="text-sm text-destructive">{createCampaign.error.response?.data?.message ?? 'Failed to create campaign.'}</p>
          )}
          {createCampaign.isSuccess && <p className="text-sm text-green-600">Campaign created. Send it from the campaign list.</p>}
        </CardContent>
        )}
        <div className="flex justify-end gap-2 bg-muted/30 p-4 border-t border-border/50">
          <Button type="button" variant="ghost" onClick={() => reset()}>Reset</Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 gap-2" disabled={createCampaign.isPending || mediaUpload.isPending || updateCampaign.isPending}>
            {(createCampaign.isPending || mediaUpload.isPending)
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
            {(createCampaign.isPending || mediaUpload.isPending)
              ? (mediaUpload.isPending ? 'Uploading image...' : 'Saving...')
              : 'Save Draft'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function UpdateCampaignForm({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const updateCampaign = useUpdateCampaign();
  const mediaUpload = useUploadFile('CAMPAIGN', campaign._id);
  const { data: templates } = useNotificationTemplates();
  const { data: customerTypes } = useMasters(['CUSTOMER_TYPE']);
  const { register, handleSubmit, control } = useForm<CampaignFormValues>({
    defaultValues: {
      name: campaign.name,
      channel: campaign.channel,
      templateId: campaign.templateId,
      providerCampaignName: campaign.providerCampaignName || '',
      templateParams: campaign.templateParams?.join(', ') || '',
      recipientTypes: campaign.audienceFilter.recipientTypes || ['CUSTOMER'],
      roles: campaign.audienceFilter.roles || [],
      branchIds: campaign.audienceFilter.branchIds || [],
      vendorIds: campaign.audienceFilter.vendorIds || [],
      excludeMobiles: campaign.audienceFilter.excludeMobiles?.join(', ') || '',
      manualMobiles: campaign.audienceFilter.manualMobiles?.join(', ') || '',
      tags: campaign.audienceFilter.tags?.join(', ') || '',
      segments: campaign.audienceFilter.segments?.join(', ') || '',
      customerType: campaign.audienceFilter.customerType || '',
      scheduledAt: campaign.scheduledAt || '',
    },
  });
  const channel = useWatch({ control, name: 'channel' });
  const eligibleTemplates = (templates || []).filter((t) => t.channel === channel);

  const onSubmit = (values: CampaignFormValues) => {
    updateCampaign.mutate(
      {
        id: campaign._id,
        name: values.name,
        channel: values.channel,
        templateId: values.templateId,
        providerCampaignName: values.channel === 'WHATSAPP' ? values.providerCampaignName : undefined,
        templateParams: values.templateParams ? values.templateParams.split(',').map((item) => item.trim()) : [],
        audienceFilter: {
          recipientTypes: values.recipientTypes,
          roles: values.roles,
          branchIds: values.branchIds,
          vendorIds: values.vendorIds,
          excludeMobiles: values.excludeMobiles ? values.excludeMobiles.split(/[\s,]+/).filter(Boolean) : [],
          manualMobiles: values.manualMobiles ? values.manualMobiles.split(/[\s,]+/).filter(Boolean) : [],
          tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          segments: values.segments ? values.segments.split(',').map((s) => s.trim()).filter(Boolean) : [],
          customerType: values.customerType || undefined,
        },
        scheduledAt: values.scheduledAt || undefined,
      },
      { onSuccess: onClose }
    );
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Campaign Name" {...register('name', { required: true })} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Channel</label>
        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...register('channel', { required: true })}>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">Email</option>
        </select>
      </div>
      {channel === 'WHATSAPP' && <>
        <AppFormField label="AiSensy API campaign name" {...register('providerCampaignName', { required: true })} />
        <AppFormField label="Template params (exact order)" {...register('templateParams')} />
      </>}
      <div className="space-y-2"><label className="text-sm font-medium">Send to</label><div className="flex flex-wrap gap-3 rounded-md border p-3">
        {(['CUSTOMER', 'USER', 'EMPLOYEE', 'VENDOR', 'VENDOR_TECHNICIAN', 'MANUAL'] as CampaignRecipientType[]).map((type) => <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" value={type} {...register('recipientTypes')} />{type.replaceAll('_', ' ')}</label>)}
      </div></div>
      <AppFormField label="Manual WhatsApp numbers" {...register('manualMobiles')} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Message Template</label>
        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...register('templateId', { required: true })}>
          <option value="">Select template...</option>
          {eligibleTemplates.map((t) => <option key={t._id} value={t._id}>{t.triggerKey}</option>)}
        </select>
      </div>
      <AppFormField label="Tags (comma-separated)" {...register('tags')} />
      <AppFormField label="Segments (comma-separated)" {...register('segments')} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Festival image/video (Cloudinary)</label>
        <Input type="file" accept="image/*,video/*" disabled={mediaUpload.isPending} onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const uploaded = await mediaUpload.upload(file, 'MARKETING_MEDIA');
            await updateCampaign.mutateAsync({ id: campaign._id, media: { fileId: uploaded._id, url: uploaded.url, filename: file.name } });
            toast.success('Campaign media uploaded');
          } catch { toast.error('Media upload failed'); }
        }} />
        {campaign.media?.url && <p className="text-xs text-muted-foreground">Current: {campaign.media.filename}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Customer Type</label>
        <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" {...register('customerType')}>
          <option value="">Any</option>
          {customerTypes?.map((t) => <option key={t._id} value={t.key}>{t.label}</option>)}
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={updateCampaign.isPending}>
        {updateCampaign.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

function AudiencePreviewButton({ campaign }: { campaign: Campaign }) {
  const preview = useCampaignAudiencePreview();
  return <Button size="sm" variant="outline" onClick={() => preview.mutate(campaign._id, {
    onSuccess: (data) => toast.success(`${data.eligible} eligible of ${data.matchedRecords}; ${data.noConsent} without consent, ${data.noContact} missing contact`),
    onError: () => toast.error('Could not preview audience'),
  })} disabled={preview.isPending}><Users className="mr-1 h-3 w-3" />{preview.isPending ? 'Checking...' : 'Preview'}</Button>;
}

export default function CampaignsPage() {
  const { data: campaigns, isLoading, isError } = useCampaigns();
  const { data: customerTypes } = useMasters(['CUSTOMER_TYPE']);
  const sendCampaign = useSendCampaign();
  const deleteCampaign = useDeleteCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    if (!searchTerm) return campaigns;
    const lowerQ = searchTerm.toLowerCase();
    return campaigns.filter(c =>
      c.name.toLowerCase().includes(lowerQ) ||
      c.status.toLowerCase().includes(lowerQ)
    );
  }, [campaigns, searchTerm]);

  const handleDelete = (id: string) => {
    deleteCampaign.mutate(id, {
      onSuccess: () => toast.success('Campaign deleted successfully'),
      onError: () => toast.error('Failed to delete campaign'),
    });
  };

  const handleDuplicate = (id: string) => {
    duplicateCampaign.mutate(id, {
      onSuccess: () => toast.success('Campaign duplicated as a new draft — edit and send it whenever ready.'),
      onError: () => toast.error('Failed to duplicate campaign'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Marketing Campaigns</h1>
          <p className="text-[13px] text-muted-foreground">Launch targeted WhatsApp/Email campaigns to consented customer segments.</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list">All Campaigns</TabsTrigger>
            <TabsTrigger value="create">Create Campaign</TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search campaigns..."
              className="w-64 pl-9 bg-background h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="list">
          <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading campaigns...</div>
              ) : isError ? (
                <div className="flex justify-center p-8 text-destructive">Failed to load campaigns.</div>
              ) : (
                <>
                  <DataTable<Campaign>
                    data={filteredCampaigns}
                    pageSize={10}
                    columns={[
                      { key: 'name', header: 'Campaign Name' },
                      { key: 'audience', header: 'Audience', render: (item) => <span className="text-sm">{audienceSummary(item, customerTypes)}</span> },
                      {
                        key: 'sent',
                        header: 'Sent / Failed',
                        render: (item) => <span className="font-semibold text-slate-700">{item.stats.sent} / {item.stats.failed}</span>,
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (item) => (
                          <StatusBadge
                            label={item.status}
                            category={item.status === 'COMPLETED' ? 'success' : item.status === 'CANCELLED' ? 'error' : 'default'}
                          />
                        ),
                      },
                      { key: 'createdAt', header: 'Created On', render: (item) => new Date(item.createdAt).toLocaleDateString() },
                      {
                        key: 'action',
                        header: 'Action',
                        render: (item) => (
                          <div className="flex items-center gap-2">
                            <AudiencePreviewButton campaign={item} />
                            {item.status === 'DRAFT' || item.status === 'SCHEDULED' ? (
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 gap-1"
                                onClick={() => sendCampaign.mutate(item._id)}
                                disabled={sendCampaign.isPending}
                              >
                                <Send className="w-3 h-3" /> Send Now
                              </Button>
                            ) : null}
                            {item.status === 'COMPLETED' || item.status === 'CANCELLED' ? null : (
                              <FormSheet
                                triggerLabel="Edit"
                                title="Edit Campaign"
                                description={`Update details for ${item.name}`}
                                triggerElement={<Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>}
                              >
                                {(close) => <UpdateCampaignForm campaign={item} onClose={close} />}
                              </FormSheet>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Duplicate as a new draft — useful for recurring sends like an annual festival greeting"
                              onClick={() => handleDuplicate(item._id)}
                              disabled={duplicateCampaign.isPending}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item._id)} disabled={deleteCampaign.isPending}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <CreateCampaignForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
