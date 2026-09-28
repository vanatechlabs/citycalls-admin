'use client';

import { use } from 'react';
import { RegistrationOverview } from '@/components/registrations/overview/RegistrationOverview';
import { RegistrationLoadState } from '@/components/registrations/shared/RegistrationLoadState';
import { useRegistration } from '@/lib/hooks/useRegistrations';

export default function RegistrationOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useRegistration(id);

  if (!data) return <RegistrationLoadState loading={isLoading} error={isError} />;
  return <RegistrationOverview registration={data} />;
}
