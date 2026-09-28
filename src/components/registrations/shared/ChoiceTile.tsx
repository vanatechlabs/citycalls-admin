import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface ChoiceTileProps {
  selected: boolean;
  onClick: () => void;
  // "check" shows a corner tick (multi / single pick); "radio" a dot on the left.
  variant?: 'check' | 'radio';
  children: ReactNode;
}

export function ChoiceTile({ selected, onClick, variant = 'check', children }: ChoiceTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex cursor-pointer select-none items-center gap-1.5 border-2 px-2 py-2 text-[11px] font-bold transition-colors ${
        variant === 'radio' ? 'justify-start' : 'justify-center text-center'
      } ${selected ? 'border-[#3e8914] bg-[#3e8914]/10 text-[#3e8914]' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}
    >
      {variant === 'radio' && (
        <span className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#3e8914]' : 'border-gray-400'}`}>
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-[#3e8914]" />}
        </span>
      )}
      {variant === 'check' && selected && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#3e8914] text-white">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}
