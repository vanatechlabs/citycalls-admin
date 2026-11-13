'use client';
import { useState } from 'react';
import { useCatalogServices } from '@/lib/hooks/useCatalogServices';
import { useUpdateVendor, Vendor } from '@/lib/hooks/useVendors';
import { Button } from '@/components/ui/button';

export function ServiceCommissionEditor({ vendor }: { vendor: Vendor }) {
  const { data: services } = useCatalogServices();
  const update = useUpdateVendor();
  const [rates, setRates] = useState<Record<string, number>>(Object.fromEntries((vendor.serviceCommissionRates ?? []).map(row => [row.serviceId, row.rate])));
  return <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Service-wise commission</h3><p className="text-sm text-muted-foreground">Set a percentage for each service this vendor will settle. Unconfigured services cannot be settled.</p>
    {(services ?? []).filter(service => !vendor.servicesOffered?.length || vendor.servicesOffered.includes(service._id)).map(service => <label key={service._id} className="flex items-center justify-between gap-3"><span>{service.name}</span><input aria-label={`${service.name} commission`} className="w-24 rounded border p-2" type="number" min="0" max="100" step="0.01" value={rates[service._id] ?? ''} onChange={e => setRates(previous => { const next = { ...previous }; if (e.target.value === '') delete next[service._id]; else next[service._id] = Number(e.target.value); return next; })} /></label>)}
    <Button disabled={update.isPending || Object.values(rates).some(rate => !Number.isFinite(rate) || rate < 0 || rate > 100)} onClick={() => update.mutate({ id: vendor._id, commissionModel: 'SERVICE_WISE', serviceCommissionRates: Object.entries(rates).map(([serviceId, rate]) => ({ serviceId, rate })) })}>{update.isPending ? 'Saving…' : 'Save service commission rates'}</Button>
    {update.isSuccess && <p className="text-sm text-green-700">Commission rates saved.</p>}{update.isError && <p className="text-sm text-destructive">Could not save rates.</p>}
  </section>;
}
