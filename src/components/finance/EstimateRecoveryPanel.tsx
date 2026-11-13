'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
export function EstimateRecoveryPanel() {
  const client = useQueryClient();
  const queue = useQuery({ queryKey: ['estimate-recovery'], refetchInterval: 30000, queryFn: async () => (await apiClient.get('/finance/status-recovery')).data.data as { _id: string; estimateId: string; attempts: number; lastError?: string }[] });
  const retry = useMutation({ mutationFn: (id: string) => apiClient.post(`/finance/status-recovery/${id}/retry`), onSuccess: () => { void client.invalidateQueries({ queryKey: ['estimate-recovery'] }); } });
  if (!queue.data?.length) return null;
  return <section className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold">Estimate status updates pending</h3><p className="text-sm">These updates retry automatically. Check the reason if a job is waiting.</p>{queue.data.map(task => <div key={task._id} className="flex items-center justify-between gap-3"><p className="text-sm">Estimate {task.estimateId} · {task.attempts} attempts · {task.lastError}</p><Button variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(task._id)}>Retry now</Button></div>)}{retry.isError && <p className="text-sm text-destructive">Retry could not be completed.</p>}</section>;
}
