'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { List, MapPin } from 'lucide-react';

import { LocationPageForm } from '@/components/location-pages/LocationPageForm';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { useLocationPage } from '@/lib/hooks/useLocationPages';

// Blog Section → Add Location Page (or ?editId=… to edit one from Location Page List).
function AddLocationPageInner() {
  const router = useRouter();
  const editId = useSearchParams().get('editId');
  const { data: existing, isLoading, isError } = useLocationPage(editId);

  let body;
  if (editId && isLoading) {
    body = <div className="flex min-h-[40vh] items-center justify-center"><MapPin className="h-6 w-6 animate-pulse text-gray-300" /></div>;
  } else if (editId && (isError || !existing)) {
    body = <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-red-600">Location page not found.</div>;
  } else {
    body = <LocationPageForm key={existing?._id ?? 'new'} existing={existing} />;
  }

  return (
    <PageShell
      title={editId ? 'Update Location Page' : 'Add Location Page'}
      description="City pages for SEO — e.g. citycalls.in/refrigerator-service-in-noida"
      actions={
        <button
          type="button"
          onClick={() => router.push('/dashboard/location-pages/list')}
          className="flex items-center gap-1.5 rounded-[6px] bg-[#4B1426] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] hover:bg-[#3a0f1d]"
        >
          <List className="h-3.5 w-3.5" /> Location Page List
        </button>
      }
    >
      {body}
    </PageShell>
  );
}

export default function AddLocationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><MapPin className="h-6 w-6 animate-pulse text-gray-300" /></div>}>
      <AddLocationPageInner />
    </Suspense>
  );
}
