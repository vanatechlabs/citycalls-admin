'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';

import {
  useCustomer,
  useAddCustomerAddress,
  useUpdateCustomerAddress,
  useDeleteCustomerAddress,
  useCustomerProducts,
  useAddCustomerProduct,
  useUpdateCustomer,
  useUpdateCustomerConsent,
  Customer,
  CustomerAddress,
  ConsentState,
} from '@/lib/hooks/useCustomers';
import { useMasters } from '@/lib/hooks/useMasters';
import { useCheckPincode, areaCityLabel } from '@/lib/hooks/useGeo';

const addAddressSchema = z.object({
  line1: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pinCode: z.string().min(4, 'Pin code is required'),
});
type AddAddressValues = z.infer<typeof addAddressSchema>;

function AddAddressForm({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const addAddress = useAddCustomerAddress();
  const checkPincode = useCheckPincode();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AddAddressValues>({ resolver: zodResolver(addAddressSchema) });

  const handlePincodeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const pinCode = e.target.value.trim();
    if (pinCode.length < 6) return;
    checkPincode.mutate(pinCode, {
      onSuccess: (result) => {
        setValue('city', areaCityLabel(result));
        setValue('state', result.state ?? '');
      },
    });
  };

  const onSubmit = (values: AddAddressValues) => {
    addAddress.mutate({ ...values, line1: values.line1 || undefined, country: 'India', customerId }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Pin Code" error={errors.pinCode?.message} {...register('pinCode', { onBlur: handlePincodeBlur })} />
      <AppFormField label="City" placeholder="Auto-filled from pin code" error={errors.city?.message} {...register('city')} />
      <AppFormField label="State" placeholder="Auto-filled from pin code" error={errors.state?.message} {...register('state')} />
      {checkPincode.isPending && <p className="text-xs text-muted-foreground">Looking up City/State for this pin code...</p>}
      <AppFormField label="Address Line 1 (Optional)" error={errors.line1?.message} {...register('line1')} />
      {addAddress.isError && <p className="text-sm text-destructive">Failed to add address.</p>}
      <Button type="submit" className="w-full" disabled={addAddress.isPending}>
        {addAddress.isPending ? 'Adding...' : 'Add Address'}
      </Button>
    </form>
  );
}

const editCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Enter a valid mobile number'),
  businessName: z.string().optional(),
  gstin: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  customerType: z.string().min(1, 'Select a customer type'),
});
type EditCustomerValues = z.infer<typeof editCustomerSchema>;

