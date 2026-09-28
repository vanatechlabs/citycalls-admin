'use client';

import { RegistrationForm } from '@/components/registrations/form/RegistrationForm';
import { PageShell } from '@/components/registrations/shared/PageShell';

export default function NewRegistrationPage() {
  return (
    <PageShell
      title="New Registration"
      description="Register a customer for a service — personal details, issue details, visit time and coupon."
    >
      <RegistrationForm />
    </PageShell>
  );
}
