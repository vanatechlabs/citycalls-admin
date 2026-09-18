'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCatalogServices, CatalogService, useDeleteCatalogService } from '@/lib/hooks/useCatalogServices';
import { useMasters } from '@/lib/hooks/useMasters';

export default function ServicesPage() {
  return (
    <Suspense>
      <ServicesPageContent />
    </Suspense>
  );
}

function ServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vertical = searchParams.get('vertical') ?? undefined;
  const { data: services, isLoading, isError } = useCatalogServices({ vertical });
  const { data: categories } = useMasters(['SERVICE_CATEGORY']);
  const deleteService = useDeleteCatalogService();
  const categoryLabel = (id?: string) => categories?.find((c) => c._id === id)?.label ?? 'N/A';

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteService.mutate(id);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/dashboard/catalog/services/${id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">{vertical === 'BEAUTY' ? 'Beauty & Salon Services' : 'Services Catalog'}</h1>
          <p className="text-[13px] text-muted-foreground">Manage the list of services offered to customers.</p>
        </div>
        <Button size="sm" render={<Link href="/dashboard/catalog/services/create" />}>
          Add Service
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading services...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load services.</div>
      ) : (
        <>
        {/* <p className="text-sm text-muted-foreground">{services?.length ?? 0} services</p> */}
        <DataTable<CatalogService>
          data={services || []}
          pageSize={10}
          onRowClick={(item) => router.push(`/dashboard/catalog/services/${item._id}`)}
          columns={[
            { key: 'name', header: 'Service Name' },
            { key: 'categoryId', header: 'Category', render: (item) => categoryLabel(item.categoryId) },
            { key: 'pricing', header: 'Base Price (₹)', render: (item) => (item.pricing?.basePrice ?? 0).toLocaleString('en-IN') },
            {
              key: 'active',
              header: 'Status',
              render: (item) => <StatusBadge label={item.active ? 'Active' : 'Inactive'} category={item.active ? 'success' : 'default'} />,
            },
            {
              key: 'actions',
              header: 'Action',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => handleEdit(e, item._id)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, item._id)} disabled={deleteService.isPending}>
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
