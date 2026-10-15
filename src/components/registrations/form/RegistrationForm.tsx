'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useBrands } from '@/lib/hooks/useBrands';
import { CallEnquiry, useSaveCallEnquiry } from '@/lib/hooks/useCallEnquiries';
import { useUploadFile } from '@/lib/hooks/useFiles';
import { useOffers, useOfferStrip } from '@/lib/hooks/useHomeOffers';
import {
  useCreateRegistration, useRegistrationServices, useUpdateRegistration, Registration,
} from '@/lib/hooks/useRegistrations';
import { FALLBACK_BRANDS, HEARD_FROM } from '@/lib/registrations/constants';
import { getIssueConfig } from '@/lib/registrations/issueConfig';
import { CouponCard } from './CouponCard';
import {
  buildPayload, emptyFormState, formStateFromRegistration, visitTimeLabel,
  RegistrationFormState, SelectedService, UpdateField,
} from './formState';
import { IssueDetailsCard } from './IssueDetailsCard';
import { PersonalInfoCard } from './PersonalInfoCard';
import { PendingPhoto, PhotoUploader } from './PhotoUploader';
import { ScheduleCard } from './ScheduleCard';
import { ServiceDetailsCard } from './ServiceDetailsCard';
import { SummaryCard } from './SummaryCard';

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

// The part of the form that belongs to one service. A new registration can be
// for several services at once: each has its own copy of these (and its own
// photos), and is saved as its own registration under that service's category.
const ISSUE_KEYS = ['brand', 'modelNumber', 'applianceType', 'capacity', 'issues', 'issueDescription', 'issueFrequency', 'safetyConcern'] as const;
type IssueKey = (typeof ISSUE_KEYS)[number];
type IssueFields = Pick<RegistrationFormState, IssueKey>;

interface ServiceEntry {
  serviceId: string;
  issue: IssueFields;
  pendingPhotos: PendingPhoto[];
  collapsed: boolean;
  // Shown after a save attempt found this service's details incomplete.
  error: boolean;
}

function issueFieldsOf(form: RegistrationFormState): IssueFields {
  return {
    brand: form.brand, modelNumber: form.modelNumber, applianceType: form.applianceType, capacity: form.capacity,
    issues: form.issues, issueDescription: form.issueDescription, issueFrequency: form.issueFrequency, safetyConcern: form.safetyConcern,
  };
}

const newEntry = (serviceId: string): ServiceEntry => ({
  serviceId, issue: issueFieldsOf(emptyFormState()), pendingPhotos: [], collapsed: false, error: false,
});

const isIssueKey = (key: keyof RegistrationFormState): key is IssueKey => (ISSUE_KEYS as readonly string[]).includes(key);

