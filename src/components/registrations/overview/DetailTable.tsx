import type { CSSProperties, ReactNode } from 'react';

// Label / value grid used on the overview page (two pairs per row), in the
// same style as the Arogya admin's delegate overview.

export function DetailTable({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse border border-slate-200">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="w-1/4 border border-slate-200 bg-[#f6f9f4] px-4 py-3 text-left align-middle text-[12.5px] font-bold text-slate-600">
      {children}
    </th>
  );
}

export function Td({ children, colSpan, className = '', style }: {
  children?: ReactNode; colSpan?: number; className?: string; style?: CSSProperties;
}) {
  const empty = children === undefined || children === null || children === '';
  return (
    <td colSpan={colSpan} style={style} className={`w-1/4 border border-slate-200 bg-white px-4 py-3 text-left align-middle text-[12.5px] text-slate-800 ${className}`}>
      {empty ? <span className="text-slate-400">—</span> : children}
    </td>
  );
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-full bg-[#3e8914]" />
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#23471d]">{children}</h2>
      </div>
      {action}
    </div>
  );
}
