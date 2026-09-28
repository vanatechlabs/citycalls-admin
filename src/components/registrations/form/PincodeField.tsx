import { useRef } from 'react';
import { CircleCheck, Loader2, MapPinOff, TriangleAlert } from 'lucide-react';
import { areaCityLabel, useCheckPincode } from '@/lib/hooks/useGeo';
import { matchState } from '@/lib/registrations/constants';
import { Field } from '../shared/Field';
import { FIELD_INPUT } from '../shared/styles';

interface PincodeFieldProps {
  value: string;
  onChange: (pincode: string) => void;
  // Called with whatever the lookup could resolve; empty strings are skipped.
  onDetected: (location: { city: string; state: string }) => void;
}

// Pincode input that looks the area up as soon as 6 digits are entered and
// fills City / State — our branch coverage first, then India Post.
export function PincodeField({ value, onChange, onDetected }: PincodeFieldProps) {
  const checkPincode = useCheckPincode();
  // Only the latest lookup may fill the form — an older, slower response for
  // a pincode that was since edited is ignored.
  const latestPincode = useRef('');

  function handleChange(raw: string) {
    const pincode = raw.replace(/\D/g, '').slice(0, 6);
    onChange(pincode);
    latestPincode.current = pincode;
    if (pincode.length !== 6) {
      checkPincode.reset();
      return;
    }
    checkPincode.mutate(pincode, {
      onSuccess: (result, requested) => {
        if (requested !== latestPincode.current) return;
        onDetected({ city: areaCityLabel(result), state: matchState(result.state) });
      },
    });
  }

  const result = checkPincode.data;
  const city = result ? areaCityLabel(result) : '';

  let hint: React.ReactNode = null;
  if (checkPincode.isPending) {
    hint = <span className="flex items-center gap-1 text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Detecting city &amp; state...</span>;
  } else if (checkPincode.isError) {
    hint = <span className="flex items-center gap-1 text-amber-600"><TriangleAlert className="h-3 w-3" /> Could not detect — enter city &amp; state manually.</span>;
  } else if (result && !city && !result.state) {
    hint = <span className="flex items-center gap-1 text-red-500"><MapPinOff className="h-3 w-3" /> Pincode not found.</span>;
  } else if (result) {
    hint = result.serviceable ? (
      <span className="flex items-center gap-1 text-[#3e8914]">
        <CircleCheck className="h-3 w-3" /> Serviceable{result.subBranchName ? ` — ${result.subBranchName}` : result.branchName ? ` — ${result.branchName}` : ''}
      </span>
    ) : (
      <span className="flex items-center gap-1 text-amber-600">
        <TriangleAlert className="h-3 w-3" /> {[city, result.state].filter(Boolean).join(', ')} — outside our service area
      </span>
    );
  }

  return (
    <Field label="Pincode" required>
      <input
        required
        inputMode="numeric"
        pattern="\d{6}"
        title="6 digit pincode"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Enter pincode"
        className={FIELD_INPUT}
      />
      {hint && <div className="mt-1 text-[10px] font-bold">{hint}</div>}
    </Field>
  );
}
