'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MediaGallery } from '@/components/media/MediaGallery';
import { ServiceForm } from '@/components/catalog/ServiceForm';
import { useCatalogService, useUpdateCatalogService } from '@/lib/hooks/useCatalogServices';

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: service, isLoading, isError } = useCatalogService(id);
  const updateService = useUpdateCatalogService(id);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading service...</div>;
  if (isError || !service) return <div className="p-8 text-center text-destructive">Failed to load service.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 border-b border-border/50 pb-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Edit Service</h1>
          <p className="text-[13px] text-muted-foreground">{service.name}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge
            label={service.active ? 'Active' : 'Inactive'}
            category={service.active ? 'success' : 'default'}
          />
        </div>
      </div>

      {/* key remounts the form with fresh defaults after a save refetches the service */}
      <ServiceForm
        key={`${service._id}-${service.categoryId}-${service.active}`}
        service={service}
        submitLabel="Save Changes"
        isPending={updateService.isPending}
        errorMessage={
          updateService.isError
            ? updateService.error.response?.data?.message ?? 'Failed to update service.'
            : undefined
        }
        onCancel={() => router.push('/dashboard/catalog/services')}
        onSubmit={(input) =>
          updateService.mutate(input, {
            onSuccess: () => {
              void Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Service updated',
                timer: 1800,
                showConfirmButton: false,
              });
            },
          })
        }
      />

      <div className="mx-auto max-w-4xl">
        <MediaGallery entityType="SERVICE" entityId={id} />
      </div>
    </div>
  );
}
