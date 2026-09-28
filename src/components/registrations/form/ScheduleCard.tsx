import { CalendarDays, Clock } from 'lucide-react';
import { TIME_SLOTS } from '@/lib/registrations/constants';
import { todayISO } from '@/lib/registrations/format';
import { ChoiceTile } from '../shared/ChoiceTile';
import { Field } from '../shared/Field';
import { FormCard } from '../shared/FormCard';
import { FIELD_INPUT, FIELD_LABEL } from '../shared/styles';
import type { RegistrationFormState, UpdateField } from './formState';

export function ScheduleCard({ form, update, allowPastDate }: { form: RegistrationFormState; update: UpdateField; allowPastDate?: boolean }) {
  return (
    <FormCard icon={CalendarDays} title="Choose Date & Time" hint="Convenient date and time slot for our expert to visit.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Select Date" required>
          <input
            required
            type="date"
            min={allowPastDate ? undefined : todayISO()}
            value={form.preferredDate}
            onChange={(e) => update('preferredDate', e.target.value)}
            className={FIELD_INPUT}
          />
        </Field>
        <div className="md:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <label className={`${FIELD_LABEL} mb-0`}>Select Time Slot <span className="text-red-500">*</span></label>
            <button type="button" onClick={() => update('isCustomTime', !form.isCustomTime)} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700">
              <Clock className="h-3 w-3" /> {form.isCustomTime ? 'Use time slots' : 'Custom time'}
            </button>
          </div>
          {form.isCustomTime ? (
            <input required type="time" value={form.customTime} onChange={(e) => update('customTime', e.target.value)} className={FIELD_INPUT} />
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {TIME_SLOTS.map((slot) => (
                <ChoiceTile key={slot} selected={form.timeSlot === slot} onClick={() => update('timeSlot', slot)}>
                  {slot}
                </ChoiceTile>
              ))}
            </div>
          )}
        </div>
      </div>
    </FormCard>
  );
}
