'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Image as ImageIcon, List, Plus, Save, Trash2, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  createDefaultPageContent,
  ServicePage,
  ServicePageInput,
  ServicePageOptionService,
  useSaveServicePage,
  useServicePage,
  useServicePageOptions,
} from '@/lib/hooks/useWebsitePages';

const FIELD = 'w-full border-2 border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 outline-none transition-colors focus:border-[#3e8914]';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500';

function clonePageInput(page: ServicePage): ServicePageInput {
  return {
    slug: page.slug,
    heroImage: page.heroImage ?? '',
    heroEyebrow: page.heroEyebrow,
    heroTitle: page.heroTitle,
    heroHighlight: page.heroHighlight,
    heroDescription: page.heroDescription,
    heroFeatures: page.heroFeatures.map((item) => ({ ...item })),
    walkthroughEyebrow: page.walkthroughEyebrow,
    walkthroughTitle: page.walkthroughTitle,
    walkthroughHighlight: page.walkthroughHighlight,
    walkthroughDescription: page.walkthroughDescription,
    steps: page.steps.map((item) => ({ ...item })),
    statsTitle: page.statsTitle,
    statsHighlight: page.statsHighlight,
    stats: page.stats.map((item) => ({ ...item })),
    bannerEyebrow: page.bannerEyebrow,
    bannerTitle: page.bannerTitle,
    bannerHighlight: page.bannerHighlight,
    bannerDescription: page.bannerDescription,
    bannerImage: page.bannerImage ?? '',
    areasTitle: page.areasTitle,
    areasHighlight: page.areasHighlight,
    areasDescription: page.areasDescription,
    areas: [...page.areas],
    status: page.status,
  };
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={FIELD} />
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`${FIELD} resize-y`} />
    </div>
  );
}

