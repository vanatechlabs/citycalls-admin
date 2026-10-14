'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import { ClipboardList, Megaphone, Pencil, PhoneIncoming, RotateCcw, Save, Search, User } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import {
  CALL_ENQUIRY_SOURCES, CallEnquiry, CallEnquirySource, SOURCES_WITH_DETAIL, useCallEnquiry, useSaveCallEnquiry,
} from '@/lib/hooks/useCallEnquiries';
import { useRegistrationServices } from '@/lib/hooks/useRegistrations';
import { ChoiceTile } from '@/components/registrations/shared/ChoiceTile';
import { Field } from '@/components/registrations/shared/Field';
import { FormCard } from '@/components/registrations/shared/FormCard';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { CARD, CARD_TITLE, FIELD_INPUT, FIELD_LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/registrations/shared/styles';

// Call Enquiry Section → Add Call Enquiry: a phone call that only asked about
// a service — who called, for which service and where they heard of us.

// `serviceId` value for a service that isn't in Navbar List (typed by hand).
const OTHER_SERVICE = 'other';

interface FormState {
  name: string;
  phone: string;
  serviceId: string;
  // The service's name when "Other" is picked.
  otherService: string;
  source: CallEnquirySource | '';
  sourceDetail: string;
  remarks: string;
}

const emptyForm: FormState = { name: '', phone: '', serviceId: '', otherService: '', source: '', sourceDetail: '', remarks: '' };

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

// Keyed by the loaded enquiry's id so add ↔ edit remount with fresh state.
function EnquiryForm({ existing }: { existing?: CallEnquiry }) {
  const router = useRouter();
  const isEditMode = !!existing;
  const initialForm: FormState = existing
    ? {
        name: existing.name, phone: existing.phone,
        // No Navbar List link stored → it was typed in as "Other".
        serviceId: existing.serviceId ?? OTHER_SERVICE,
        otherService: existing.serviceId ? '' : existing.serviceName,
        source: existing.source, sourceDetail: existing.sourceDetail ?? '', remarks: existing.remarks ?? '',
      }
    : emptyForm;

  const [form, setForm] = useState<FormState>(initialForm);
  const [serviceSearch, setServiceSearch] = useState('');
  const { data: menus = [], isLoading: servicesLoading } = useRegistrationServices();
  const save = useSaveCallEnquiry();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const menu = menus.find((m) => m.services.some((s) => s.id === form.serviceId));
  const service = menu?.services.find((s) => s.id === form.serviceId);
  // Editing an enquiry whose navbar link was removed: keep its stored name.
  const storedService = existing && existing.serviceId === form.serviceId && !service ? existing : undefined;
  const isOther = form.serviceId === OTHER_SERVICE;
  const serviceName = isOther ? form.otherService.trim() : service?.name ?? storedService?.serviceName ?? '';
  const categoryName = isOther ? 'Other' : menu?.name ?? storedService?.serviceCategory ?? '';

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
    if (!serviceName) return warn(isOther ? 'Please type the service they asked about' : 'Please select the service they asked about');
    if (!form.source) return warn('Please select where they heard about us');

    try {
      const saved = await save.mutateAsync({
        ...(existing ? { id: existing._id } : {}),
        name: form.name.trim(),
        phone: form.phone,
        // Editing to "Other" sends null so the old navbar link is dropped.
        serviceId: isOther ? (existing ? null : undefined) : service?.id ?? storedService?.serviceId,
        serviceName,
        serviceCategory: categoryName,
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
    ['Service', serviceName],
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

        <FormCard icon={PhoneIncoming} title="Enquiry For" hint="The service they asked about — services come from Navbar List. Not in the list? Pick Other and type it.">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className={`${FIELD_LABEL} mb-0`}>Select Service <span className="text-red-500">*</span></label>
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
                      <ChoiceTile key={sv.id} compact variant="radio" selected={form.serviceId === sv.id} onClick={() => update('serviceId', sv.id)}>
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
                  {storedService?.serviceId && (
                    <ChoiceTile compact variant="radio" selected onClick={() => {}}>
                      {storedService.serviceName} (removed)
                    </ChoiceTile>
                  )}
                  <ChoiceTile
                    compact
                    variant="radio"
                    selected={isOther}
                    onClick={() => setForm((prev) => ({ ...prev, serviceId: OTHER_SERVICE, otherService: prev.otherService || serviceSearch.trim() }))}
                  >
                    Other service
                  </ChoiceTile>
                </div>
              </div>
            </div>
          )}

          {isOther && (
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
  const editId = useSearchParams().get('editId');
  const { data: existing, isLoading, isError } = useCallEnquiry(editId);

  let body;
  if (editId && isLoading) body = <p className="py-16 text-center text-sm text-[#6c7587]">Loading enquiry...</p>;
  else if (editId && (isError || !existing)) body = <p className="py-16 text-center text-sm font-bold text-red-600">Enquiry not found.</p>;
  else body = <EnquiryForm key={existing?._id ?? 'new'} existing={existing} />;

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
