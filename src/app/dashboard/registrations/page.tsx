import { redirect } from 'next/navigation';
import { registrationListPath } from '@/lib/registrations/constants';

// The bare /registrations URL opens All Categories → Pending.
export default function RegistrationsIndexPage() {
  redirect(registrationListPath());
}