function ImagePicker({
  label,
  preview,
  onFile,
  onClear,
}: {
  label: string;
  preview?: string;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="relative flex min-h-28 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 p-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
        />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-28 w-full object-cover" />
            <button
              type="button"
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClear(); }}
              className="absolute right-2 top-2 z-20 rounded-full bg-red-500 p-1.5 text-white shadow-md hover:bg-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="text-center text-gray-400">
            <Upload className="mx-auto h-7 w-7" />
            <p className="mt-1 text-[10px] font-bold uppercase">Upload JPG, PNG or WebP</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 border-b-2 border-gray-100 pb-3">
        <h2 className="text-base font-bold text-[#233D4D]">{title}</h2>
        <p className="mt-0.5 text-[11px] font-medium text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function PageEditor({ service, existingPage }: { service: ServicePageOptionService; existingPage: ServicePage | null }) {
  const [form, setForm] = useState<ServicePageInput>(() => existingPage ? clonePageInput(existingPage) : createDefaultPageContent(service.name, service.defaultSlug));
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState(form.heroImage || '');
  const [bannerPreview, setBannerPreview] = useState(form.bannerImage || '');
  const savePage = useSaveServicePage();
  const imageUpload = useUploadFile('CITY_CALLS_SERVICE_PAGE', existingPage?._id ?? 'new', { skipGlobalToast: true });
  const isSaving = savePage.isPending || imageUpload.isPending;

  const setField = <K extends keyof ServicePageInput>(key: K, value: ServicePageInput[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  async function handleSave() {
    const cleanSlug = form.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const cleanAreas = form.areas.map((area) => area.trim()).filter(Boolean);
    if (!cleanSlug || !form.heroTitle.trim() || cleanAreas.length === 0) {
      void Swal.fire({ icon: 'warning', title: 'Required fields missing', text: 'Page slug, hero title and at least one service area are required.', confirmButtonColor: '#3e8914' });
      return;
    }

    try {
      let payload: ServicePageInput = { ...form, slug: cleanSlug, areas: cleanAreas };
      let saved = await savePage.mutateAsync({ serviceId: service.id, input: payload });

      if (heroFile) {
        const uploaded = await imageUpload.upload(heroFile, 'WEBSITE_PAGE_HERO_IMAGE', saved._id);
        payload = { ...payload, heroImage: uploaded.url };
      }
      if (bannerFile) {
        const uploaded = await imageUpload.upload(bannerFile, 'WEBSITE_PAGE_BANNER_IMAGE', saved._id);
        payload = { ...payload, bannerImage: uploaded.url };
      }
      if (heroFile || bannerFile) saved = await savePage.mutateAsync({ serviceId: service.id, input: payload });

      setForm(clonePageInput(saved));
      setHeroFile(null);
      setBannerFile(null);
      setHeroPreview(saved.heroImage ?? '');
      setBannerPreview(saved.bannerImage ?? '');
      void Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Service page saved successfully', timer: 2200, showConfirmButton: false });
    } catch {
      void Swal.fire({ icon: 'error', title: 'Save failed', text: 'The service page could not be saved. Please check the fields and try again.', confirmButtonColor: '#3e8914' });
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Page Setup" description="The slug is filled from the selected navbar link and remains editable.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <FormField label="Selected Page" value={service.name} onChange={() => undefined} />
          </div>
          <div className="md:col-span-1">
            <FormField label="Page Slug *" value={form.slug} onChange={(value) => setField('slug', value)} placeholder="refrigerator-service" />
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select value={form.status} onChange={(event) => setField('status', event.target.value as ServicePageInput['status'])} className={FIELD}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Hero Section" description="Top banner content, highlight colour text and four trust points.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <ImagePicker
            label="Hero Background Image"
            preview={heroPreview}
            onFile={(file) => { setHeroFile(file); setHeroPreview(URL.createObjectURL(file)); }}
            onClear={() => { setHeroFile(null); setHeroPreview(''); setField('heroImage', ''); }}
          />
          <div className="space-y-4 lg:col-span-2">
            <FormField label="Subtitle / Eyebrow" value={form.heroEyebrow} onChange={(value) => setField('heroEyebrow', value)} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Hero Title *" value={form.heroTitle} onChange={(value) => setField('heroTitle', value)} />
              <FormField label="Highlight Word" value={form.heroHighlight} onChange={(value) => setField('heroHighlight', value)} />
            </div>
            <TextAreaField label="Short Description" value={form.heroDescription} onChange={(value) => setField('heroDescription', value)} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {form.heroFeatures.map((feature, index) => (
            <div key={index} className="border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-[10px] font-black uppercase text-[#3e8914]">Feature {index + 1}</p>
              <div className="space-y-2">
                <input value={feature.title} onChange={(event) => setField('heroFeatures', form.heroFeatures.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className={FIELD} placeholder="Expert" />
                <input value={feature.subtitle} onChange={(event) => setField('heroFeatures', form.heroFeatures.map((item, itemIndex) => itemIndex === index ? { ...item, subtitle: event.target.value } : item))} className={FIELD} placeholder="Technicians" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How It Works" description="Interactive walkthrough heading and its four editable steps.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField label="Section Subtitle" value={form.walkthroughEyebrow} onChange={(value) => setField('walkthroughEyebrow', value)} />
          <FormField label="Section Title" value={form.walkthroughTitle} onChange={(value) => setField('walkthroughTitle', value)} />
          <FormField label="Highlight Word" value={form.walkthroughHighlight} onChange={(value) => setField('walkthroughHighlight', value)} />
          <div className="md:col-span-3">
            <TextAreaField label="Section Description" value={form.walkthroughDescription} onChange={(value) => setField('walkthroughDescription', value)} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {form.steps.map((step, index) => (
            <div key={index} className="border-2 border-gray-100 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FormField label={`Step ${index + 1} Label`} value={step.badge} onChange={(value) => setField('steps', form.steps.map((item, itemIndex) => itemIndex === index ? { ...item, badge: value } : item))} />
                <div className="md:col-span-2">
                  <FormField label="Step Title" value={step.title} onChange={(value) => setField('steps', form.steps.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item))} />
                </div>
                <div className="md:col-span-3">
                  <TextAreaField label="Step Description" value={step.description} onChange={(value) => setField('steps', form.steps.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item))} rows={2} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Trust Counters" description="Heading and four counters shown in the trusted-by-thousands block.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Counter Section Title" value={form.statsTitle} onChange={(value) => setField('statsTitle', value)} />
          <FormField label="Highlight Word" value={form.statsHighlight} onChange={(value) => setField('statsHighlight', value)} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {form.stats.map((stat, index) => (
            <div key={index} className="border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-[10px] font-black uppercase text-[#3e8914]">Counter {index + 1}</p>
              <div className="space-y-2">
                <input value={stat.value} onChange={(event) => setField('stats', form.stats.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} className={FIELD} placeholder="10K+" />
                <input value={stat.label} onChange={(event) => setField('stats', form.stats.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} className={FIELD} placeholder="Happy Customers" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Repair Banner" description="Lower image banner with editable text and highlighted words.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <ImagePicker
            label="Bottom Banner Image"
            preview={bannerPreview}
            onFile={(file) => { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }}
            onClear={() => { setBannerFile(null); setBannerPreview(''); setField('bannerImage', ''); }}
          />
          <div className="space-y-4 lg:col-span-2">
            <FormField label="Subtitle" value={form.bannerEyebrow} onChange={(value) => setField('bannerEyebrow', value)} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Banner Title" value={form.bannerTitle} onChange={(value) => setField('bannerTitle', value)} />
              <FormField label="Highlight Word" value={form.bannerHighlight} onChange={(value) => setField('bannerHighlight', value)} />
            </div>
            <TextAreaField label="Banner Description" value={form.bannerDescription} onChange={(value) => setField('bannerDescription', value)} />
          </div>
        </div>
      </Section>

      <Section title="Service Areas" description="Heading, description and editable Ghaziabad location list.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Section Title" value={form.areasTitle} onChange={(value) => setField('areasTitle', value)} />
          <FormField label="Highlight Word" value={form.areasHighlight} onChange={(value) => setField('areasHighlight', value)} />
          <div className="md:col-span-2">
            <TextAreaField label="Section Description" value={form.areasDescription} onChange={(value) => setField('areasDescription', value)} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {form.areas.map((area, index) => (
            <div key={index} className="flex gap-2">
              <input value={area} onChange={(event) => setField('areas', form.areas.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className={FIELD} />
              <button type="button" onClick={() => setField('areas', form.areas.filter((_, itemIndex) => itemIndex !== index))} className="border-2 border-red-200 px-2 text-red-500 hover:bg-red-50" title="Remove location">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setField('areas', [...form.areas, ''])} className="mt-4 inline-flex items-center gap-2 border-2 border-[#3e8914] px-4 py-2 text-xs font-bold text-[#3e8914] hover:bg-[#3e8914]/5">
          <Plus className="h-4 w-4" /> Add Location
        </button>
      </Section>

      <div className="flex justify-end border-t-2 border-gray-200 bg-white py-5">
        <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-[#3e8914] px-7 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg hover:bg-[#347311] disabled:opacity-50">
          {isSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving...' : existingPage ? 'Update Page' : 'Create Page'}
        </button>
      </div>
    </div>
  );
}

export default function AddPagePage() {
  return (
    <Suspense fallback={null}>
      <AddPageContent />
    </Suspense>
  );
}

function AddPageContent() {
  const { data: menus, isLoading: optionsLoading } = useServicePageOptions();
  // "Edit" in Page List opens this screen with ?serviceId=… preselected.
  const searchParams = useSearchParams();
  const [selectedServiceId, setSelectedServiceId] = useState(() => searchParams.get('serviceId') ?? '');
  const selectedService = useMemo(
    () => menus?.flatMap((menu) => menu.services).find((service) => service.id === selectedServiceId),
    [menus, selectedServiceId]
  );
  const { data: page, isLoading: pageLoading } = useServicePage(selectedServiceId);

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -ml-3 -mt-3 bg-white">
      <div className="min-h-screen bg-white p-6" style={{ zoom: 0.75 }}>
        <div className="mb-5 flex items-center justify-between border-b-2 border-black pb-3">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide text-[#3e8914]">Add Page</h1>
            <p className="mt-0.5 text-sm text-gray-500">Create and manage complete frontend service pages from navbar links.</p>
          </div>
          <Link
            href="/dashboard/pages/list"
            className="flex items-center gap-2 border-2 border-[#233D4D] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#233D4D] hover:bg-[#233D4D] hover:text-white"
          >
            <List className="h-4 w-4" /> Page List
          </Link>
        </div>

        <div className="mb-6 border-2 border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3 border-b-2 border-gray-100 pb-3">
            <div className="bg-[#3e8914]/10 p-2"><ImageIcon className="h-4 w-4 text-[#3e8914]" /></div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select Page</h2>
              <p className="text-[11px] text-gray-500">Options come directly from Navbar List Management.</p>
            </div>
          </div>
          <label className={LABEL}>Select Page *</label>
          <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} disabled={optionsLoading} className={`${FIELD} disabled:bg-gray-100`}>
            <option value="">-- Select a Page --</option>
            {(menus ?? []).map((menu) => (
              <optgroup key={menu.id} label={menu.name}>
                {menu.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {menu.name} / {service.name}{service.page ? ` — ${service.page.slug}` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!optionsLoading && (menus ?? []).every((menu) => menu.services.length === 0) && (
            <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">Create a navbar menu and navlink first. It will then appear here automatically.</p>
          )}
        </div>

        {!selectedService ? (
          <div className="flex min-h-56 items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 text-sm font-semibold text-gray-400">Select a navbar page to load the content editor.</div>
        ) : pageLoading ? (
          <div className="flex min-h-56 items-center justify-center text-sm font-semibold text-gray-500">Loading page content...</div>
        ) : (
          <PageEditor key={selectedService.id} service={selectedService} existingPage={page ?? null} />
        )}
      </div>
    </div>
  );
}
