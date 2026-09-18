'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { AppFormField } from '@/components/ui/AppFormField';
import { FormSheet } from '@/components/ui/FormSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MediaGallery } from '@/components/media/MediaGallery';
import { Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useBrands, Brand } from '@/lib/hooks/useBrands';
import { useMasters, useCreateMaster, useUpdateMaster, useDeleteMaster, Master } from '@/lib/hooks/useMasters';
import { useMemo } from 'react';

const addMasterSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  label: z.string().min(1, 'Name is required'),
});
type AddMasterValues = z.infer<typeof addMasterSchema>;

function AddMasterEntryForm({ masterType, onClose }: { masterType: 'BRAND' | 'PRODUCT_TYPE'; onClose: () => void }) {
  const createMaster = useCreateMaster();
  const { register, handleSubmit, formState: { errors } } = useForm<AddMasterValues>({ resolver: zodResolver(addMasterSchema) });

  const onSubmit = (values: AddMasterValues) => {
    createMaster.mutate({ masterType, ...values }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="System Key" placeholder="e.g. LG" error={errors.key?.message} {...register('key')} />
      <AppFormField label="Display Name" placeholder="e.g. LG" error={errors.label?.message} {...register('label')} />
      {createMaster.isError && <p className="text-sm text-destructive">Failed to create entry.</p>}
      <Button type="submit" className="w-full" disabled={createMaster.isPending}>
        {createMaster.isPending ? 'Adding...' : 'Add'}
      </Button>
    </form>
  );
}

function EditMasterEntryForm({ masterType, master, onClose }: { masterType: 'BRAND' | 'PRODUCT_TYPE'; master: { id: string; key: string; label: string }; onClose: () => void }) {
  const updateMaster = useUpdateMaster();
  const { register, handleSubmit, formState: { errors } } = useForm<AddMasterValues>({ 
    resolver: zodResolver(addMasterSchema),
    defaultValues: { key: master.key, label: master.label }
  });

  const onSubmit = (values: AddMasterValues) => {
    updateMaster.mutate({ masterType, id: master.id, ...values }, { 
      onSuccess: () => {
        toast.success(`${masterType === 'BRAND' ? 'Brand' : 'Product Type'} updated successfully`);
        onClose();
      } 
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AppFormField label="System Key" placeholder="e.g. LG" error={errors.key?.message} {...register('key')} />
      <AppFormField label="Display Name" placeholder="e.g. LG" error={errors.label?.message} {...register('label')} />
      {updateMaster.isError && <p className="text-sm text-destructive">Failed to update entry.</p>}
      <Button type="submit" className="w-full" disabled={updateMaster.isPending}>
        {updateMaster.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}

export default function BrandsPage() {
  const { data: brandsData, isLoading: loadingBrands } = useBrands();
  const { data: productTypes, isLoading: loadingProductTypes } = useMasters(['PRODUCT_TYPE']);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [editingMaster, setEditingMaster] = useState<{ id: string; key: string; label: string; type: 'BRAND' | 'PRODUCT_TYPE' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const deleteMaster = useDeleteMaster();
  const handleDelete = (e: React.MouseEvent, type: 'BRAND' | 'PRODUCT_TYPE', id: string) => {
    e.stopPropagation();
    deleteMaster.mutate({ masterType: type, id }, {
      onSuccess: () => toast.success(`${type === 'BRAND' ? 'Brand' : 'Product Type'} deleted successfully`),
      onError: () => toast.error('Failed to delete')
    });
  };

  const filteredBrands = useMemo(() => {
    if (!searchTerm) return brandsData;
    const lower = searchTerm.toLowerCase();
    return brandsData?.filter(b => b.name.toLowerCase().includes(lower) || b.key.toLowerCase().includes(lower));
  }, [brandsData, searchTerm]);

  const filteredProductTypes = useMemo(() => {
    if (!searchTerm) return productTypes;
    const lower = searchTerm.toLowerCase();
    return productTypes?.filter(p => p.label.toLowerCase().includes(lower) || p.key.toLowerCase().includes(lower));
  }, [productTypes, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="pb-1 mb-1.5 border-b border-border/50">
        <h1 className="text-lg font-medium tracking-tight text-foreground">Brands & Product Types</h1>
        <p className="text-[13px] text-muted-foreground">Manage the appliance catalog hierarchy.</p>
      </div>

      <Tabs defaultValue="brands" className="w-full">
        <div className="flex items-center justify-between ">
          <TabsList>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="product-types">Product Types</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-9 bg-background h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <TabsContent value="brands" className="m-0">
                <FormSheet triggerLabel="Add Brand" title="Add Brand" description="Register a new appliance brand.">
                  {(close) => <AddMasterEntryForm masterType="BRAND" onClose={close} />}
                </FormSheet>
              </TabsContent>
              <TabsContent value="product-types" className="m-0">
                <FormSheet triggerLabel="Add Product Type" title="Add Product Type" description="Register a new appliance/product type.">
                  {(close) => <AddMasterEntryForm masterType="PRODUCT_TYPE" onClose={close} />}
                </FormSheet>
              </TabsContent>
            </div>
          </div>
        </div>

        <TabsContent value="brands">
          <div className="pt-2 space-y-4">
            {loadingBrands ? (
              <div className="text-center text-muted-foreground p-8">Loading brands...</div>
            ) : (
              <DataTable<Brand>
                data={filteredBrands || []}
                pageSize={10}
                onRowClick={(item) => setSelectedBrand(item)}
                columns={[
                  { key: 'name', header: 'Brand Name' },
                  { key: 'key', header: 'System Key' },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => <StatusBadge label={item.status} category={item.status === 'Active' ? 'success' : 'default'} />,
                  },
                  {
                    key: 'actions',
                    header: 'Action',
                    render: (item) => (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => {
                          e.stopPropagation();
                          setEditingMaster({ id: item.id, key: item.key, label: item.name, type: 'BRAND' });
                        }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, 'BRAND', item.id)} disabled={deleteMaster.isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            )}
            <p className="text-xs text-muted-foreground">Click a brand to manage its photos and videos.</p>
          </div>
        </TabsContent>

        <TabsContent value="product-types">
          <div className="pt-2 space-y-4">
            {loadingProductTypes ? (
              <div className="text-center text-muted-foreground p-8">Loading product types...</div>
            ) : (
              <DataTable<Master>
                data={filteredProductTypes || []}
                pageSize={10}
                columns={[
                  { key: 'label', header: 'Product Type' },
                  { key: 'key', header: 'System Key' },
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => {
                          e.stopPropagation();
                          setEditingMaster({ id: item._id, key: item.key, label: item.label, type: 'PRODUCT_TYPE' });
                        }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, 'PRODUCT_TYPE', item._id)} disabled={deleteMaster.isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedBrand} onOpenChange={(open) => !open && setSelectedBrand(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedBrand?.name}</SheetTitle>
            <SheetDescription>Photos and videos for this brand.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-4 pb-4">
            {selectedBrand && <MediaGallery entityType="MASTER" entityId={selectedBrand.id} title="Brand Media" />}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editingMaster} onOpenChange={(open) => !open && setEditingMaster(null)}>
        <SheetContent className="overflow-y-auto w-[400px]">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit {editingMaster?.type === 'BRAND' ? 'Brand' : 'Product Type'}</SheetTitle>
            <SheetDescription>Modify the details below.</SheetDescription>
          </SheetHeader>
          <div className="px-1">
            {editingMaster && <EditMasterEntryForm masterType={editingMaster.type} master={editingMaster} onClose={() => setEditingMaster(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
