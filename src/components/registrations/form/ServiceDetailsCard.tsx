import { Wrench } from 'lucide-react';
import type { ServiceMenu } from '@/lib/hooks/useRegistrations';
import { ChoiceTile } from '../shared/ChoiceTile';
import { Field } from '../shared/Field';
import { FormCard } from '../shared/FormCard';
import { FIELD_INPUT, FIELD_LABEL } from '../shared/styles';

interface ServiceDetailsCardProps {
  menus: ServiceMenu[];
  loading: boolean;
  serviceId: string;
  onChange: (serviceId: string) => void;
  // Editing a registration whose navbar link no longer exists.
  missingService?: { id: string; name: string };
  // New registration: pick one or more services (one registration is created for each).
  multiple?: { selectedIds: string[]; onToggle: (serviceId: string) => void };
}

export function ServiceDetailsCard({ menus, loading, serviceId, onChange, missingService, multiple }: ServiceDetailsCardProps) {
  const hasServices = menus.some((m) => m.services.length > 0);

  if (multiple) {
    const count = multiple.selectedIds.length;
    return (
      <FormCard
        icon={Wrench}
        title="Service Details"
        hint="Services come from Navbar List. Select one or more — each gets its own Issue Details below and its own registration."
      >
        <div className="mb-2 flex items-center justify-between">
          <label className={`${FIELD_LABEL} mb-0`}>Select Service(s) <span className="text-red-500">*</span></label>
          <span className={`text-[10px] font-bold ${count ? 'text-[#3e8914]' : 'text-gray-400'}`}>{count} selected</span>
        </div>
        {loading ? (
          <p className="text-[11px] font-medium text-gray-400">Loading services...</p>
        ) : (
          <div className="space-y-3">
            {menus.filter((m) => m.services.length > 0).map((menu) => (
              <div key={menu.id}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4B1426]">{menu.name}</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {menu.services.map((service) => (
                    <ChoiceTile key={service.id} compact selected={multiple.selectedIds.includes(service.id)} onClick={() => multiple.onToggle(service.id)}>
                      {service.name}
                    </ChoiceTile>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !hasServices && (
          <p className="mt-1 text-[10px] font-bold text-red-500">No active services found. Add them in Admin Section → Navbar List.</p>
        )}
      </FormCard>
    );
  }

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
