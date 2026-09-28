import type { IssueFrequency, RegistrationStatus } from '@/lib/hooks/useRegistrations';

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
// Short codes branch coverage may store instead of the full state name.
const STATE_CODES: Record<string, string> = {
  UP: 'Uttar Pradesh', DL: 'Delhi', HR: 'Haryana', PB: 'Punjab', RJ: 'Rajasthan', UK: 'Uttarakhand',
  UT: 'Uttarakhand', MH: 'Maharashtra', KA: 'Karnataka', TN: 'Tamil Nadu', GJ: 'Gujarat', MP: 'Madhya Pradesh',
  WB: 'West Bengal', BR: 'Bihar', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', CH: 'Chandigarh',
};

// Maps a state from the pincode lookup (India Post name, or a branch's
// coverage code) onto an option of the STATES dropdown; '' if none matches.
export function matchState(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/&/g, 'and').replace(/\s+/g, ' ');
  const code = STATE_CODES[cleaned.toUpperCase()];
  if (code) return code;
  if (/^nct of delhi$|^new delhi$/i.test(cleaned)) return 'Delhi';
  return STATES.find((s) => s.toLowerCase() === cleaned.toLowerCase()) ?? '';
}

export const LANGUAGES = ['English', 'Hindi'];
export const HEARD_FROM = ['Google', 'Facebook', 'WhatsApp', 'LinkedIn', 'Just Dial', 'TradeMart', 'Friend', 'Other'];
export const REFERENCE_SOURCES = ['Friend', 'Other'];
export const FREQUENCIES: IssueFrequency[] = ['Always', 'Sometimes', 'Occasionally', 'Once'];
export const SAFETY_CONCERNS = ['Electrical Hazard', 'Gas / Water Leakage', 'No safety concern'];
export const TIME_SLOTS = [
  '09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM', '01:00 PM - 03:00 PM',
  '03:00 PM - 05:00 PM', '05:00 PM - 07:00 PM', '07:00 PM - 09:00 PM',
];
// Used when the catalog's Brands & Models list is empty or not viewable.
export const FALLBACK_BRANDS = ['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Haier', 'Bosch', 'Voltas', 'Daikin', 'IFB', 'Panasonic'];

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const REGISTRATION_STATUSES: RegistrationStatus[] = ['PENDING', 'ACTIVE', 'COMPLETED'];

// ─── List pages: /dashboard/registrations/list/[category]/[stage] ──────────
// category is a Navbar List menu slug, or "all"; stage is one of STAGE_SLUGS.
export type StageSlug = 'all' | 'pending' | 'active' | 'completed';
export const STAGE_SLUGS: StageSlug[] = ['all', 'pending', 'active', 'completed'];
export const ALL_CATEGORIES = 'all';

export const STAGE_BY_SLUG: Record<StageSlug, RegistrationStatus | undefined> = {
  all: undefined, pending: 'PENDING', active: 'ACTIVE', completed: 'COMPLETED',
};
export const STAGE_TITLE: Record<StageSlug, string> = {
  all: 'All Registration', pending: 'Pending Registration', active: 'Active Registration', completed: 'Completed Registration',
};
export const STAGE_TAB_LABEL: Record<StageSlug, string> = { all: 'All', pending: 'Pending', active: 'Active', completed: 'Completed' };

export function stageSlugOf(status: RegistrationStatus): StageSlug {
  return status.toLowerCase() as StageSlug;
}

export function registrationListPath(categorySlug: string = ALL_CATEGORIES, stage: StageSlug = 'pending') {
  return `/dashboard/registrations/list/${categorySlug}/${stage}`;
}

// Everything the UI needs per status: badge colours, its title, and the
// action that moves a registration on to the next stage (with a note).
export const STATUS_META: Record<RegistrationStatus, {
  label: string;
  badge: string;
  listTitle: string;
  next?: { status: 'ACTIVE' | 'COMPLETED'; action: string; noteTitle: string; notePlaceholder: string };
}> = {
  PENDING: {
    label: 'Pending',
    badge: 'border-orange-300 bg-orange-50 text-orange-700',
    listTitle: 'Pending Registration',
    next: {
      status: 'ACTIVE',
      action: 'Move to Active',
      noteTitle: 'Move to Active Registration',
      notePlaceholder: 'e.g. Called customer, technician Ramesh assigned for 29 Sep 1–3 PM',
    },
  },
  ACTIVE: {
    label: 'Active',
    badge: 'border-indigo-300 bg-indigo-50 text-indigo-700',
    listTitle: 'Active Registration',
    next: {
      status: 'COMPLETED',
      action: 'Mark as Completed',
      noteTitle: 'Complete Registration',
      notePlaceholder: 'e.g. Gas refilled, compressor checked, customer paid ₹1,200 by UPI',
    },
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]',
    listTitle: 'Completed Registration',
  },
};
