'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useCustomers, Customer, useDeleteCustomer } from '@/lib/hooks/useCustomers';
import { useMasters } from '@/lib/hooks/useMasters';

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersPageContent />
    </Suspense>
  );
}

function CustomersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vertical = searchParams.get('vertical') ?? undefined;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: customers, isLoading, isError } = useCustomers({ 
    vertical, 
    q: debouncedSearch || undefined 
  });
  const { data: customerTypes } = useMasters(['CUSTOMER_TYPE']);
  const customerTypeLabel = (key: string) => customerTypes?.find((t) => t.key === key)?.label ?? key;
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomer.mutate(id, {
      onSuccess: () => {
        toast.success('Customer deleted successfully');
      }
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">{vertical === 'BEAUTY' ? 'Beauty & Salon Customers' : 'Customers'}</h1>
          <p className="text-[13px] text-muted-foreground">Manage customer profiles and history.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers..."
              className="w-64 pl-9 bg-background h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button size="sm" render={<Link href="/dashboard/customers/create" />}>
            Add Customer
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading customers...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load customers.</div>
      ) : (
        <>
          {/* <p className="text-sm text-muted-foreground">{customers?.length ?? 0} customers</p> */}
          <DataTable<Customer>
          data={customers || []}
          pageSize={10}
          onRowClick={(item) => router.push(`/dashboard/customers/${item._id}`)}
          columns={[
            { key: 'name', header: 'Name' },
            { 
              key: 'mobile', 
              header: 'Mobile',
              render: (item) => item.contacts?.[0]?.mobile || 'N/A'
            },
            { 
              key: 'city', 
              header: 'City',
              render: (item) => item.addresses?.[0]?.city || 'N/A'
            },
            { key: 'customerType', header: 'Type', render: (item) => customerTypeLabel(item.customerType) },
            {
              key: 'createdAt',
              header: 'Created At',
              render: (item) => new Date(item.createdAt).toLocaleDateString()
            },
            {
              key: 'actions',
              header: 'Action',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/customers/${item._id}`);
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, item._id)} disabled={deleteCustomer.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ),
            },
          ]}
          />
        </>
      )}
    </div>
  );
}
