import type { IssueFrequency, Registration, RegistrationInput } from '@/lib/hooks/useRegistrations';
import { REFERENCE_SOURCES, TIME_SLOTS } from '@/lib/registrations/constants';
import { formatClockTime, parseClockTime, toISODate, todayISO } from '@/lib/registrations/format';
import type { IssueConfig } from '@/lib/registrations/issueConfig';

export interface RegistrationFormState {
  fullName: string; email: string; phone: string; altPhone: string;
  address: string; pincode: string; city: string; state: string;
  language: string; heardFrom: string; referenceName: string; instructions: string;
  serviceId: string;
  brand: string; modelNumber: string; applianceType: string; capacity: string;
  issues: string[]; issueDescription: string; issueFrequency: IssueFrequency; safetyConcern: string;
  preferredDate: string; timeSlot: string; isCustomTime: boolean; customTime: string;
  couponCode: string;
}

export type UpdateField = <K extends keyof RegistrationFormState>(key: K, value: RegistrationFormState[K]) => void;

// The service a registration is for: a live navbar link, or — when editing a
// registration whose link was since removed — the copy stored on it.
export interface SelectedService {
  id?: string;
  name: string;
  path: string;
  category?: string;
}

export function emptyFormState(): RegistrationFormState {
  return {
    fullName: '', email: '', phone: '', altPhone: '',
    address: '', pincode: '', city: '', state: '',
    language: 'English', heardFrom: '', referenceName: '', instructions: '',
    serviceId: '',
    brand: '', modelNumber: '', applianceType: '', capacity: '',
    issues: [], issueDescription: '', issueFrequency: 'Always', safetyConcern: '',
    preferredDate: todayISO(), timeSlot: TIME_SLOTS[2], isCustomTime: false, customTime: '',
    couponCode: '',
  };
}

export function formStateFromRegistration(r: Registration): RegistrationFormState {
  const isSlot = !r.timeSlot || TIME_SLOTS.includes(r.timeSlot);
  return {
    fullName: r.fullName, email: r.email, phone: r.phone, altPhone: r.altPhone ?? '',
    address: r.address, pincode: r.pincode, city: r.city, state: r.state,
    language: r.language ?? 'English', heardFrom: r.heardFrom ?? '', referenceName: r.referenceName ?? '',
    instructions: r.instructions ?? '',
    serviceId: r.serviceId ?? '',
    brand: r.brand ?? '', modelNumber: r.modelNumber ?? '', applianceType: r.applianceType ?? '', capacity: r.capacity ?? '',
    issues: r.issues ?? [], issueDescription: r.issueDescription, issueFrequency: r.issueFrequency ?? 'Always',
    safetyConcern: r.safetyConcern ?? '',
    preferredDate: toISODate(r.preferredDate),
    timeSlot: isSlot ? (r.timeSlot ?? TIME_SLOTS[2]) : TIME_SLOTS[2],
    isCustomTime: !isSlot,
    customTime: isSlot ? '' : parseClockTime(r.timeSlot ?? ''),
    couponCode: r.couponCode ?? '',
  };
}

export function visitTimeLabel(form: RegistrationFormState) {
  if (!form.isCustomTime) return form.timeSlot;
  return form.customTime ? formatClockTime(form.customTime) : '';
}

// Blank optional fields are sent as "" on edit so a cleared value is actually
// cleared, and left out on create.
export function buildPayload(
  form: RegistrationFormState,
  service: SelectedService,
  config: IssueConfig,
  mode: 'create' | 'edit',
): RegistrationInput {
  const optional = (value: string) => {
    const trimmed = value.trim();
    return trimmed || (mode === 'edit' ? '' : undefined);
  };

  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone,
    altPhone: optional(form.altPhone),
    address: form.address.trim(),
    pincode: form.pincode,
    city: form.city.trim(),
    state: form.state,
    language: optional(form.language),
    heardFrom: optional(form.heardFrom),
    referenceName: optional(REFERENCE_SOURCES.includes(form.heardFrom) ? form.referenceName : ''),
    instructions: optional(form.instructions),
    serviceId: service.id,
    serviceName: service.name,
    serviceCategory: service.category,
    brand: optional(config.showBrand ? form.brand : ''),
    modelNumber: optional(config.showBrand ? form.modelNumber : ''),
    applianceType: optional(form.applianceType),
    capacity: optional(config.sizeOptions ? form.capacity : ''),
    issues: form.issues,
    issueDescription: form.issueDescription.trim(),
    issueFrequency: form.issueFrequency,
    safetyConcern: optional(form.safetyConcern),
    preferredDate: form.preferredDate || undefined,
    timeSlot: optional(visitTimeLabel(form)),
    couponCode: optional(form.couponCode.toUpperCase()),
  };
}
