'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RegistrationForm } from '@/components/registrations/form/RegistrationForm';
import { PageShell } from '@/components/registrations/shared/PageShell';
import { useCallEnquiry } from '@/lib/hooks/useCallEnquiries';
import { useCustomerProfile } from '@/lib/hooks/useCustomerProfiles';

// `?enquiryId=…` (Call Enquiry List → "Move to Service Call") opens the form
// with that enquiry's name, mobile, service and source filled in.
// `?customer=CC-000123` (customer profile → New Service Call) fills in that
// customer's contact details and latest address.
function NewRegistrationInner() {
  const params = useSearchParams();
  const enquiryId = params.get('enquiryId');
  const customerCode = enquiryId ? null : params.get('customer');
  const { data: enquiry, isLoading, isError } = useCallEnquiry(enquiryId);
  const { data: profile, isLoading: customerLoading, isError: customerError } = useCustomerProfile(customerCode);
  const customer = profile?.customer;

  let body;
  if (enquiryId && isLoading) body = <p className="py-16 text-center text-sm text-[#6c7587]">Loading enquiry...</p>;
  else if (enquiryId && (isError || !enquiry)) body = <p className="py-16 text-center text-sm font-bold text-red-600">Enquiry not found.</p>;
  else if (customerCode && customerLoading) body = <p className="py-16 text-center text-sm text-[#6c7587]">Loading customer...</p>;
  else if (customerCode && (customerError || !customer)) body = <p className="py-16 text-center text-sm font-bold text-red-600">Customer not found.</p>;
  else body = <RegistrationForm key={enquiry?._id ?? customer?.customerCode ?? 'new'} enquiry={enquiry} customer={customer} />;

  return (
    <PageShell
      title="Add New Call"
      description={
        enquiry
          ? `From call enquiry ${enquiry.enquiryNo} (${enquiry.name}) — add the address and issue details, then save.`
          : customer
            ? `For ${customer.name} (${customer.customerCode}) — details filled in from their profile; check the address, add the issue, then save.`
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
