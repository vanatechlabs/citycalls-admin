'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RegistrationForm } from '@/components/registrations/form/RegistrationForm';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { useCallEnquiry } from '@/lib/hooks/useCallEnquiries';

// `?enquiryId=…` (Call Enquiry List → "Move to Service Call") opens the form
// with that enquiry's name, mobile, service and source filled in.
function NewRegistrationInner() {
  const enquiryId = useSearchParams().get('enquiryId');
  const { data: enquiry, isLoading, isError } = useCallEnquiry(enquiryId);

  let body;
  if (enquiryId && isLoading) body = <p className="py-16 text-center text-sm text-[#6c7587]">Loading enquiry...</p>;
  else if (enquiryId && (isError || !enquiry)) body = <p className="py-16 text-center text-sm font-bold text-red-600">Enquiry not found.</p>;
  else body = <RegistrationForm key={enquiry?._id ?? 'new'} enquiry={enquiry} />;

  return (
    <PageShell
      title="Add New Call"
      description={
        enquiry
          ? `From call enquiry ${enquiry.enquiryNo} (${enquiry.name}) — add the address and issue details, then save.`
          : 'Register a customer for a service — personal details, issue details, visit time and coupon.'
      }
    >
      {body}
    </PageShell>
  );
}

export default function NewRegistrationPage() {
  return (
    <Suspense fallback={null}>
      <NewRegistrationInner />
    </Suspense>
  );
}
