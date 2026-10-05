'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { RegistrationList } from '@/components/registrations/list/RegistrationList';
import { STAGE_SLUGS, StageSlug } from '@/lib/registrations/constants';

// /dashboard/registrations/list/[category]/[stage]
//   category: a Navbar List menu slug, or "all"
//   stage:    all | new | active | pending | reopen | closed | cancelled
export default function RegistrationListPage({ params }: { params: Promise<{ category: string; stage: string }> }) {
  const { category, stage } = use(params);
  if (!STAGE_SLUGS.includes(stage as StageSlug)) notFound();

  // key: fresh filters / page / selection whenever the category or stage changes.
  return <RegistrationList key={`${category}/${stage}`} categorySlug={category} stageSlug={stage as StageSlug} />;
}
