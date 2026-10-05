import type { IssueFrequency, MoveStatus, RegistrationStatus } from '@/lib/hooks/useRegistrations';

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

// Call lifecycle (same as the backend): every move is made with a note.
//   New → Active / Pending / Cancelled
//   Active ⇄ Pending, either → Closed (work done)
//   Closed → Reopened → Active / Pending / Closed
export const REGISTRATION_STATUSES: RegistrationStatus[] = ['NEW', 'ACTIVE', 'PENDING', 'REOPENED', 'CLOSED', 'CANCELLED'];

export const STATUS_TRANSITIONS: Record<RegistrationStatus, MoveStatus[]> = {
  NEW: ['ACTIVE', 'PENDING', 'CANCELLED'],
  ACTIVE: ['PENDING', 'CLOSED'],
  PENDING: ['ACTIVE', 'CLOSED'],
  REOPENED: ['ACTIVE', 'PENDING', 'CLOSED'],
  CLOSED: ['REOPENED'],
  CANCELLED: [],
};

// ─── List pages: /dashboard/registrations/list/[category]/[stage] ──────────
// category is a Navbar List menu slug, or "all"; stage is one of STAGE_SLUGS.
export type StageSlug = 'all' | 'new' | 'active' | 'pending' | 'reopen' | 'closed' | 'cancelled';
export const STAGE_SLUGS: StageSlug[] = ['all', 'new', 'active', 'pending', 'reopen', 'closed', 'cancelled'];
// The sidebar lists every stage except "all" (that one is a tab on the page).
export const SIDEBAR_STAGE_SLUGS: StageSlug[] = STAGE_SLUGS.filter((slug) => slug !== 'all');
export const ALL_CATEGORIES = 'all';

export const STAGE_BY_SLUG: Record<StageSlug, RegistrationStatus | undefined> = {
  all: undefined, new: 'NEW', active: 'ACTIVE', pending: 'PENDING', reopen: 'REOPENED', closed: 'CLOSED', cancelled: 'CANCELLED',
};
const SLUG_BY_STATUS: Record<RegistrationStatus, StageSlug> = {
  NEW: 'new', ACTIVE: 'active', PENDING: 'pending', REOPENED: 'reopen', CLOSED: 'closed', CANCELLED: 'cancelled',
};
export const STAGE_TITLE: Record<StageSlug, string> = {
  all: 'All Calls', new: 'New Call', active: 'Active Call', pending: 'Pending Call',
  reopen: 'Reopen Call', closed: 'Closed Call', cancelled: 'Cancelled Call',
};
export const STAGE_TAB_LABEL: Record<StageSlug, string> = {
  all: 'All', new: 'New', active: 'Active', pending: 'Pending', reopen: 'Reopen', closed: 'Closed', cancelled: 'Cancelled',
};

export function stageSlugOf(status: RegistrationStatus): StageSlug {
  return SLUG_BY_STATUS[status];
}

export function registrationListPath(categorySlug: string = ALL_CATEGORIES, stage: StageSlug = 'new') {
  return `/dashboard/registrations/list/${categorySlug}/${stage}`;
}

// Everything the UI needs per status: badge colours, its list title, and —
// for statuses a call can be moved to — the action wording for the note popup.
export const STATUS_META: Record<RegistrationStatus, {
  label: string;
  badge: string;
  listTitle: string;
  // Solid button colour for the "move to this status" action.
  button: string;
  action: string;
  notePlaceholder: string;
}> = {
  NEW: {
    label: 'New',
    badge: 'border-sky-300 bg-sky-50 text-sky-700',
    listTitle: 'New Call',
    button: 'bg-sky-600 hover:bg-sky-700',
    action: 'New',
    notePlaceholder: '',
  },
  ACTIVE: {
    label: 'Active',
    badge: 'border-indigo-300 bg-indigo-50 text-indigo-700',
    listTitle: 'Active Call',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    action: 'Move to Active',
    notePlaceholder: 'e.g. Called customer, technician Ramesh assigned for 29 Sep 1–3 PM',
  },
  PENDING: {
    label: 'Pending',
    badge: 'border-orange-300 bg-orange-50 text-orange-700',
    listTitle: 'Pending Call',
    button: 'bg-orange-500 hover:bg-orange-600',
    action: 'Move to Pending',
    notePlaceholder: 'e.g. Customer asked to call back tomorrow / spare part on order',
  },
  REOPENED: {
    label: 'Reopened',
    badge: 'border-purple-300 bg-purple-50 text-purple-700',
    listTitle: 'Reopen Call',
    button: 'bg-purple-600 hover:bg-purple-700',
    action: 'Reopen Call',
    notePlaceholder: 'e.g. Cooling problem came back after 5 days — revisit needed',
  },
  CLOSED: {
    label: 'Closed',
    badge: 'border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]',
    listTitle: 'Closed Call',
    button: 'bg-[#3e8914] hover:bg-[#347311]',
    action: 'Close Call (work done)',
    notePlaceholder: 'e.g. Gas refilled, compressor checked, customer paid ₹1,200 by UPI',
  },
  CANCELLED: {
    label: 'Cancelled',
    badge: 'border-red-300 bg-red-50 text-red-700',
    listTitle: 'Cancelled Call',
    button: 'bg-red-600 hover:bg-red-700',
    action: 'Cancel Call',
    notePlaceholder: 'e.g. Customer no longer needs the service',
  },
};
