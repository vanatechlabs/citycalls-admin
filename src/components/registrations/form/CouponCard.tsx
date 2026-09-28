import { CircleCheck, TicketPercent } from 'lucide-react';
import { Field } from '../shared/Field';
import { FormCard } from '../shared/FormCard';
import { FIELD_INPUT } from '../shared/styles';

interface CouponCardProps {
  value: string;
  onChange: (code: string) => void;
  // Code → offer title, from Offers & Promotions.
  knownCoupons: Map<string, string>;
}

export function CouponCard({ value, onChange, knownCoupons }: CouponCardProps) {
  const match = value ? knownCoupons.get(value.trim().toUpperCase()) : undefined;

  return (
    <FormCard icon={TicketPercent} title="Offer / Coupon" hint="Apply a coupon code from Offers & Promotions, or type one.">
      <Field label="Coupon Code">
        <input
          list="registration-coupons"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
          maxLength={40}
          placeholder="e.g. CITY15"
          className={`${FIELD_INPUT} uppercase tracking-wider`}
        />
      </Field>
      <datalist id="registration-coupons">
        {Array.from(knownCoupons.entries()).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </datalist>

      {value && (
        match ? (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#3e8914]"><CircleCheck className="h-3 w-3" /> Matches offer: {match}</p>
        ) : (
          <p className="mt-1.5 text-[10px] font-bold text-amber-600">Not a listed offer code — it will still be saved.</p>
        )
      )}

      {knownCoupons.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from(knownCoupons.keys()).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onChange(value === code ? '' : code)}
              className={`border-2 px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors ${
                value === code ? 'border-[#3e8914] bg-[#3e8914] text-white' : 'border-dashed border-gray-300 text-gray-600 hover:border-[#3e8914] hover:text-[#3e8914]'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      )}
    </FormCard>
  );
}
