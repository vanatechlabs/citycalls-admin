'use client';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppFormField } from '@/components/ui/AppFormField';
import { useCreateCampaign, useUpdateCampaign, Campaign, CampaignRecipientType, CreateCampaignInput } from '@/lib/hooks/useCampaigns';
import { useNotificationTemplates } from '@/lib/hooks/useNotificationTemplates';
import { useUploadFile, resolveFileUrl } from '@/lib/hooks/useFiles';
import { parseCampaignNumbers, scheduleInputIndia, scheduleIsoIndia } from '@/lib/campaignForm';

type Media = { fileId?: string; url: string; filename: string; file?: File };
type Card = { imageUrl: string; file?: File };
type Values = { name: string; channel: 'WHATSAPP' | 'EMAIL'; providerCampaignName: string; templateId: string; manualMobiles: string; excludeMobiles: string; recipientTypes: CampaignRecipientType[]; tags: string; segments: string; scheduledAt: string };
const textareaClass = 'min-h-28 w-full rounded-md border bg-transparent p-3 text-sm';
export function CampaignEditorForm({ campaign, onClose }: { campaign?: Campaign; onClose: () => void }) {
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const [savedId, setSavedId] = useState(campaign?._id);
  const upload = useUploadFile('CAMPAIGN', campaign?._id ?? 'new', { skipGlobalToast: true });
  const { data: templates } = useNotificationTemplates();
  const [params, setParams] = useState<string[]>(campaign?.templateParams ?? []);
  const [contentType, setContentType] = useState<NonNullable<Campaign['contentType']>>(campaign?.contentType ?? (campaign?.carouselCards?.length ? 'CAROUSEL' : campaign?.media?.url ? (/\.mp4(?:\?|$)/i.test(campaign.media.url) ? 'VIDEO' : /\.pdf(?:\?|$)/i.test(campaign.media.url) ? 'DOCUMENT' : 'IMAGE') : 'TEXT'));
  const [media, setMedia] = useState<Media | null>(campaign?.media?.url ? campaign.media : null);
  const [cards, setCards] = useState<Card[]>(campaign?.carouselCards ?? [{ imageUrl: '' }, { imageUrl: '' }]);
  const [scheduled, setScheduled] = useState(Boolean(campaign?.scheduledAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<Values>({ shouldUnregister: true, defaultValues: {
    name: campaign?.name ?? '', channel: campaign?.channel ?? 'WHATSAPP', providerCampaignName: campaign?.providerCampaignName ?? '', templateId: campaign?.templateId ?? '',
    manualMobiles: campaign?.audienceFilter.manualMobiles?.join('\n') ?? '', excludeMobiles: campaign?.audienceFilter.excludeMobiles?.join('\n') ?? '', recipientTypes: campaign?.audienceFilter.recipientTypes ?? ['MANUAL'],
    tags: campaign?.audienceFilter.tags?.join(', ') ?? '', segments: campaign?.audienceFilter.segments?.join(', ') ?? '', scheduledAt: scheduleInputIndia(campaign?.scheduledAt),
  } });
  const channel = useWatch({ control, name: 'channel' });
  const rawNumbers = useWatch({ control, name: 'manualMobiles' }) ?? '';
  const parsed = useMemo(() => parseCampaignNumbers(rawNumbers), [rawNumbers]);
  const split = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
  const onSubmit = async (values: Values) => {
    setError('');
    if (parsed.invalid.length) { setError(`Fix ${parsed.invalid.length} invalid number(s): ${parsed.invalid.slice(0, 5).join(', ')}`); return; }
    if (parsed.numbers.length > 50000) { setError('Use at most 50,000 numbers per campaign.'); return; }
    const excluded = parseCampaignNumbers(values.excludeMobiles);
    if (excluded.invalid.length) { setError('Fix invalid excluded numbers before saving.'); return; }
    const recipientTypes = [...new Set([...(values.recipientTypes ?? []), ...(parsed.numbers.length ? ['MANUAL' as const] : [])])];
    if (!recipientTypes.length || (recipientTypes.every(type => type === 'MANUAL') && !parsed.numbers.length)) { setError('Paste numbers or select an audience.'); return; }
    if (channel === 'EMAIL' && recipientTypes.every(type => type === 'MANUAL')) { setError('Select an email audience; pasted WhatsApp numbers cannot receive email.'); return; }
    let scheduledAt: string | null = null;
    if (scheduled) {
      try { scheduledAt = scheduleIsoIndia(values.scheduledAt); } catch { setError('Choose a valid future date and time.'); return; }
      if (new Date(scheduledAt).getTime() <= Date.now()) { setError('Choose a future time in India Standard Time.'); return; }
    }
    if (channel === 'WHATSAPP' && params.some(param => !param.trim())) { setError('Fill or remove empty parameter rows.'); return; }
    if (channel === 'WHATSAPP' && contentType === 'CAROUSEL' && (cards.length < 2 || cards.some(card => !card.file && !card.imageUrl))) { setError('Add an image for every carousel card (2-10).'); return; }
    if (channel === 'WHATSAPP' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(contentType) && !media?.file && !media?.url) { setError('Choose an attachment or enter its public HTTPS URL.'); return; }
    const payload: CreateCampaignInput = {
      name: values.name.trim(), channel: values.channel, providerCampaignName: channel === 'WHATSAPP' ? values.providerCampaignName.trim() : undefined, templateId: channel === 'EMAIL' ? values.templateId : undefined,
      templateParams: channel === 'WHATSAPP' ? params : [], audienceFilter: { ...campaign?.audienceFilter, recipientTypes, manualMobiles: parsed.numbers, excludeMobiles: excluded.numbers, tags: split(values.tags), segments: split(values.segments) },
    };
    setBusy(true);
    try {
      // Persist a draft first. Activate scheduling only after every upload and
      // the final content update succeeds; retries reuse the same draft.
      let id = savedId;
      if (!id) { id = (await create.mutateAsync(payload))._id; setSavedId(id); }
      let attachment: CreateCampaignInput['media'] = null;
      const carouselCards: NonNullable<CreateCampaignInput['carouselCards']> = [];
      if (channel === 'WHATSAPP' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(contentType) && media) {
        if (media.file) {
          const uploaded = await upload.upload(media.file, 'MARKETING_MEDIA', id);
          attachment = { fileId: uploaded._id, url: resolveFileUrl(uploaded), filename: media.file.name };
          setMedia(attachment);
        } else attachment = { fileId: media.fileId, url: media.url, filename: media.filename || 'attachment' };
      }
      if (channel === 'WHATSAPP' && contentType === 'CAROUSEL') {
        const nextCards = [...cards];
        for (let index = 0; index < cards.length; index++) {
          const card = cards[index];
          if (card.file) {
            const uploaded = await upload.upload(card.file, 'MARKETING_MEDIA', id);
            nextCards[index] = { imageUrl: resolveFileUrl(uploaded) };
            setCards([...nextCards]);
          }
          carouselCards.push({ cardIndex: index, imageUrl: nextCards[index].imageUrl });
        }
      }
      await update.mutateAsync({ id, ...payload, contentType: channel === 'WHATSAPP' ? contentType : undefined, media: attachment, carouselCards, scheduledAt });
      toast.success(scheduled ? 'Campaign scheduled in India Standard Time' : 'Draft saved. Preview the audience before sending.');
      onClose();
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string; errors?: Array<{ message: string }> } } };
      setError(apiError.response?.data?.errors?.map(item => item.message).join('; ') || apiError.response?.data?.message || (err instanceof Error ? err.message : 'Could not save campaign'));
    } finally { setBusy(false); }
  };
  function chooseFile(file: File | undefined, kind: string, setter: (file: File) => void) {
    if (!file) return;
    const image = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const valid = kind === 'IMAGE' || kind === 'CAROUSEL' ? image : kind === 'VIDEO' ? file.type === 'video/mp4' : /\.(pdf|docx?|xlsx?|pptx?|txt)$/i.test(file.name);
    const max = kind === 'IMAGE' || kind === 'CAROUSEL' ? 5 : kind === 'VIDEO' ? 16 : 20;
    if (!valid || file.size > max * 1024 * 1024) { setError(`Use ${kind === 'VIDEO' ? 'MP4' : kind === 'DOCUMENT' ? 'PDF, Office or TXT' : 'JPG, PNG or WebP'} up to ${max} MB.`); return; }
    setError(''); setter(file);
  }
  return <form onSubmit={event => { void handleSubmit(onSubmit)(event); }} className="space-y-5">
    <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
      <AppFormField label="Campaign name" error={errors.name ? 'Enter a name' : undefined} {...register('name', { required: true })} />
      <label className="block space-y-1 text-sm">Channel<select className="h-9 w-full rounded border px-2" {...register('channel')}><option value="WHATSAPP">WhatsApp (AiSensy)</option><option value="EMAIL">Email</option></select></label>
      {channel === 'WHATSAPP' ? <>
        <AppFormField label="AiSensy API campaign name" placeholder="Copy the exact Live campaign name from AiSensy" error={errors.providerCampaignName ? 'Enter the AiSensy campaign name' : undefined} {...register('providerCampaignName', { required: true })} />
        <section className="space-y-2 rounded border p-3"><p className="text-sm font-medium">Template parameters ({params.length})</p><p className="text-xs text-muted-foreground">Leave empty if the approved template has no variables. Add one row per variable, in exact AiSensy order. Commas stay inside the value.</p>
          {params.map((param, index) => <div key={index} className="flex gap-2"><Input aria-label={`Parameter ${index + 1}`} value={param} onChange={event => setParams(params.map((value, i) => i === index ? event.target.value : value))} /><Button type="button" variant="outline" onClick={() => setParams(params.filter((_, i) => i !== index))}>Remove</Button></div>)}
          <Button type="button" variant="outline" onClick={() => setParams([...params, ''])}>Add parameter</Button><p className="text-xs text-muted-foreground">Available: {'{{firstName}}, {{fullName}}, {{campaignName}}'}</p>
        </section>
        <label className="block space-y-1 text-sm">Template content<select aria-label="Template content" className="h-9 w-full rounded border px-2" value={contentType} onChange={event => setContentType(event.target.value as typeof contentType)}>{(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'CAROUSEL'] as const).map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></label>
        <p className="text-xs text-muted-foreground">Match the approved AiSensy template. Media URLs must be public HTTPS links.</p>
        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(contentType) && <section className="space-y-2 rounded border p-3"><label className="text-sm">Upload {contentType.toLowerCase()}<Input aria-label="Campaign attachment" type="file" accept={contentType === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : contentType === 'VIDEO' ? 'video/mp4' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'} onChange={event => chooseFile(event.target.files?.[0], contentType, file => setMedia({ file, url: '', filename: file.name }))} /></label>
          <Input aria-label="Attachment URL" placeholder="Or paste a public HTTPS attachment URL" value={media?.url ?? ''} onChange={event => setMedia({ url: event.target.value, filename: media?.filename ?? 'attachment' })} />
          <Input aria-label="Attachment filename" placeholder="Filename, including extension" value={media?.filename ?? ''} onChange={event => setMedia({ ...(media ?? { url: '' }), filename: event.target.value })} />
          {media?.file && <p className="text-xs">Selected: {media.file.name}</p>}{media?.url && <a className="text-xs underline" href={media.url} target="_blank" rel="noreferrer">Open current attachment</a>}
        </section>}
        {contentType === 'CAROUSEL' && <section className="space-y-3 rounded border p-3"><p className="text-sm font-medium">Carousel images ({cards.length}/10)</p><p className="text-xs text-muted-foreground">Use the same number and order as the approved template. Each card has its own image.</p>
          {cards.map((card, index) => <div key={index} className="space-y-2 rounded bg-muted/30 p-2"><div className="flex justify-between"><label className="text-sm">Card {index + 1}</label><Button type="button" size="sm" variant="ghost" disabled={cards.length <= 2} onClick={() => setCards(cards.filter((_, i) => i !== index))}>Remove card</Button></div>
            <Input aria-label={`Card ${index + 1} image`} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => chooseFile(event.target.files?.[0], 'CAROUSEL', file => setCards(cards.map((item, i) => i === index ? { imageUrl: '', file } : item)))} />
            <Input aria-label={`Card ${index + 1} URL`} placeholder="Or public HTTPS image URL" value={card.imageUrl} onChange={event => setCards(cards.map((item, i) => i === index ? { imageUrl: event.target.value } : item))} />
            {card.file && <p className="text-xs">{card.file.name}</p>}{card.imageUrl && <a className="text-xs underline" href={card.imageUrl} target="_blank" rel="noreferrer">View card image</a>}
          </div>)}<Button type="button" variant="outline" disabled={cards.length >= 10} onClick={() => setCards([...cards, { imageUrl: '' }])}>Add carousel card</Button>
        </section>}
      </> : <label className="block space-y-1 text-sm">Email template<select className="h-9 w-full rounded border px-2" {...register('templateId', { required: channel === 'EMAIL' })}><option value="">Select an active email template</option>{templates?.filter(template => template.channel === 'EMAIL' && template.active).map(template => <option key={template._id} value={template._id}>{template.triggerKey}</option>)}</select></label>}
      <section className="space-y-2"><label htmlFor="campaign-numbers" className="text-sm font-medium">WhatsApp numbers</label><textarea id="campaign-numbers" className={textareaClass} placeholder="Paste numbers, one per line or separated by commas. Up to 50,000." {...register('manualMobiles')} /><p className="text-xs text-muted-foreground">{parsed.numbers.length.toLocaleString()} unique numbers; {parsed.duplicates} duplicates removed; {parsed.invalid.length} invalid.</p>
        <label className="text-xs underline cursor-pointer">Import a TXT / CSV list<input className="sr-only" type="file" accept=".txt,.csv" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { setError('Use a numbers-only file up to 2 MB.'); return; } setValue('manualMobiles', await file.text(), { shouldDirty: true }); }} /></label>
      </section>
      <details className="rounded border p-3"><summary className="cursor-pointer text-sm">Saved audiences and exclusions</summary><div className="space-y-3 pt-3"><p className="text-xs text-muted-foreground">Saved audiences use their configured marketing consent. Pasted numbers are included automatically.</p><div className="flex flex-wrap gap-3">{(['CUSTOMER', 'USER', 'EMPLOYEE', 'VENDOR', 'VENDOR_TECHNICIAN', 'MANUAL'] as CampaignRecipientType[]).map(type => <label key={type} className="text-xs"><input type="checkbox" value={type} {...register('recipientTypes')} /> {type.replaceAll('_', ' ')}</label>)}</div><AppFormField label="Customer tags (comma separated)" {...register('tags')} /><AppFormField label="Customer segments (comma separated)" {...register('segments')} /><label className="block text-sm">Excluded numbers<textarea className={textareaClass} {...register('excludeMobiles')} /></label></div></details>
      <section className="space-y-2 rounded border p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scheduled} onChange={event => setScheduled(event.target.checked)} /> Schedule automatically</label>{scheduled ? <><Input aria-label="Schedule date and time" type="datetime-local" {...register('scheduledAt')} /><p className="text-xs text-muted-foreground">India Standard Time (IST, UTC+05:30). Sending starts at or after this time while the API worker is running.</p></> : <p className="text-xs text-muted-foreground">Save as draft, preview recipients, then choose Send now. Unchecking removes an existing schedule.</p>}</section>
      {error && <p role="alert" className="text-sm text-destructive">{error}{savedId && !campaign && ' Your draft is saved; retry here or reopen it from the list.'}</p>}
      <Button className="w-full" type="submit">{busy ? 'Saving attachments and campaign...' : scheduled ? 'Save schedule' : campaign ? 'Save changes' : 'Save draft'}</Button>
    </fieldset>
  </form>;
}
