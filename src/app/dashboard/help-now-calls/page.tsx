import { redirect } from 'next/navigation';
import { helpNowCallListPath } from '@/lib/registrations/constants';

// Help Now Call Section opens on All Categories → New Call.
export default function HelpNowCallsPage() {
  redirect(helpNowCallListPath());
}
