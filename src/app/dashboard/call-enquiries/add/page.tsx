'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import { ClipboardList, Megaphone, Pencil, PhoneIncoming, RotateCcw, Save, Search, User } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import {
  CALL_ENQUIRY_SOURCES, CallEnquiry, CallEnquiryService, CallEnquirySource, SOURCES_WITH_DETAIL, useCallEnquiry, useSaveCallEnquiry,
} from '@/lib/hooks/useCallEnquiries';
import { useRegistrationServices } from '@/lib/hooks/useRegistrations';
import { ChoiceTile } from '@/components/registrations/shared/ChoiceTile';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

// Call Enquiry Section → Add Call Enquiry: a phone call that only asked about
// a service — who called, for which service and where they heard of us.

interface FormState {
  name: string;
  phone: string;
  // Navbar List services picked, in the order they were ticked.
  serviceIds: string[];
  // "Other service" ticked, and what was typed for it.
  otherOn: boolean;
  otherService: string;
  source: CallEnquirySource | '';
  sourceDetail: string;
  remarks: string;
}

const emptyForm: FormState = { name: '', phone: '', serviceIds: [], otherOn: false, otherService: '', source: '', sourceDetail: '', remarks: '' };

// Older enquiries only have the single serviceId / serviceName.
function storedServicesOf(existing: CallEnquiry): CallEnquiryService[] {
  if (existing.services?.length) return existing.services;
  return [{ serviceId: existing.serviceId, name: existing.serviceName, category: existing.serviceCategory }];
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

// Keyed by the loaded enquiry's id so add ↔ edit remount with fresh state.
// `prefill`: name / mobile carried over from the top-bar customer search.
function EnquiryForm({ existing, prefill }: { existing?: CallEnquiry; prefill?: { name: string; phone: string } }) {
  const router = useRouter();
  const isEditMode = !!existing;
  const stored = existing ? storedServicesOf(existing) : [];
  const initialForm: FormState = existing
    ? {
        name: existing.name, phone: existing.phone,
        serviceIds: [...new Set(stored.flatMap((s) => (s.serviceId ? [s.serviceId] : [])))],
        // No Navbar List link stored → it was typed in as "Other".
        otherOn: stored.some((s) => !s.serviceId),
        otherService: stored.filter((s) => !s.serviceId).map((s) => s.name).join(', '),
        source: existing.source, sourceDetail: existing.sourceDetail ?? '', remarks: existing.remarks ?? '',
      }
    : { ...emptyForm, ...prefill };

  const [form, setForm] = useState<FormState>(initialForm);
  const [serviceSearch, setServiceSearch] = useState('');
  const { data: menus = [], isLoading: servicesLoading } = useRegistrationServices();
  const save = useSaveCallEnquiry();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleService = (id: string) =>
    setForm((prev) => ({ ...prev, serviceIds: prev.serviceIds.includes(id) ? prev.serviceIds.filter((x) => x !== id) : [...prev.serviceIds, id] }));

  // Picked services with their names / menus. One whose navbar link was since
  // removed keeps the name it was saved with.
  const picked: CallEnquiryService[] = form.serviceIds.flatMap((id) => {
    const menu = menus.find((m) => m.services.some((s) => s.id === id));
    const service = menu?.services.find((s) => s.id === id);
    if (menu && service) return [{ serviceId: id, name: service.name, category: menu.name }];
    const old = stored.find((s) => s.serviceId === id);
    return old ? [old] : [];
  });
  const otherName = form.otherService.trim();
  if (form.otherOn && otherName) picked.push({ name: otherName, category: 'Other' });
  // Stored links no longer in Navbar List — shown under Other so they can be unticked.
  const removedStored = stored.filter((s) => s.serviceId && !menus.some((m) => m.services.some((sv) => sv.id === s.serviceId)));
  const serviceName = picked.map((s) => s.name).join(', ');
  const categoryName = [...new Set(picked.map((s) => s.category).filter(Boolean))].join(', ');

  // Service list narrowed by the search box (matches the service or its menu).
  const q = serviceSearch.trim().toLowerCase();
  const visibleMenus = menus
    .map((m) => ({ ...m, services: m.services.filter((sv) => !q || sv.name.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) }))
    .filter((m) => m.services.length > 0);
  const needsDetail = !!form.source && SOURCES_WITH_DETAIL.includes(form.source);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const warn = (title: string) => void Swal.fire({ icon: 'warning', title, confirmButtonColor: '#3e8914' });
    if (!/^[6-9]\d{9}$/.test(form.phone)) return warn('Enter a valid 10-digit mobile number');
    if (form.otherOn && !otherName) return warn('Please type the other service they asked about');
    if (picked.length === 0) return warn('Please select the service(s) they asked about');
    if (picked.length > 20) return warn('Select up to 20 services');
    if (!form.source) return warn('Please select where they heard about us');

    try {
      const saved = await save.mutateAsync({
        ...(existing ? { id: existing._id } : {}),
        name: form.name.trim(),
        phone: form.phone,
        // First Navbar List link; editing to only "Other" sends null so the old link is dropped.
        serviceId: picked.find((s) => s.serviceId)?.serviceId ?? (existing ? null : undefined),
        serviceName,
        serviceCategory: categoryName,
        services: picked,
        source: form.source,
        sourceDetail: needsDetail ? form.sourceDetail.trim() : '',
        remarks: form.remarks.trim(),
      });

      if (isEditMode) {
        await Swal.fire({ icon: 'success', title: 'Enquiry updated', timer: 1400, showConfirmButton: false });
        router.push('/dashboard/call-enquiries/list');
        return;
      }
      const result = await Swal.fire({
        icon: 'success',
        title: 'Enquiry added',
        html: `Enquiry No: <b>${saved.enquiryNo}</b>`,
        showCancelButton: true,
        confirmButtonText: 'View Enquiry List',
        cancelButtonText: 'Add Another',
        confirmButtonColor: '#3e8914',
        cancelButtonColor: '#4B1426',
      });
      if (result.isConfirmed) router.push('/dashboard/call-enquiries/list');
      else {
        setForm(emptyForm);
        setServiceSearch('');
      }
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save enquiry', text: errorMessage(error), confirmButtonColor: '#3e8914' });
    }
  }

  const summary: [string, string][] = [
    ['Name', form.name],
    ['Mobile', form.phone ? `+91 ${form.phone}` : ''],
    [picked.length > 1 ? `Services (${picked.length})` : 'Service', serviceName],
    ['Category', categoryName],
    ['Source', form.source ? `${form.source}${needsDetail && form.sourceDetail ? ` — ${form.sourceDetail}` : ''}` : ''],
  ];

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <FormCard icon={User} title="Caller Details" hint="Who called to enquire.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Full Name" required>
              <input required minLength={2} maxLength={120} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter caller's name" className={FIELD_INPUT} />
            </Field>
            <Field label="Mobile Number" required>
              <div className="flex">
                <span className="flex items-center border-2 border-r-0 border-gray-300 bg-gray-50 px-2.5 text-xs font-bold text-gray-600">+91</span>
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className={FIELD_INPUT}
                />
              </div>
            </Field>
          </div>
        </FormCard>

        <FormCard icon={PhoneIncoming} title="Enquiry For" hint="The services they asked about — pick one or more from Navbar List. Not in the list? Tick Other and type it.">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className={`${FIELD_LABEL} mb-0`}>
              Select Services <span className="text-red-500">*</span>
              {picked.length > 0 && <span className="ml-1.5 normal-case text-[#3e8914]">({picked.length} selected)</span>}
            </label>
            <div className="relative w-full max-w-[260px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search service..."
                aria-label="Search service"
                className={`${FIELD_INPUT} pl-8`}
              />
            </div>
          </div>

          {servicesLoading ? (
            <p className="text-[11px] font-medium text-gray-400">Loading services...</p>
          ) : (
            <div className="space-y-3">
              {visibleMenus.map((m) => (
                <div key={m.id}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4B1426]">{m.name}</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {m.services.map((sv) => (
                      <ChoiceTile key={sv.id} compact selected={form.serviceIds.includes(sv.id)} onClick={() => toggleService(sv.id)}>
                        {sv.name}
                      </ChoiceTile>
                    ))}
                  </div>
                </div>
              ))}
              {q && visibleMenus.length === 0 && (
                <p className="text-[11px] font-medium text-gray-500">No service matches &quot;{serviceSearch}&quot; — pick Other below and type it.</p>
              )}
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4B1426]">Other</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {removedStored.map((s) => (
                    <ChoiceTile key={s.serviceId} compact selected={form.serviceIds.includes(s.serviceId!)} onClick={() => toggleService(s.serviceId!)}>
                      {s.name} (removed)
                    </ChoiceTile>
                  ))}
                  <ChoiceTile
                    compact
                    selected={form.otherOn}
                    onClick={() => setForm((prev) => ({ ...prev, otherOn: !prev.otherOn, otherService: prev.otherService || serviceSearch.trim() }))}
                  >
                    Other service
                  </ChoiceTile>
                </div>
              </div>
            </div>
          )}

          {form.otherOn && (
            <div className="mt-3">
              <Field label="Service Name" required hint="Type the service they asked about.">
                <input
                  required
                  autoFocus
                  value={form.otherService}
                  maxLength={150}
                  onChange={(e) => update('otherService', e.target.value)}
                  placeholder="e.g. Water tank cleaning"
                  className={FIELD_INPUT}
                />
              </Field>
            </div>
          )}
        </FormCard>

        <FormCard icon={Megaphone} title="Where did they hear about us?" hint="Pick the source the caller mentioned.">
          <label className={FIELD_LABEL}>Source <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {CALL_ENQUIRY_SOURCES.map((source) => (
              <ChoiceTile key={source} variant="radio" selected={form.source === source} onClick={() => update('source', source)}>
                {source}
              </ChoiceTile>
            ))}
          </div>
          {needsDetail && (
            <div className="mt-3">
              <Field label={form.source === 'Referral' ? 'Referred By' : 'Please specify'}>
                <input value={form.sourceDetail} maxLength={120} onChange={(e) => update('sourceDetail', e.target.value)} placeholder={form.source === 'Referral' ? 'e.g. Amit Sharma (neighbour)' : 'e.g. Pamphlet, hoarding...'} className={FIELD_INPUT} />
              </Field>
            </div>
          )}
        </FormCard>

        <FormCard icon={ClipboardList} title="Remarks" hint="Anything useful from the call — what they asked, when to call back, quoted price, etc.">
          <div className="relative">
            <textarea rows={3} value={form.remarks} onChange={(e) => update('remarks', e.target.value.slice(0, 500))} placeholder="e.g. Asked AC gas refill price, will confirm by evening." className={`${FIELD_INPUT} resize-none`} />
            <span className="absolute bottom-2 right-2 bg-white px-1 text-[10px] font-semibold text-gray-400">{form.remarks.length}/500</span>
          </div>
        </FormCard>
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <section className={CARD}>
            <h2 className={`${CARD_TITLE} mb-3`}><ClipboardList className="h-4 w-4" /> Summary</h2>
            <dl className="space-y-2 text-xs">
              {summary.map(([label, value]) => (
                <div key={label} className="flex gap-2 border-b border-gray-100 pb-1.5">
                  <dt className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
                  <dd className="font-semibold text-gray-800">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[10px] font-medium leading-relaxed text-gray-400">
              If the caller books later, open Call Enquiry List and use &quot;Move to Service Call&quot; — the details are carried over.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setForm(initialForm)} disabled={save.isPending} className={SECONDARY_BUTTON}>
                <RotateCcw className="h-3.5 w-3.5" /> {isEditMode ? 'Undo' : 'Reset'}
              </button>
              <button type="submit" disabled={save.isPending} className={`${PRIMARY_BUTTON} flex-1`}>
                {isEditMode ? <Pencil className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {save.isPending ? 'Saving...' : isEditMode ? 'Update Enquiry' : 'Save Enquiry'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}

function AddCallEnquiryInner() {
  const params = useSearchParams();
  const editId = params.get('editId');
  // From the top-bar search ("no customer found"): ?phone=9876543210 / ?name=Rahul.
  const phone = (params.get('phone') ?? '').replace(/\D/g, '').slice(-10);
  const prefill = { name: (params.get('name') ?? '').slice(0, 120), phone: /^[6-9]\d{9}$/.test(phone) ? phone : '' };
  const { data: existing, isLoading, isError } = useCallEnquiry(editId);

  let body;
  if (editId && isLoading) body = <p className="py-16 text-center text-sm text-[#6c7587]">Loading enquiry...</p>;
  else if (editId && (isError || !existing)) body = <p className="py-16 text-center text-sm font-bold text-red-600">Enquiry not found.</p>;
  else body = <EnquiryForm key={existing?._id ?? `new-${prefill.phone}-${prefill.name}`} existing={existing} prefill={prefill} />;

  return (
    <PageShell
      title={editId ? 'Edit Call Enquiry' : 'Add Call Enquiry'}
      description={editId && existing ? `Update enquiry ${existing.enquiryNo}.` : 'Note a phone enquiry — who called, for which service and where they heard about CityCalls.'}
    >
      {body}
    </PageShell>
  );
}

export default function AddCallEnquiryPage() {
  return (
    <Suspense fallback={null}>
      <AddCallEnquiryInner />
    </Suspense>
  );
}
