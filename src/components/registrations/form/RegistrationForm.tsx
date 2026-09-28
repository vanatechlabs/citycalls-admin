'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useBrands } from '@/lib/hooks/useBrands';
import { useUploadFile } from '@/lib/hooks/useFiles';
import { useOffers, useOfferStrip } from '@/lib/hooks/useHomeOffers';
import {
  useCreateRegistration, useRegistrationServices, useUpdateRegistration, Registration,
} from '@/lib/hooks/useRegistrations';
import { FALLBACK_BRANDS } from '@/lib/registrations/constants';
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

// Create form when `registration` is absent, edit form when it's given.
export function RegistrationForm({ registration }: { registration?: Registration }) {
  const router = useRouter();
  const mode = registration ? 'edit' : 'create';

  const initialState = () => (registration ? formStateFromRegistration(registration) : emptyFormState());
  const [form, setForm] = useState<RegistrationFormState>(initialState);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(registration?.photos ?? []);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [issueError, setIssueError] = useState(false);

  const { data: menus = [], isLoading: servicesLoading } = useRegistrationServices();
  const { data: brandList } = useBrands();
  const { data: offers } = useOffers({ status: 'ACTIVE' });
  const { data: offerStrip } = useOfferStrip();
  const createRegistration = useCreateRegistration();
  const updateRegistration = useUpdateRegistration();
  const photoUpload = useUploadFile('REGISTRATION', registration?._id ?? 'new', { skipGlobalToast: true });
  const isSaving = createRegistration.isPending || updateRegistration.isPending || photoUpload.isPending;

  const update: UpdateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // ─── Selected service → its issue fields ───────────────────────────────────
  const selectedMenu = menus.find((menu) => menu.services.some((s) => s.id === form.serviceId));
  const liveService = selectedMenu?.services.find((s) => s.id === form.serviceId);
  // Editing a registration whose navbar link was removed: keep its stored copy.
  const missingService = registration?.serviceId && !servicesLoading && !menus.some((m) => m.services.some((s) => s.id === registration.serviceId))
    ? { id: registration.serviceId, name: registration.serviceName }
    : undefined;

  let selected: SelectedService | undefined;
  if (liveService && selectedMenu) {
    selected = { id: liveService.id, name: liveService.name, path: liveService.path, category: selectedMenu.name };
  } else if (registration && missingService && form.serviceId === missingService.id) {
    selected = { id: registration.serviceId, name: registration.serviceName, path: '', category: registration.serviceCategory };
  }
  const issueConfig = getIssueConfig(selected);

  function handleServiceChange(serviceId: string) {
    // Type / size / issue choices belong to the previous service's lists.
    setForm((f) => ({ ...f, serviceId, applianceType: '', capacity: '', issues: [] }));
    setIssueError(false);
  }

  function toggleIssue(issue: string) {
    setIssueError(false);
    setForm((f) => ({
      ...f,
      issues: f.issues.includes(issue) ? f.issues.filter((i) => i !== issue) : [...f.issues, issue],
    }));
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

  // ─── Photos ────────────────────────────────────────────────────────────────
  function removePendingPhoto(index: number) {
    setPendingPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function resetForm() {
    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPendingPhotos([]);
    setExistingPhotos(registration?.photos ?? []);
    setForm(initialState());
    setIssueError(false);
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      void Swal.fire({ icon: 'warning', title: 'Please select a service' });
      return;
    }
    if (form.issues.length === 0) {
      setIssueError(true);
      document.getElementById('issue-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const payload = buildPayload(form, selected, issueConfig, mode);

    let saved: Registration;
    try {
      saved = registration
        ? await updateRegistration.mutateAsync({ id: registration._id, ...payload, photos: existingPhotos })
        : await createRegistration.mutateAsync(payload);
    } catch (error) {
      void Swal.fire({ icon: 'error', title: `Failed to ${mode === 'edit' ? 'update' : 'create'} registration`, text: errorMessage(error) });
      return;
    }

    // New photos need the registration's id, so they go up after saving.
    let photoFailed = false;
    if (pendingPhotos.length > 0) {
      try {
        const uploaded = await Promise.all(pendingPhotos.map(({ file }) => photoUpload.upload(file, 'ISSUE_IMAGE', saved._id)));
        await updateRegistration.mutateAsync({ id: saved._id, photos: [...existingPhotos, ...uploaded.map((f) => f.url)] });
      } catch {
        photoFailed = true;
      }
    }

    if (mode === 'edit') {
      await Swal.fire({
        icon: photoFailed ? 'warning' : 'success',
        title: 'Registration updated',
        text: photoFailed ? 'Details saved, but the new photos could not be uploaded.' : undefined,
        timer: photoFailed ? undefined : 1500,
        showConfirmButton: photoFailed,
      });
      router.push(`/dashboard/registrations/${saved._id}`);
      return;
    }

    const result = await Swal.fire({
      icon: photoFailed ? 'warning' : 'success',
      title: 'Registration created',
      html: `Registration No: <b>${saved.registrationNo}</b><br/><small>Added to Pending Registration.</small>${photoFailed ? '<br/><small>Photos could not be uploaded.</small>' : ''}`,
      showCancelButton: true,
      confirmButtonText: 'View Registration',
      cancelButtonText: 'Create Another',
      confirmButtonColor: '#3e8914',
      cancelButtonColor: '#4B1426',
    });
    if (result.isConfirmed) {
      router.push(`/dashboard/registrations/${saved._id}`);
    } else {
      resetForm();
    }
  }

  const summaryRows: [string, string][] = [
    ['Service', selected?.name ?? ''],
    ['Category', selected?.category ?? ''],
    ['Customer', form.fullName],
    ['Phone', form.phone ? `+91 ${form.phone}` : ''],
    [issueConfig.typeLabel.replace(/ \(.*\)$/, ''), form.applianceType],
    ['Issues', form.issues.join(', ')],
    ['Visit', form.preferredDate
      ? `${new Date(form.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${visitTimeLabel(form) || '—'}`
      : ''],
    ['Coupon', form.couponCode],
  ];

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <ServiceDetailsCard
          menus={menus}
          loading={servicesLoading}
          serviceId={form.serviceId}
          onChange={handleServiceChange}
          missingService={missingService}
        />
        <PersonalInfoCard form={form} update={update} />
        <IssueDetailsCard
          form={form}
          update={update}
          config={issueConfig}
          serviceName={selected?.name}
          brands={brands}
          issueError={issueError}
          onToggleIssue={toggleIssue}
          photoUploader={
            <PhotoUploader
              existing={existingPhotos}
              onRemoveExisting={(url) => setExistingPhotos((prev) => prev.filter((p) => p !== url))}
              pending={pendingPhotos}
              onAdd={(photos) => setPendingPhotos((prev) => [...prev, ...photos])}
              onRemovePending={removePendingPhoto}
            />
          }
        />
        <ScheduleCard form={form} update={update} allowPastDate={mode === 'edit'} />
      </div>

      <div className="lg:col-span-1">
        <div className="space-y-6 lg:sticky lg:top-4">
          <CouponCard value={form.couponCode} onChange={(code) => update('couponCode', code)} knownCoupons={knownCoupons} />
          <SummaryCard
            rows={summaryRows}
            isSaving={isSaving}
            submitLabel={mode === 'edit' ? 'Update Registration' : 'Create Registration'}
            resetLabel={mode === 'edit' ? 'Undo Changes' : 'Reset'}
            onReset={resetForm}
          />
        </div>
      </div>
    </form>
  );
}
