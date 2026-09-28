'use client';

import { use } from 'react';
import { RegistrationForm } from '@/components/registrations/form/RegistrationForm';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { RegistrationLoadState } from '@/components/registrations/shared/RegistrationLoadState';
import { useRegistration } from '@/lib/hooks/useRegistrations';

export default function EditRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useRegistration(id);

  if (!data) return <RegistrationLoadState loading={isLoading} error={isError} />;
  return (
    <PageShell title={`Edit Registration — ${data.registrationNo}`} description={`Update ${data.fullName}'s registration details.`}>
      {/* key: remount the form with fresh state if a different registration loads */}
      <RegistrationForm key={data._id} registration={data} />
    </PageShell>
  );
}
