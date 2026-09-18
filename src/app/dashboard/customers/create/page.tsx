'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppFormField } from '@/components/ui/AppFormField';
import { useCreateCustomer } from '@/lib/hooks/useCustomers';
import { useMasters } from '@/lib/hooks/useMasters';
import { useCheckPincode, areaCityLabel } from '@/lib/hooks/useGeo';
import { UserPlus, MapPin } from 'lucide-react';

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Enter a valid mobile number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  customerType: z.string().min(1, 'Select a customer type'),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
});
type CreateCustomerValues = z.infer<typeof createCustomerSchema>;

export default function CreateCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();
  const { data: customerTypes } = useMasters(['CUSTOMER_TYPE']);
  const checkPincode = useCheckPincode();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateCustomerValues>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { customerType: 'RESIDENTIAL' },
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

  const onSubmit = (values: CreateCustomerValues) => {
    // Street line is optional now — at minimum, city/state/pinCode resolved
    // from the pincode check is saved as a real address.
    const hasAddress = values.city && values.state && values.pinCode;
    createCustomer.mutate(
      {
        name: values.name,
        customerType: values.customerType,
        email: values.email || undefined,
        contacts: [{ name: values.name, mobile: values.mobile, isPrimary: true }],
        addresses: hasAddress
          ? [{ line1: values.addressLine1 || undefined, city: values.city!, state: values.state!, pinCode: values.pinCode!, country: 'India', isDefault: true }]
          : [],
      },
      { onSuccess: () => router.push('/dashboard/customers') }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 mb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-md">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Add New Customer</h1>
            <p className="text-[13px] text-muted-foreground">Register a new customer profile into the system.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.back()}>Back to List</Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="border shadow-sm overflow-hidden">
            <CardContent className="p-8 space-y-8">
              {/* Contact Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AppFormField label="Full Name" placeholder="e.g. Ramesh Singh" error={errors.name?.message} {...register('name')} />
                  <AppFormField label="Mobile Number" placeholder="e.g. 9876543210" error={errors.mobile?.message} {...register('mobile')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AppFormField label="Email Address (Optional)" placeholder="e.g. ramesh@example.com" error={errors.email?.message} {...register('email')} />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Customer Type</label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register('customerType')}>
                      {customerTypes?.map((t) => (
                        <option key={t._id} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b pb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Address Details (Optional)</h3>
                  <span className="text-xs text-muted-foreground ml-2">Enter Pin Code to auto-fill</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <AppFormField
                      label="Pin Code"
                      placeholder="e.g. 110001"
                      {...register('pinCode', {
                        onBlur: handlePincodeBlur,
                      })}
                    />
                    {checkPincode.isPending && <p className="text-[11px] text-muted-foreground mt-1 animate-pulse">Fetching area details...</p>}
                    {checkPincode.isError && <p className="text-[11px] text-destructive mt-1">Unable to locate Pin Code.</p>}
                  </div>
                  <AppFormField label="City" placeholder="Auto-filled" {...register('city')} />
                  <AppFormField label="State" placeholder="Auto-filled" {...register('state')} />
                </div>
                
                <AppFormField label="Address Line 1" placeholder="e.g. House No. 12, Sector 5, Landmark" {...register('addressLine1')} />
                
                {createCustomer.isError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive font-medium">{createCustomer.error.response?.data?.message ?? 'Failed to create customer.'}</p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 px-8 py-5 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={createCustomer.isPending} className="min-w-[140px]">
                {createCustomer.isPending ? 'Saving...' : 'Save Customer'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
