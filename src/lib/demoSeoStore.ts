// Client-only demo data layer for the SEO Manager pages (Add Meta / Meta
// List) — there is no backend SEO module yet, so this persists to
// localStorage purely so the two separate routes can share the same list,
// the way a real API would. Swap for real API calls once a backend module
// exists.
export type SeoStatus = 'Active' | 'Inactive';

export interface SeoMeta {
  id: string;
  page: string;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  openGraphTags: string;
  schemaMarkup: string;
  canonicalTag: string;
  ogImagePreview: string | null;
  status: SeoStatus;
  updatedBy: string;
  updatedAt: string;
}

export const WEBSITE_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/about-us', name: 'About Us' },
  { path: '/services', name: 'Services' },
  { path: '/contact-us', name: 'Contact Us' },
  { path: '/beauty-salon', name: 'Beauty & Salon' },
  { path: '/blog', name: 'Blog' },
  { path: '/careers', name: 'Careers' },
  { path: '/faq', name: 'FAQ' },
  { path: '/terms-and-conditions', name: 'Terms & Conditions' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
];

export function pageName(path: string) {
  return WEBSITE_PAGES.find((p) => p.path === path)?.name ?? path;
}

const STORAGE_KEY = 'citycalls-demo-seo-meta';

const SEED: SeoMeta[] = [
  {
    id: 'home',
    page: '/',
    metaTitle: 'CityCalls — On-Demand Home Services Near You',
    metaKeywords: 'home services, appliance repair, cleaning, citycalls',
    metaDescription: 'Book trusted technicians for appliance repair, cleaning, and more — same-day service across your city.',
    openGraphTags: '<meta property="og:title" content="CityCalls" />',
    schemaMarkup: '{"@context":"https://schema.org","@type":"Organization","name":"CityCalls"}',
    canonicalTag: 'https://citycalls.in/',
    ogImagePreview: null,
    status: 'Active',
    updatedBy: 'Admin User',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'about-us',
    page: '/about-us',
    metaTitle: 'About CityCalls',
    metaKeywords: 'about citycalls, home service company',
    metaDescription: 'Learn how CityCalls connects households with verified, trained technicians across every major service category.',
    openGraphTags: '',
    schemaMarkup: '',
    canonicalTag: 'https://citycalls.in/about-us',
    ogImagePreview: null,
    status: 'Active',
    updatedBy: 'Admin User',
    updatedAt: new Date().toISOString(),
  },
];

export function getSeoMetaList(): SeoMeta[] {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    return JSON.parse(raw) as SeoMeta[];
  } catch {
    return SEED;
  }
}

export function saveSeoMetaList(list: SeoMeta[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getSeoMetaById(id: string): SeoMeta | undefined {
  return getSeoMetaList().find((m) => m.id === id);
}

export function upsertSeoMeta(meta: SeoMeta) {
  const list = getSeoMetaList();
  const idx = list.findIndex((m) => m.id === meta.id);
  if (idx >= 0) list[idx] = meta;
  else list.push(meta);
  saveSeoMetaList(list);
}

export function deleteSeoMeta(id: string) {
  saveSeoMetaList(getSeoMetaList().filter((m) => m.id !== id));
}
