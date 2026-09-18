'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useCalls, Call, useDeleteCall } from '@/lib/hooks/useCalls';

export default function CallsPage() {
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: calls, isLoading, isError } = useCalls({ q: debouncedSearch || undefined });
  const deleteCall = useDeleteCall();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCall.mutate(id, {
      onSuccess: () => toast.success('Call log deleted successfully'),
      onError: () => toast.error('Failed to delete call log'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Call Logs</h1>
          <p className="text-[13px] text-muted-foreground">View and manage history of incoming and outgoing calls.</p>
        </div>
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
          <Button size="sm" render={<Link href="/dashboard/calls/entry" />}>
            Log New Call
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading calls...</div>
      ) : isError ? (
        <div className="flex justify-center p-8 text-destructive">Failed to load calls.</div>
      ) : (
        <>
        {/* <p className="text-sm text-muted-foreground">{calls?.length ?? 0} calls</p> */}
        <DataTable<Call>
          data={calls || []}
          pageSize={10}
          onRowClick={(item) => router.push(`/dashboard/calls/${item._id}`)}
          columns={[
            { key: 'callerNumber', header: 'Phone Number' },
            { key: 'customerName', header: 'Customer', render: (item) => item.customerName || 'Unknown' },
            {
              key: 'direction',
              header: 'Direction',
              render: (item) => <StatusBadge label={item.direction} category={item.direction === 'INCOMING' ? 'info' : 'default'} />,
            },
            {
              key: 'callType',
              header: 'Call Type',
              render: (item) => (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                  {item.callType.replace(/_/g, ' ')}
                </span>
              ),
            },
            { key: 'createdAt', header: 'Date & Time', render: (item) => new Date(item.createdAt).toLocaleString() },
            {
              key: 'actions',
              header: 'Action',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/calls/${item._id}`);
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(e, item._id)} disabled={deleteCall.isPending}>
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
