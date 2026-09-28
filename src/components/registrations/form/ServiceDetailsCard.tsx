import { Wrench } from 'lucide-react';
import type { ServiceMenu } from '@/lib/hooks/useRegistrations';
import { Field } from '../shared/Field';
import { FormCard } from '../shared/FormCard';
import { FIELD_INPUT } from '../shared/styles';

interface ServiceDetailsCardProps {
  menus: ServiceMenu[];
  loading: boolean;
  serviceId: string;
  onChange: (serviceId: string) => void;
  // Editing a registration whose navbar link no longer exists.
  missingService?: { id: string; name: string };
}

export function ServiceDetailsCard({ menus, loading, serviceId, onChange, missingService }: ServiceDetailsCardProps) {
  const hasServices = menus.some((m) => m.services.length > 0);

  return (
    <FormCard icon={Wrench} title="Service Details" hint="Services come from Navbar List — only active menus and service links are shown.">
      <Field label="Select Service" required>
        <select required value={serviceId} onChange={(e) => onChange(e.target.value)} className={FIELD_INPUT} disabled={loading}>
          <option value="">{loading ? 'Loading services...' : 'Select a service'}</option>
          {missingService && (
            <option value={missingService.id}>{missingService.name} (removed from navbar)</option>
          )}
          {menus.map((menu) => (
            <optgroup key={menu.id} label={menu.name}>
              {menu.services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      {!loading && !hasServices && (
        <p className="mt-1 text-[10px] font-bold text-red-500">No active services found. Add them in Admin Section → Navbar List.</p>
      )}
    </FormCard>
  );
}