// A known customer's details (Customer Section → profile → New Service Call).
export interface RegistrationCustomerPrefill {
  name: string;
  phone: string;
  email?: string;
  altPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// Create form when `registration` is absent, edit form when it's given.
// `enquiry`: a call enquiry being moved to a Service Call — its name, mobile,
// service and source start filled in, and it's marked Converted once saved.
// `customer`: a returning customer — their contact details and last address start filled in.
export function RegistrationForm({ registration, enquiry, customer }: { registration?: Registration; enquiry?: CallEnquiry; customer?: RegistrationCustomerPrefill }) {
  const router = useRouter();
  const mode = registration ? 'edit' : 'create';

  const initialState = () => {
    if (registration) return formStateFromRegistration(registration);
    if (customer) {
      return {
        ...emptyFormState(),
        fullName: customer.name, phone: customer.phone, email: customer.email ?? '', altPhone: customer.altPhone ?? '',
        address: customer.address ?? '', city: customer.city ?? '', state: customer.state ?? '', pincode: customer.pincode ?? '',
      };
    }
    if (!enquiry) return emptyFormState();
    return {
      ...emptyFormState(),
      fullName: enquiry.name,
      phone: enquiry.phone,
      heardFrom: HEARD_FROM.includes(enquiry.source) ? enquiry.source : 'Other',
      referenceName: enquiry.sourceDetail ?? '',
    };
  };
  // Editing: exactly one service (a registration is for one service).
  const initialEntries = (): ServiceEntry[] => {
    if (registration) return [{ ...newEntry(registration.serviceId ?? ''), issue: issueFieldsOf(formStateFromRegistration(registration)) }];
    if (!enquiry) return [];
    // Every service asked about that is in Navbar List ("Other" ones are typed, so skipped).
    const ids = enquiry.services?.length
      ? enquiry.services.flatMap((s) => (s.serviceId ? [s.serviceId] : []))
      : enquiry.serviceId ? [enquiry.serviceId] : [];
    return [...new Set(ids)].map((id) => newEntry(id));
  };

  const [form, setForm] = useState<RegistrationFormState>(initialState);
  const [entries, setEntries] = useState<ServiceEntry[]>(initialEntries);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(registration?.photos ?? []);

  const { data: menus = [], isLoading: servicesLoading } = useRegistrationServices();
  const { data: brandList } = useBrands();
  const { data: offers } = useOffers({ status: 'ACTIVE' });
  const { data: offerStrip } = useOfferStrip();
  const createRegistration = useCreateRegistration();
  const updateRegistration = useUpdateRegistration();
  const saveEnquiry = useSaveCallEnquiry();
  const photoUpload = useUploadFile('REGISTRATION', registration?._id ?? 'new', { skipGlobalToast: true });
  const isSaving = createRegistration.isPending || updateRegistration.isPending || photoUpload.isPending;

  const update: UpdateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const patchEntry = (serviceId: string, patch: (entry: ServiceEntry) => ServiceEntry) =>
    setEntries((prev) => prev.map((entry) => (entry.serviceId === serviceId ? patch(entry) : entry)));

  // ─── Service id → the service and its issue fields ─────────────────────────
  // Editing a registration whose navbar link was removed: keep its stored copy.
  const missingService = registration?.serviceId && !servicesLoading && !menus.some((m) => m.services.some((s) => s.id === registration.serviceId))
    ? { id: registration.serviceId, name: registration.serviceName }
    : undefined;

  function resolveService(serviceId: string): SelectedService | undefined {
    const menu = menus.find((m) => m.services.some((s) => s.id === serviceId));
    const live = menu?.services.find((s) => s.id === serviceId);
    if (live && menu) return { id: live.id, name: live.name, path: live.path, category: menu.name };
    if (registration && missingService && serviceId === missingService.id) {
      return { id: registration.serviceId, name: registration.serviceName, path: '', category: registration.serviceCategory };
    }
    return undefined;
  }

  // Edit: the one service is swapped (its type / size / issue choices belong to the old one).
  function handleServiceChange(serviceId: string) {
    setEntries([{ ...newEntry(serviceId), issue: { ...entries[0]?.issue ?? newEntry('').issue, applianceType: '', capacity: '', issues: [] }, pendingPhotos: entries[0]?.pendingPhotos ?? [] }]);
  }

  // Create: tick / untick a service.
  function toggleService(serviceId: string) {
    setEntries((prev) => {
      const existing = prev.find((e) => e.serviceId === serviceId);
      if (existing) {
        existing.pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
        return prev.filter((e) => e.serviceId !== serviceId);
      }
      // Fold the ones already filled in so the new one is easy to find.
      return [...prev.map((e) => ({ ...e, collapsed: e.collapsed || e.issue.issues.length > 0 })), newEntry(serviceId)];
    });
  }

  const brands = useMemo(() => {
    const active = (brandList ?? []).filter((b) => b.status === 'Active').map((b) => b.name);
    return active.length > 0 ? active : FALLBACK_BRANDS;
  }, [brandList]);

  // Known codes from Offers & Promotions: the deal cards plus the top strip.
  const knownCoupons = useMemo(() => {
    const codes = new Map<string, string>();
    for (const offer of offers ?? []) {
      if (offer.couponCode) codes.set(offer.couponCode.toUpperCase(), offer.title);
    }
    if (offerStrip?.couponCode && offerStrip.status === 'ACTIVE') {
      codes.set(offerStrip.couponCode.toUpperCase(), `${offerStrip.discountText} (offer strip)`);
    }
    return codes;
  }, [offers, offerStrip]);

  function resetForm() {
    entries.forEach((entry) => entry.pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview)));
    setEntries(initialEntries());
    setExistingPhotos(registration?.photos ?? []);
    setForm(initialState());
  }

  // What's still missing for one service (collapsed cards aren't in the page,
  // so the browser's own "required" checks can't see them).
  function missingFor(entry: ServiceEntry, service: SelectedService) {
    const config = getIssueConfig(service);
    if (config.showBrand && !entry.issue.brand) return 'brand';
    if (!entry.issue.applianceType) return config.typeLabel.replace(/ \(.*\)$/, '').toLowerCase();
    if (entry.issue.issues.length === 0) return 'at least one option';
    if (!entry.issue.issueDescription.trim()) return 'description';
    return null;
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = entries
      .map((entry) => ({ entry, service: resolveService(entry.serviceId) }))
      .filter((item): item is { entry: ServiceEntry; service: SelectedService } => !!item.service);
    if (chosen.length === 0) {
      void Swal.fire({ icon: 'warning', title: mode === 'edit' ? 'Please select a service' : 'Please select at least one service' });
      return;
    }

    const incomplete = chosen.find(({ entry, service }) => missingFor(entry, service));
    if (incomplete) {
      const missing = missingFor(incomplete.entry, incomplete.service);
      patchEntry(incomplete.entry.serviceId, (en) => ({ ...en, collapsed: false, error: true }));
      setTimeout(() => document.getElementById(`issue-details-${incomplete.entry.serviceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      void Swal.fire({
        toast: true, position: 'top-end', icon: 'warning', timer: 3200, showConfirmButton: false,
        title: `${incomplete.service.name}: please add ${missing}`,
      });
      return;
    }

    // One registration per service; photos need its id, so they go up after saving.
    const done: { serviceId: string; name: string; saved: Registration; photoFailed: boolean }[] = [];
    for (const { entry, service } of chosen) {
      const payload = buildPayload({ ...form, ...entry.issue, serviceId: entry.serviceId }, service, getIssueConfig(service), mode);
      let saved: Registration;
      try {
        saved = registration
          ? await updateRegistration.mutateAsync({ id: registration._id, ...payload, photos: existingPhotos })
          : await createRegistration.mutateAsync(payload);
      } catch (error) {
        // Keep only what's still unsaved, so trying again can't create duplicates.
        const savedIds = done.map((d) => d.serviceId);
        setEntries((prev) => prev.filter((en) => !savedIds.includes(en.serviceId)));
        void Swal.fire({
          icon: 'error',
          title: `Failed to ${mode === 'edit' ? 'update' : 'create'} registration`,
          html: `${service.name}: ${errorMessage(error) ?? 'please try again.'}${done.length ? `<br/><small>Already created: ${done.map((d) => `${d.name} (<b>${d.saved.registrationNo}</b>)`).join(', ')}</small>` : ''}`,
        });
        return;
      }

      let photoFailed = false;
      if (entry.pendingPhotos.length > 0) {
        try {
          const uploaded = await Promise.all(entry.pendingPhotos.map(({ file }) => photoUpload.upload(file, 'ISSUE_IMAGE', saved._id)));
          const kept = mode === 'edit' ? existingPhotos : [];
          await updateRegistration.mutateAsync({ id: saved._id, photos: [...kept, ...uploaded.map((f) => f.url)] });
        } catch {
          photoFailed = true;
        }
      }
      done.push({ serviceId: entry.serviceId, name: service.name, saved, photoFailed });
    }

    const photoFailed = done.some((d) => d.photoFailed);
    const first = done[0].saved;

    if (mode === 'edit') {
      await Swal.fire({
        icon: photoFailed ? 'warning' : 'success',
        title: 'Registration updated',
        text: photoFailed ? 'Details saved, but the new photos could not be uploaded.' : undefined,
        timer: photoFailed ? undefined : 1500,
        showConfirmButton: photoFailed,
      });
      router.push(`/dashboard/registrations/${first._id}`);
      return;
    }

    // The enquiry became these registration(s) — link it to the first one.
    let enquiryNote = '';
    if (enquiry) {
      try {
        await saveEnquiry.mutateAsync({ id: enquiry._id, status: 'CONVERTED', registrationId: first._id, registrationNo: first.registrationNo });
        enquiryNote = `<br/><small>Enquiry ${enquiry.enquiryNo} marked Converted.</small>`;
      } catch {
        enquiryNote = `<br/><small>Could not mark enquiry ${enquiry.enquiryNo} as Converted — change its status from the list.</small>`;
      }
    }

    const many = done.length > 1;
    const result = await Swal.fire({
      icon: photoFailed ? 'warning' : 'success',
      title: many ? `${done.length} registrations created` : 'Registration created',
      html: (many
        ? done.map((d) => `${d.name}: <b>${d.saved.registrationNo}</b>`).join('<br/>')
        : `Registration No: <b>${first.registrationNo}</b>`)
        + `<br/><small>${many ? 'Each is added to its own category under New Call.' : 'Added to New Call.'}</small>`
        + (photoFailed ? '<br/><small>Some photos could not be uploaded.</small>' : '')
        + enquiryNote,
      showCancelButton: true,
      confirmButtonText: many ? 'View Registrations' : 'View Registration',
      cancelButtonText: 'Create Another',
      confirmButtonColor: '#3e8914',
      cancelButtonColor: '#4B1426',
    });
    if (result.isConfirmed) {
      router.push(many ? '/dashboard/registrations/list' : `/dashboard/registrations/${first._id}`);
    } else if (enquiry) {
      // Back to a blank form (not this enquiry's details again).
      router.replace('/dashboard/registrations/new');
    } else {
      resetForm();
    }
  }

  const chosenServices = entries.map((entry) => ({ entry, service: resolveService(entry.serviceId) })).filter((item) => item.service);
  const summaryRows: [string, string][] = [
    [chosenServices.length > 1 ? 'Services' : 'Service', chosenServices.map((c) => c.service!.name).join(', ')],
    ['Category', [...new Set(chosenServices.map((c) => c.service!.category).filter(Boolean))].join(', ')],
    ['Customer', form.fullName],
    ['Phone', form.phone ? `+91 ${form.phone}` : ''],
    ['Issues', chosenServices.length > 1
      ? chosenServices.filter((c) => c.entry.issue.issues.length).map((c) => `${c.service!.name}: ${c.entry.issue.issues.join(', ')}`).join(' | ')
      : chosenServices[0]?.entry.issue.issues.join(', ') ?? ''],
    ['Visit', form.preferredDate
      ? `${new Date(form.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${visitTimeLabel(form) || '—'}`
      : ''],
    ['Coupon', form.couponCode],
  ];

  const multi = mode === 'create';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <ServiceDetailsCard
          menus={menus}
          loading={servicesLoading}
          serviceId={entries[0]?.serviceId ?? ''}
          onChange={handleServiceChange}
          missingService={missingService}
          multiple={multi ? { selectedIds: entries.map((e) => e.serviceId), onToggle: toggleService } : undefined}
        />
        <PersonalInfoCard form={form} update={update} />

        {entries.length === 0 && (
          <IssueDetailsCard
            form={form}
            update={update}
            config={getIssueConfig(undefined)}
            brands={brands}
            issueError={false}
            onToggleIssue={() => {}}
            photoUploader={null}
            collapsed
          />
        )}
        {entries.map((entry) => {
          const service = resolveService(entry.serviceId);
          const updateIssue: UpdateField = (key, value) => {
            if (isIssueKey(key)) patchEntry(entry.serviceId, (en) => ({ ...en, error: false, issue: { ...en.issue, [key]: value } }));
            else update(key, value);
          };
          return (
            <IssueDetailsCard
              key={entry.serviceId}
              id={`issue-details-${entry.serviceId}`}
              title={multi && service ? `Issue Details — ${service.name}` : 'Issue Details'}
              form={{ ...form, ...entry.issue, serviceId: entry.serviceId }}
              update={updateIssue}
              config={getIssueConfig(service)}
              serviceName={service?.name}
              brands={brands}
              issueError={entry.error}
              onToggleIssue={(issue) =>
                patchEntry(entry.serviceId, (en) => ({
                  ...en,
                  error: false,
                  issue: { ...en.issue, issues: en.issue.issues.includes(issue) ? en.issue.issues.filter((i) => i !== issue) : [...en.issue.issues, issue] },
                }))
              }
              collapsed={multi && entry.collapsed}
              onToggleCollapse={multi && entries.length > 1 ? () => patchEntry(entry.serviceId, (en) => ({ ...en, collapsed: !en.collapsed })) : undefined}
              onRemove={multi ? () => toggleService(entry.serviceId) : undefined}
              photoUploader={
                <PhotoUploader
                  existing={mode === 'edit' ? existingPhotos : []}
                  onRemoveExisting={(url) => setExistingPhotos((prev) => prev.filter((p) => p !== url))}
                  pending={entry.pendingPhotos}
                  onAdd={(photos) => patchEntry(entry.serviceId, (en) => ({ ...en, pendingPhotos: [...en.pendingPhotos, ...photos] }))}
                  onRemovePending={(index) =>
                    patchEntry(entry.serviceId, (en) => {
                      URL.revokeObjectURL(en.pendingPhotos[index].preview);
                      return { ...en, pendingPhotos: en.pendingPhotos.filter((_, i) => i !== index) };
                    })
                  }
                />
              }
            />
          );
        })}

        <ScheduleCard form={form} update={update} allowPastDate={mode === 'edit'} />
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <CouponCard value={form.couponCode} onChange={(code) => update('couponCode', code)} knownCoupons={knownCoupons} />
          <SummaryCard
            rows={summaryRows}
            isSaving={isSaving}
            submitLabel={mode === 'edit' ? 'Update Registration' : entries.length > 1 ? `Create ${entries.length} Registrations` : 'Create Registration'}
            resetLabel={mode === 'edit' ? 'Undo Changes' : 'Reset'}
            onReset={resetForm}
          />
        </div>
      </div>
    </form>
  );
}
