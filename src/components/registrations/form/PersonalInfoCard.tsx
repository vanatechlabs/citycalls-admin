import { User } from 'lucide-react';
import { HEARD_FROM, LANGUAGES, REFERENCE_SOURCES, STATES } from '@/lib/registrations/constants';
import { Field, PhoneInput } from '../shared/Field';
import { FormCard } from '../shared/FormCard';
import { FIELD_INPUT } from '../shared/styles';
import type { RegistrationFormState, UpdateField } from './formState';
import { PincodeField } from './PincodeField';

export function PersonalInfoCard({ form, update }: { form: RegistrationFormState; update: UpdateField }) {
  const showReference = REFERENCE_SOURCES.includes(form.heardFrom);

  return (
    <FormCard icon={User} title="Personal Information" hint="Customer details so our team can reach them easily. No OTP needed in admin.">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Full Name" required>
            <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} maxLength={120} placeholder="Enter full name" className={FIELD_INPUT} />
          </Field>
          <Field label="Email Address" required>
            <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} maxLength={160} placeholder="Enter email address" className={FIELD_INPUT} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Phone Number" required>
            <PhoneInput required value={form.phone} onChange={(v) => update('phone', v)} placeholder="Enter phone number" />
          </Field>
          <Field label="Alternate Number (Optional)">
            <PhoneInput value={form.altPhone} onChange={(v) => update('altPhone', v)} placeholder="Enter alternate number" />
          </Field>
        </div>

        <Field label="Complete Address" required>
          <input required value={form.address} onChange={(e) => update('address', e.target.value)} maxLength={300} placeholder="House / Flat / Building, Street, Area" className={FIELD_INPUT} />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PincodeField
            value={form.pincode}
            onChange={(pincode) => update('pincode', pincode)}
            onDetected={({ city, state }) => {
              if (city) update('city', city);
              if (state) update('state', state);
            }}
          />
          <Field label="City" required hint="Auto-filled from pincode — editable">
            <input required value={form.city} onChange={(e) => update('city', e.target.value)} maxLength={80} placeholder="Enter city" className={FIELD_INPUT} />
          </Field>
          <Field label="State" required>
            <select required value={form.state} onChange={(e) => update('state', e.target.value)} className={FIELD_INPUT}>
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Preferred Language">
            <select value={form.language} onChange={(e) => update('language', e.target.value)} className={FIELD_INPUT}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="How did they hear about us?">
            <select value={form.heardFrom} onChange={(e) => update('heardFrom', e.target.value)} className={FIELD_INPUT}>
              <option value="">Select an option</option>
              {HEARD_FROM.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {showReference && (
            <Field label="Name (for reference)" required>
              <input required value={form.referenceName} onChange={(e) => update('referenceName', e.target.value)} maxLength={120} placeholder="Enter name for reference" className={FIELD_INPUT} />
            </Field>
          )}
          <Field label="Any instructions? (Optional)" className={showReference ? '' : 'md:col-span-2'}>
            <input value={form.instructions} onChange={(e) => update('instructions', e.target.value)} maxLength={300} placeholder="e.g. Gate number, landmark, floor number etc." className={FIELD_INPUT} />
          </Field>
        </div>
      </div>
    </FormCard>
  );
}
