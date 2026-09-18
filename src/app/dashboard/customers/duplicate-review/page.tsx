'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { useCustomerDuplicateCheck } from '@/lib/hooks/useCustomers';

// The backend has no persisted "duplicate queue" — GET /customers/duplicates
// checks a specific set of candidate fields (mobile/gstin/businessName/name)
// against existing records on demand, per docs/04 M5. This is a manual
// duplicate-checker tool, not an automatic review inbox.
export default function DuplicateReviewPage() {
  const [searchParams, setSearchParams] = useState<{ mobile?: string; gstin?: string; businessName?: string; name?: string }>({});
  const { data: matches, isLoading, isFetched } = useCustomerDuplicateCheck(searchParams);

  const onSubmit = (formData: FormData) => {
    setSearchParams({
      name: (formData.get('name') as string) || undefined,
      mobile: (formData.get('mobile') as string) || undefined,
      gstin: (formData.get('gstin') as string) || undefined,
      businessName: (formData.get('businessName') as string) || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="pb-1 mb-1.5 border-b border-border/50">
        <h1 className="text-lg font-medium tracking-tight text-foreground">Duplicate Check</h1>
          <p className="text-[13px] text-muted-foreground">Check whether a name, mobile, GSTIN, or business name already matches an existing customer.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Criteria</CardTitle>
          <CardDescription>Fill in any of the fields below — matches are checked against existing customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => onSubmit(formData)}
            className="grid md:grid-cols-2 gap-4"
          >
            <AppFormField name="name" label="Name" placeholder="e.g. Ramesh Singh" />
            <AppFormField name="mobile" label="Mobile" placeholder="e.g. 9876543210" />
            <AppFormField name="businessName" label="Business Name" placeholder="e.g. Hotel Taj" />
            <AppFormField name="gstin" label="GSTIN" placeholder="e.g. 07AAACH1234M1Z1" />
            <div className="md:col-span-2">
              <Button type="submit">Check for Duplicates</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center text-muted-foreground p-8">Checking...</div>}

      {isFetched && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            {matches && matches.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {matches.map((m) => (
                  <Link key={m._id} href={`/dashboard/customers/${m._id}`} className="rounded-lg border p-4 space-y-1 hover:border-primary/50 block">
                    <div className="font-semibold text-base">{m.name}</div>
                    {m.businessName && <div className="text-sm text-muted-foreground">{m.businessName}</div>}
                    <div className="text-sm">Mobile: {m.contacts?.[0]?.mobile || 'N/A'}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No potential duplicates found for these criteria.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
