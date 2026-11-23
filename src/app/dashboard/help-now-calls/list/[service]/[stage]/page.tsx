'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { RegistrationList } from '@/components/registrations/list/RegistrationList';
import { STAGE_SLUGS, StageSlug } from '@/lib/registrations/constants';

// /dashboard/help-now-calls/list/[service]/[stage]
//   service: a Help Now service slug (e.g. "dish-washing"), or "all"
//   stage:   all | new | active | pending | reopen | closed | cancelled
export default function HelpNowCallListPage({ params }: { params: Promise<{ service: string; stage: string }> }) {
  const { service, stage } = use(params);
  if (!STAGE_SLUGS.includes(stage as StageSlug)) notFound();

  // key: fresh filters / page / selection whenever the service or stage changes.
  return <RegistrationList key={`help-now/${service}/${stage}`} categorySlug={service} stageSlug={stage as StageSlug} helpNow />;
}
