'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ServiceForm } from '@/components/catalog/ServiceForm';
import { useCreateCatalogService } from '@/lib/hooks/useCatalogServices';

export default function CreateServicePage() {
  const router = useRouter();
  const createService = useCreateCatalogService();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 border-b border-border/50 pb-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Add Service</h1>
          <p className="text-[13px] text-muted-foreground">
            Pick a category first — the form adapts to what that category needs.
          </p>
        </div>
      </div>

      <ServiceForm
        submitLabel="Save Service"
        isPending={createService.isPending}
        errorMessage={
          createService.isError
            ? createService.error.response?.data?.message ?? 'Failed to create service.'
            : undefined
        }
        onCancel={() => router.back()}
        onSubmit={(input) =>
          createService.mutate(input, { onSuccess: () => router.push('/dashboard/catalog/services') })
        }
      />
    </div>
  );
}
