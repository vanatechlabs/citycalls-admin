'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useVendorTechnicians } from '@/lib/hooks/useVendors';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export function VendorTechnicianAllocation({ jobId, vendorId, assigned }: { jobId: string; vendorId: string; assigned?: string }) {
  const { data: staff } = useVendorTechnicians(vendorId);
  const [selected, setSelected] = useState(assigned ?? '');
  const [reason, setReason] = useState('');
  const client = useQueryClient();
  const save = useMutation({ mutationFn: () => apiClient.patch(`/service-requests/${jobId}/vendor-technician`, { technicianUserId: selected || null, reason }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['service-requests'] }); void client.invalidateQueries({ queryKey: ['service-request', jobId] }); } });
  return <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Vendor technician allocation</h3>
    <select className="w-full rounded border p-2" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Unassigned — manager will allocate</option>{(staff ?? []).filter(t => t.active).map(t => <option key={t._id} value={typeof t.userId === 'string' ? t.userId : t.userId._id}>{typeof t.userId === 'string' ? t.userId : t.userId.name}</option>)}</select>
    <input className="w-full rounded border p-2" placeholder="Assignment / handover reason" value={reason} onChange={e => setReason(e.target.value)} />
    <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save allocation'}</Button>
    {save.isError && <p className="text-sm text-destructive">Could not allocate. Check the technician and include a reason for an active job.</p>}
    {save.isSuccess && <p className="text-sm text-green-700">Allocation saved.</p>}
  </section>;
}
