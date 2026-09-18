'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { Phone, MapPin, CheckCircle2, XCircle, Search, ArrowLeft } from 'lucide-react';

import { useCreateCall, CALL_TYPES, CALL_DIRECTIONS, CallType, CallDirection } from '@/lib/hooks/useCalls';
import {
  useLookupCustomerByMobile,
  useCreateCustomer,
  useAddCustomerAddress,
  useAddCustomerProduct,
  useCustomer,
  useFetchCustomer,
  useUpdateCustomer,
} from '@/lib/hooks/useCustomers';
import { useCheckPincode, AreaCheckResult, areaCityLabel } from '@/lib/hooks/useGeo';
import { useCreateServiceRequest } from '@/lib/hooks/useServiceRequests';
import { useCatalogServices } from '@/lib/hooks/useCatalogServices';
import { useMasters } from '@/lib/hooks/useMasters';
import { useBrands } from '@/lib/hooks/useBrands';

type Step = 'number' | 'pincode' | 'waitlist' | 'details';

interface DetailsFormValues {
  name: string;
  customerType: string;
  line1: string;
  line2: string;
  landmark: string;
  brandId: string;
  productTypeId: string;
  ageYears: string;
  serviceId: string;
  symptoms: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  appointmentSlot: string;
}

interface WaitlistFormValues {
  name: string;
  customerType: string;
  whatsappConsent: boolean;
  emailConsent: boolean;
}