function EditCustomerForm({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const updateCustomer = useUpdateCustomer();
  const { data: customerTypes } = useMasters(['CUSTOMER_TYPE']);
  const { register, handleSubmit, formState: { errors } } = useForm<EditCustomerValues>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      name: customer.name,
      mobile: customer.contacts?.[0]?.mobile ?? '',
      businessName: customer.businessName ?? '',
      gstin: customer.gstin ?? '',
      email: customer.email ?? '',
      customerType: customer.customerType,
    },
  });

  const onSubmit = (values: EditCustomerValues) => {
    updateCustomer.mutate(
      { 
        customerId: customer._id, 
        ...values, 
        email: values.email || undefined,
        contacts: [{ name: values.name, mobile: values.mobile, isPrimary: true }]
      },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Full Name" error={errors.name?.message} {...register('name')} />
      <AppFormField label="Mobile Number" error={errors.mobile?.message} {...register('mobile')} />
      <AppFormField label="Business Name (Optional)" {...register('businessName')} />
      <AppFormField label="GSTIN (Optional)" {...register('gstin')} />
      <AppFormField label="Email (Optional)" type="email" error={errors.email?.message} {...register('email')} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Customer Type</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('customerType')}>
          {customerTypes?.map((t) => <option key={t._id} value={t.key}>{t.label}</option>)}
        </select>
      </div>
      {updateCustomer.isError && (
        <p className="text-sm text-destructive">{updateCustomer.error.response?.data?.message ?? 'Failed to update customer.'}</p>
      )}
      <Button type="submit" className="w-full" disabled={updateCustomer.isPending}>
        {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

function EditAddressForm({ customerId, address, onClose }: { customerId: string; address: CustomerAddress; onClose: () => void }) {
  const updateAddress = useUpdateCustomerAddress();
  const checkPincode = useCheckPincode();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AddAddressValues>({
    resolver: zodResolver(addAddressSchema),
    defaultValues: { line1: address.line1 ?? '', city: address.city, state: address.state, pinCode: address.pinCode },
  });

  const handlePincodeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const pinCode = e.target.value.trim();
    if (pinCode.length < 6) return;
    checkPincode.mutate(pinCode, {
      onSuccess: (result) => {
        setValue('city', areaCityLabel(result));
        setValue('state', result.state ?? '');
      },
    });
  };

  const onSubmit = (values: AddAddressValues) => {
    if (!address._id) return;
    updateAddress.mutate({ ...values, line1: values.line1 || undefined, customerId, addressId: address._id }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="Pin Code" error={errors.pinCode?.message} {...register('pinCode', { onBlur: handlePincodeBlur })} />
      <AppFormField label="City" error={errors.city?.message} {...register('city')} />
      <AppFormField label="State" error={errors.state?.message} {...register('state')} />
      {checkPincode.isPending && <p className="text-xs text-muted-foreground">Looking up City/State for this pin code...</p>}
      <AppFormField label="Address Line 1 (Optional)" error={errors.line1?.message} {...register('line1')} />
      {updateAddress.isError && <p className="text-sm text-destructive">Failed to update address.</p>}
      <Button type="submit" className="w-full" disabled={updateAddress.isPending}>
        {updateAddress.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

const CONSENT_CHANNELS: { key: 'whatsapp' | 'email' | 'sms'; label: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

function ConsentPanel({ customerId, consent }: { customerId: string; consent?: Customer['consent'] }) {
  const updateConsent = useUpdateCustomerConsent();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Consent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {CONSENT_CHANNELS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <select
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              value={consent?.[key] ?? 'NOT_ASKED'}
              disabled={updateConsent.isPending}
              onChange={(e) => updateConsent.mutate({ customerId, channel: key, state: e.target.value as ConsentState })}
            >
              <option value="GRANTED">Granted</option>
              <option value="REVOKED">Revoked</option>
              <option value="NOT_ASKED">Not Asked</option>
            </select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const addProductSchema = z.object({
  brandId: z.string().min(1, 'Select a brand'),
  productTypeId: z.string().min(1, 'Select a product type'),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
});
type AddProductValues = z.infer<typeof addProductSchema>;

function AddApplianceForm({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const addProduct = useAddCustomerProduct();
  const { data: masters } = useMasters(['BRAND', 'PRODUCT_TYPE']);
  const brands = masters?.filter((m) => m.masterType === 'BRAND') || [];
  const productTypes = masters?.filter((m) => m.masterType === 'PRODUCT_TYPE') || [];
  const { register, handleSubmit, formState: { errors } } = useForm<AddProductValues>({ resolver: zodResolver(addProductSchema) });

  const onSubmit = (values: AddProductValues) => {
    addProduct.mutate({ ...values, customerId }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Brand</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('brandId')}>
          <option value="">Select a brand...</option>
          {brands.map((b) => <option key={b._id} value={b._id}>{b.label}</option>)}
        </select>
        {errors.brandId && <p className="text-sm text-destructive">{errors.brandId.message}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Product Type</label>
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" {...register('productTypeId')}>
          <option value="">Select a product type...</option>
          {productTypes.map((p) => <option key={p._id} value={p._id}>{p.label}</option>)}
        </select>
        {errors.productTypeId && <p className="text-sm text-destructive">{errors.productTypeId.message}</p>}
      </div>
      <AppFormField label="Model Number (Optional)" {...register('modelNumber')} />
      <AppFormField label="Serial Number (Optional)" {...register('serialNumber')} />
      {addProduct.isError && <p className="text-sm text-destructive">Failed to add appliance.</p>}
      <Button type="submit" className="w-full" disabled={addProduct.isPending}>
        {addProduct.isPending ? 'Adding...' : 'Add Appliance'}
      </Button>
    </form>
  );
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: customer, isLoading, isError } = useCustomer(id);
  const { data: products } = useCustomerProducts(id);
  const { data: masters } = useMasters(['BRAND', 'PRODUCT_TYPE', 'CUSTOMER_TYPE']);
  const deleteAddress = useDeleteCustomerAddress();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading customer details...</div>;
  if (isError || !customer) return <div className="p-8 text-center text-destructive">Failed to load customer details.</div>;

  const masterLabel = (masterId: string) => masters?.find((m) => m._id === masterId)?.label ?? masterId;
  const customerTypeLabel = (key: string) => masters?.find((m) => m.masterType === 'CUSTOMER_TYPE' && m.key === key)?.label ?? key;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">{customer.name}</h1>
          <p className="text-[13px] text-muted-foreground">ID: {customer._id}</p>
        </div>
        <div className="ml-auto">
          <FormSheet
            triggerLabel="Edit Customer"
            title="Edit Customer"
            description={`Update ${customer.name}'s profile.`}
            triggerElement={<Button variant="outline"><Pencil className="w-4 h-4 mr-2" />Edit Customer</Button>}
          >
            {(close) => <EditCustomerForm customer={customer} onClose={close} />}
          </FormSheet>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{customer.name}</span>
              <span className="text-muted-foreground">Mobile:</span>
              <span className="font-medium">{customer.contacts?.[0]?.mobile || 'N/A'}</span>
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{customer.email || 'N/A'}</span>
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{customerTypeLabel(customer.customerType)}</span>
            </div>
          </CardContent>
        </Card>

        <ConsentPanel customerId={id} consent={customer.consent} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Addresses</CardTitle>
              <FormSheet triggerLabel="Add Address" title="Add Address" description={`New address for ${customer.name}.`}>
                {(close) => <AddAddressForm customerId={id} onClose={close} />}
              </FormSheet>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.addresses?.map((addr, idx) => (
                <div key={addr._id ?? idx} className="rounded-md border p-4 text-sm flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Address {idx + 1}{addr.isDefault ? ' (Default)' : ''}</p>
                    <p className="text-muted-foreground">{[addr.line1, addr.city, addr.state, addr.pinCode].filter(Boolean).join(', ')}</p>
                  </div>
                  {addr._id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <FormSheet
                        triggerLabel="Edit"
                        title="Edit Address"
                        description={`Update address for ${customer.name}.`}
                        triggerElement={<Button size="sm" variant="ghost"><Pencil className="w-4 h-4" /></Button>}
                      >
                        {(close) => <EditAddressForm customerId={id} address={addr} onClose={close} />}
                      </FormSheet>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm('Remove this address?')) {
                            deleteAddress.mutate({ customerId: id, addressId: addr._id! });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {(!customer.addresses || customer.addresses.length === 0) && (
                <p className="text-muted-foreground text-sm">No addresses found.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Appliances / Products</CardTitle>
              <FormSheet triggerLabel="Add Appliance" title="Add Appliance" description={`Register a product for ${customer.name}.`}>
                {(close) => <AddApplianceForm customerId={id} onClose={close} />}
              </FormSheet>
            </CardHeader>
            <CardContent className="space-y-4">
              {(products || []).map((p) => (
                <div key={p._id} className="rounded-md border p-4 text-sm">
                  <p className="font-medium">{masterLabel(p.brandId)} {masterLabel(p.productTypeId)}</p>
                  <p className="text-muted-foreground">
                    {p.serialNumber ? `Serial: ${p.serialNumber}` : 'No serial number'}
                    {p.warrantyExpiresAt ? ` | Warranty until: ${new Date(p.warrantyExpiresAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))}
              {(!products || products.length === 0) && (
                <p className="text-muted-foreground text-sm">No appliances registered.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
