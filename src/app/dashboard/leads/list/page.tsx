'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useLeads, Lead, useDeleteLead } from '@/lib/hooks/useLeads';

export default function LeadsListPage() {
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: leads, isLoading, isError } = useLeads({ q: debouncedSearch || undefined });
  const deleteLead = useDeleteLead();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteLead.mutate(id, {
      onSuccess: () => toast.success('Lead deleted successfully'),
      onError: () => toast.error('Failed to delete lead'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Leads (List View)</h1>
          <p className="text-[13px] text-muted-foreground">Tabular view of all leads for bulk operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search leads..."
              className="w-64 pl-9 bg-background h-8 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button size="sm" variant="outline" render={<Link href="/dashboard/leads" />}>
            Pipeline View
          </Button>
          <Button size="sm" render={<Link href="/dashboard/leads/import" />}>
            Import Leads
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading leads...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load leads.</div>
      ) : (
        <DataTable<Lead>
          data={leads || []}
          onRowClick={(item) => router.push(`/dashboard/leads/${item._id}`)}
          columns={[
            { key: 'contactName', header: 'Name', render: (item) => item.contactName || 'Unnamed Lead' },
            { key: 'contactMobile', header: 'Mobile', render: (item) => item.contactMobile || 'N/A' },
            { key: 'source', header: 'Source' },
            {
              key: 'stage',
              header: 'Stage',
              render: (item) => (
                <StatusBadge
                  label={item.stage.replace(/_/g, ' ')}
                  category={item.stage === 'NEW' ? 'info' : item.stage === 'CONVERTED' ? 'success' : 'default'}
                />
              ),
            },
            { key: 'priority', header: 'Priority' },
            { key: 'createdAt', header: 'Created On', render: (item) => new Date(item.createdAt).toLocaleDateString() },
            {
              key: 'actions',
              header: 'Action',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/leads/${item._id}`);
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, item._id)} disabled={deleteLead.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