export default function CallEntryPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('number');

  // --- Step 1: number + basic call metadata ---
  const [mobile, setMobile] = useState('');
  const [direction, setDirection] = useState<CallDirection>('INCOMING');
  const [callType, setCallType] = useState<CallType>('INITIAL');
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [noMatchFound, setNoMatchFound] = useState(false);

  const lookupMobile = useLookupCustomerByMobile();
  const fetchCustomer = useFetchCustomer();
  const { data: matchedCustomer } = useCustomer(matchedCustomerId ?? '');
  const { data: customerTypeMasters } = useMasters(['CUSTOMER_TYPE']);

  // --- Step 2: pincode + area check ---
  const [pincode, setPincode] = useState('');
  const [areaInfo, setAreaInfo] = useState<AreaCheckResult | null>(null);
  const checkPincode = useCheckPincode();

  const handleCheckArea = () => {
    checkPincode.mutate(pincode, {
      onSuccess: (result) => {
        setAreaInfo(result);
        // An already-matched customer (e.g. one with no saved address yet)
        // always stays on the 'details' step, even when this pincode isn't
        // serviceable — that step already knows how to show the "not
        // serviceable" choice while reusing matchedCustomerId. Routing them
        // to 'waitlist' instead would submit through the anonymous
        // new-customer form and create a duplicate customer record.
        setStep(result.serviceable || matchedCustomerId ? 'details' : 'waitlist');
      },
    });
  };

  const [existingCustomerError, setExistingCustomerError] = useState<string | null>(null);

  // Unsticks the wizard if fetchCustomer/checkPincode fails partway through
  // — without this, a match was found but the "Check Number" button stays
  // disabled forever with no error shown (matchedCustomerId is set, so the
  // button never re-enables), which looks exactly like "nothing happens."
  const resetMatch = () => {
    setMatchedCustomerId(null);
  };

  const handleCheckNumber = () => {
    setNoMatchFound(false);
    setExistingCustomerError(null);
    lookupMobile.mutate(mobile, {
      onSuccess: (matches) => {
        const match = matches.find((m) => m.contacts.some((c) => c.mobile === mobile)) ?? matches[0];
        if (!match) {
          setNoMatchFound(true);
          setStep('pincode');
          return;
        }
        setMatchedCustomerId(match._id);
        // Existing customers were previously skipping the area check
        // entirely (jumping straight to 'details' with no serviceability
        // info shown). Fetch the full record (with addresses) and run the
        // same real check against it before advancing — chained through
        // mutation callbacks rather than an effect on the useCustomer query.
        fetchCustomer.mutate(match._id, {
          onError: () => {
            setExistingCustomerError('Found this customer but could not load their details. Please try again.');
            resetMatch();
          },
          onSuccess: (customer) => {
            const addr = customer.addresses?.find((a) => a.isDefault) ?? customer.addresses?.[0];
            if (!addr?.pinCode) {
              // No address on file yet (e.g. a previously-waitlisted
              // customer calling back) — treat like a fresh number instead
              // of silently breaking later at submit time.
              setStep('pincode');
              return;
            }
            setPincode(addr.pinCode);
            checkPincode.mutate(addr.pinCode, {
              onError: () => {
                // Area check failed (e.g. network blip) — we already have
                // the customer's real data, so don't block on this; just
                // proceed without an area badge rather than getting stuck.
                setStep('details');
              },
              onSuccess: (result) => {
                setAreaInfo(result);
                setStep('details');
              },
            });
          },
        });
      },
    });
  };

  // --- Existing customer, area not serviceable: same address, or a
  // different pincode for this visit? Either way, reuses matchedCustomer —
  // never creates a duplicate.
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [altPincode, setAltPincode] = useState('');

  const handleCheckAltPincode = () => {
    checkPincode.mutate(altPincode, {
      onSuccess: (result) => {
        setAreaInfo(result);
        setPincode(altPincode);
        setUseNewAddress(true);
      },
    });
  };

  // --- Step "waitlist": out of service area ---
  const createCustomer = useCreateCustomer();
  const createCall = useCreateCall();
  const {
    register: registerWaitlist,
    handleSubmit: handleWaitlistSubmit,
    formState: { errors: waitlistErrors },
  } = useForm<WaitlistFormValues>({ defaultValues: { customerType: 'RESIDENTIAL', whatsappConsent: true, emailConsent: true } });

  const onWaitlistSubmit = (values: WaitlistFormValues) => {
    // The pincode check resolves real city/state/country (via India Post for
    // out-of-area numbers) before a street line is known — that's saved as a
    // real address now (line1 optional) rather than only in a notes string.
    // Falls back to notes only in the rare case the postal lookup itself
    // couldn't resolve city/state at all for this pincode.
    const hasCityState = areaInfo?.city && areaInfo?.state;
    createCustomer.mutate(
      {
        customerType: values.customerType,
        name: values.name,
        contacts: [{ name: values.name, mobile, isPrimary: true }],
        addresses: hasCityState
          ? [{ city: areaInfo!.city!, state: areaInfo!.state!, pinCode: pincode, country: areaInfo?.country ?? 'India', isDefault: true }]
          : [],
        notes: hasCityState ? undefined : [`Waitlist: pincode ${pincode} — city/state could not be resolved`],
        tags: ['waitlist', `waitlist-${pincode}`],
        consent: {
          whatsapp: values.whatsappConsent ? 'GRANTED' : 'NOT_ASKED',
          email: values.emailConsent ? 'GRANTED' : 'NOT_ASKED',
        },
      },
      {
        onSuccess: ({ customer }) => {
          createCall.mutate(
            {
              callType,
              direction,
              callerNumber: mobile,
              customerId: customer._id,
              customerName: customer.name,
              notes: `Out of service area (pincode ${pincode}) — added to waitlist for future launch.`,
              callDate: new Date().toISOString().slice(0, 10),
              callTime: new Date().toTimeString().slice(0, 5),
            },
            { onSuccess: () => router.push('/dashboard/calls') }
          );
        },
      }
    );
  };

  // --- Step "details": existing OR newly-serviceable customer ---
  const { data: services } = useCatalogServices();
  const { data: masters } = useMasters(['PRODUCT_TYPE', 'APPOINTMENT_SLOT']);
  const { data: brands } = useBrands();
  const productTypes = masters?.filter((m) => m.masterType === 'PRODUCT_TYPE') ?? [];
  const appointmentSlots = masters?.filter((m) => m.masterType === 'APPOINTMENT_SLOT') ?? [];

  const addAddress = useAddCustomerAddress();
  const addProduct = useAddCustomerProduct();
  const createSR = useCreateServiceRequest();
  const updateCustomer = useUpdateCustomer();

  const defaultAddress = matchedCustomer?.addresses?.find((a) => a.isDefault) ?? matchedCustomer?.addresses?.[0];

  const {
    register: registerDetails,
    handleSubmit: handleDetailsSubmit,
    formState: { errors: detailsErrors },
  } = useForm<DetailsFormValues>({
    values: {
      name: matchedCustomer?.name ?? '',
      customerType: matchedCustomer?.customerType ?? 'RESIDENTIAL',
      line1: defaultAddress?.line1 ?? '',
      line2: defaultAddress?.line2 ?? '',
      landmark: defaultAddress?.landmark ?? '',
      brandId: '',
      productTypeId: '',
      ageYears: '',
      serviceId: '',
      symptoms: '',
      priority: 'NORMAL',
      appointmentSlot: '',
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onDetailsSubmit = async (values: DetailsFormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      let customerId = matchedCustomer?._id;
      // useNewAddress means the agent chose "check a different pincode"
      // instead of the customer's address on file (e.g. it's no longer
      // serviceable) — falls through to the "add a new address" branch
      // below, which adds it to this SAME customer, not a duplicate.
      let addressSnapshot = defaultAddress && !useNewAddress
        ? {
          line1: values.line1,
          line2: values.line2 || undefined,
          landmark: values.landmark || undefined,
          city: defaultAddress.city,
          state: defaultAddress.state,
          pinCode: defaultAddress.pinCode,
          country: defaultAddress.country || 'India',
        }
        : undefined;

      if (!customerId) {
        // New, serviceable customer — create them now with the area we already resolved.
        const created = await createCustomer.mutateAsync({
          customerType: values.customerType,
          name: values.name,
          contacts: [{ name: values.name, mobile, isPrimary: true }],
          addresses: [],
        });
        customerId = created.customer._id;
      }

      if (!addressSnapshot) {
        addressSnapshot = {
          line1: values.line1,
          line2: values.line2 || undefined,
          landmark: values.landmark || undefined,
          city: areaInfo ? areaCityLabel(areaInfo) : '',
          state: areaInfo?.state ?? '',
          pinCode: pincode,
          country: areaInfo?.country ?? 'India',
        };
        await addAddress.mutateAsync({ ...addressSnapshot, customerId });
      }

      // An existing customer whose current pincode isn't serviceable still
      // belongs on the Service Area Waitlist (same as a brand-new caller
      // from that pincode) so Marketing can reach out once we launch there —
      // otherwise they'd silently disappear from that list.
      if (matchedCustomer && areaInfo && !areaInfo.serviceable) {
        const existingTags = matchedCustomer.tags ?? [];
        const waitlistTags = ['waitlist', `waitlist-${pincode}`];
        if (!waitlistTags.every((t) => existingTags.includes(t))) {
          await updateCustomer.mutateAsync({
            customerId,
            tags: Array.from(new Set([...existingTags, ...waitlistTags])),
          });
        }
      }

      if (values.brandId && values.productTypeId) {
        const ageYears = Number(values.ageYears);
        const purchaseDate = ageYears > 0 ? new Date(new Date().setFullYear(new Date().getFullYear() - ageYears)).toISOString() : undefined;
        await addProduct.mutateAsync({ brandId: values.brandId, productTypeId: values.productTypeId, purchaseDate, customerId });
      }

      const notes = values.appointmentSlot
        ? `Preferred appointment slot: ${appointmentSlots.find((s) => s._id === values.appointmentSlot)?.label ?? values.appointmentSlot}`
        : undefined;

      const call = await createCall.mutateAsync({
        callType,
        direction,
        callerNumber: mobile,
        customerId,
        customerName: values.name,
        notes,
        callDate: new Date().toISOString().slice(0, 10),
        callTime: new Date().toTimeString().slice(0, 5),
      });

      const sr = await createSR.mutateAsync({
        customerId,
        serviceId: values.serviceId,
        source: 'CALL',
        priority: values.priority,
        symptoms: values.symptoms ? [values.symptoms] : [],
        addressSnapshot,
      });

      void call;
      router.push(`/dashboard/service-requests/${sr._id}`);
    } catch {
      setSubmitError('Something went wrong while saving. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Log New Call</h1>
          <p className="text-[13px] text-muted-foreground">Number → area check → customer &amp; service, all in one go.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {/* Step 1: Number */}
      {step === 'number' && (
        <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Phone className="w-4 h-4 text-primary" /> Caller Number</CardTitle>
            <CardDescription>Start with the customer&apos;s mobile number — we&apos;ll check if they&apos;re already with us.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <AppFormField label="Mobile Number" placeholder="e.g. 9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Call Direction</label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={direction} onChange={(e) => setDirection(e.target.value as CallDirection)}>
                  {CALL_DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Call Type</label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={callType} onChange={(e) => setCallType(e.target.value as CallType)}>
                {CALL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {lookupMobile.isError && <p className="text-sm text-destructive">Failed to check this number. Try again.</p>}
            {existingCustomerError && <p className="text-sm text-destructive">{existingCustomerError}</p>}
          </CardContent>
          <CardFooter className="justify-end bg-muted/30 p-4 border-t">
            <Button className="gap-2" onClick={handleCheckNumber} disabled={mobile.length < 10 || lookupMobile.isPending || !!matchedCustomerId}>
              <Search className="w-4 h-4" /> {lookupMobile.isPending || matchedCustomerId ? 'Checking...' : 'Check Number'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Pincode */}
      {step === 'pincode' && (
        <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MapPin className="w-4 h-4 text-primary" /> Service Area</CardTitle>
            <CardDescription>
              {noMatchFound
                ? 'No existing customer found for this number. '
                : matchedCustomer
                  ? `${matchedCustomer.name} is already with us but has no saved address yet. `
                  : ''}
              Enter their pincode to check City/State and whether we serve that area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AppFormField label="Pincode" placeholder="e.g. 201017" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            {checkPincode.isError && <p className="text-sm text-destructive">Failed to check this pincode. Try again.</p>}
          </CardContent>
          <CardFooter className="justify-between bg-muted/30 p-4 border-t">
            <Button variant="ghost" className="gap-2" onClick={() => setStep('number')}><ArrowLeft className="w-4 h-4" /> Back</Button>
            <Button className="gap-2" onClick={handleCheckArea} disabled={pincode.length < 4 || checkPincode.isPending}>
              <Search className="w-4 h-4" /> {checkPincode.isPending ? 'Checking...' : 'Check Area'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step: Not serviceable -> waitlist */}
      {step === 'waitlist' && (
        <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2 border-amber-200">
          <CardHeader className="bg-amber-50/50">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800"><XCircle className="w-4 h-4" /> We Don&apos;t Serve This Area Yet</CardTitle>
            <CardDescription className="text-amber-900/70">
              {areaInfo?.city ? `${areaInfo.city}, ${areaInfo.state} (${pincode})` : `Pincode ${pincode}`} isn&apos;t in our service area yet.
              Save their details so we can notify them when we launch here.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleWaitlistSubmit(onWaitlistSubmit)}>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <AppFormField label="Customer Name" error={waitlistErrors.name?.message} {...registerWaitlist('name', { required: 'Name is required' })} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Customer Type</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...registerWaitlist('customerType')}>
                    {customerTypeMasters?.map((t) => <option key={t._id} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4" {...registerWaitlist('whatsappConsent')} /> OK to notify via WhatsApp</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4" {...registerWaitlist('emailConsent')} /> OK to notify via Email</label>
              </div>
              {(createCustomer.isError || createCall.isError) && <p className="text-sm text-destructive">Failed to save. Please try again.</p>}
            </CardContent>
            <CardFooter className="justify-between bg-muted/30 p-4 border-t">
              <Button type="button" variant="ghost" className="gap-2" onClick={() => setStep('pincode')}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button type="submit" disabled={createCustomer.isPending || createCall.isPending}>
                {createCustomer.isPending || createCall.isPending ? 'Saving...' : 'Add to Waitlist & Log Call'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Step: Details (existing customer OR newly-serviceable) */}
      {step === 'details' && (
        <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
          <form onSubmit={handleDetailsSubmit(onDetailsSubmit)}>
            <CardHeader className="space-y-4 pb-4">
              {matchedCustomer && (
                <div className="px-4 py-3 bg-green-50/50 rounded-lg border border-green-100 flex items-center gap-2 text-green-700 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Existing customer found — details pre-filled below.
                </div>
              )}
              {areaInfo?.serviceable ? (
                <div className="px-4 py-3 bg-green-50/50 rounded-lg border border-green-100 flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Serviceable — <strong>{areaInfo.branchName}</strong>
                    {areaInfo.subBranchName ? ` / ${areaInfo.subBranchName}` : ''}, {areaInfo.state}, {areaInfo.country}
                  </span>
                </div>
              ) : matchedCustomer && areaInfo && !areaInfo.serviceable ? (
                <div className="px-4 py-3 bg-amber-50/50 rounded-lg border border-amber-100 space-y-3 text-amber-800 text-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {areaCityLabel(areaInfo)}, {areaInfo.state} — {pincode} is outside our current service area.
                    </span>
                  </div>
                  <p className="text-xs">Continue anyway, or check a different pincode for this visit — either way it stays the same customer, not a new one.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <AppFormField
                      label="Different pincode for this visit"
                      placeholder="e.g. 110001"
                      value={altPincode}
                      onChange={(e) => setAltPincode(e.target.value)}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleCheckAltPincode} disabled={altPincode.length < 4 || checkPincode.isPending}>
                      {checkPincode.isPending ? 'Checking...' : 'Check This Pincode'}
                    </Button>
                  </div>
                  {checkPincode.isError && <p className="text-xs text-destructive">Couldn&apos;t check that pincode — try again.</p>}
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground border-b border-border/50 pb-1 mb-2">Customer &amp; Address</h2>
                <div className="grid grid-cols-2 gap-4">
                  <AppFormField label="Customer Name" error={detailsErrors.name?.message} {...registerDetails('name', { required: 'Name is required' })} disabled={!!matchedCustomer} />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Customer Type</label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" disabled={!!matchedCustomer} {...registerDetails('customerType')}>
                      {customerTypeMasters?.map((t) => <option key={t._id} value={t.key}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AppFormField label="Address Line 1 (Optional)" error={detailsErrors.line1?.message} {...registerDetails('line1')} />
                  <AppFormField label="Address Line 2 (Optional)" {...registerDetails('line2')} />
                </div>
                <AppFormField label="Landmark (Optional)" {...registerDetails('landmark')} />
                {defaultAddress && !useNewAddress ? (
                  <p className="text-[13px] text-muted-foreground">{defaultAddress.city}, {defaultAddress.state} — {defaultAddress.pinCode}</p>
                ) : areaInfo ? (
                  <p className="text-[13px] text-muted-foreground">
                    {useNewAddress && 'New address for this visit — '}
                    {areaCityLabel(areaInfo)}{areaInfo.subBranchName ? `, ${areaInfo.subBranchName}` : ''}, {areaInfo.state} — {pincode}
                  </p>
                ) : null}
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
                  <h2 className="text-base font-semibold text-foreground">Product Details (Optional)</h2>
                  <p className="text-[13px] text-muted-foreground">Which appliance is this about?</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Brand</label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...registerDetails('brandId')}>
                      <option value="">Select...</option>
                      {(brands || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Product Type</label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...registerDetails('productTypeId')}>
                      <option value="">Select...</option>
                      {productTypes.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
                    </select>
                  </div>
                  <AppFormField label="Approx. Age (Years)" type="number" min={0} {...registerDetails('ageYears')} />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-base font-semibold text-foreground border-b border-border/50 pb-1 mb-2">Service Request</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Service</label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...registerDetails('serviceId', { required: 'Select a service' })}>
                      <option value="">Select a service...</option>
                      {(services || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    {detailsErrors.serviceId && <p className="text-sm text-destructive">{detailsErrors.serviceId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Priority</label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...registerDetails('priority')}>
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Preferred Appointment Slot (Optional)</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...registerDetails('appointmentSlot')}>
                    <option value="">No preference</option>
                    {appointmentSlots.map((s) => <option key={s._id} value={s._id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issue / Symptoms</label>
                  <textarea
                    {...registerDetails('symptoms')}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Describe the issue reported by the customer..."
                  />
                </div>
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              </div>
            </CardContent>

            <CardFooter className="justify-between bg-muted/30 p-4 border-t">
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  if (matchedCustomer) {
                    setMatchedCustomerId(null);
                    setAreaInfo(null);
                    setUseNewAddress(false);
                    setAltPincode('');
                    setStep('number');
                  } else {
                    setStep('pincode');
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Call & Create Service Request'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
