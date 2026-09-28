import type { ReactNode } from 'react';
import { FIELD_LABEL } from './styles';

interface FieldProps {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label className={FIELD_LABEL}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] font-medium text-gray-400">{hint}</p>}
    </div>
  );
}

// "+91" prefix box + phone input, square like the rest of the form.
export function PhoneInput({ value, onChange, required, placeholder }: {
  value: string; onChange: (value: string) => void; required?: boolean; placeholder: string;
}) {
  return (
    <div className="flex">
      <span className="flex items-center border-2 border-r-0 border-gray-300 bg-gray-50 px-2 text-xs font-bold text-gray-500">+91</span>
      <input
        required={required}
        inputMode="numeric"
        pattern="\d{10}"
        title="10 digit phone number"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder={placeholder}
        className="w-full border-2 border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#3e8914]"
      />
    </div>
  );
}
