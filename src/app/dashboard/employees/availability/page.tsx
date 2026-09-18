'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useEmployees, useUpdateEmployeeAvailability, Employee, AvailabilityDay } from '@/lib/hooks/useEmployees';
import { useBranches } from '@/lib/hooks/useOrganization';

// 0=Sunday .. 6=Saturday (matches JS Date#getDay(), the same convention
// citycalls-vendor-mobile's own availability toggle uses).
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isAvailable(availability: AvailabilityDay[] | undefined, day: number): boolean {
  const entry = availability?.find((a) => a.day === day);
  // No record for a day yet (technician never touched their toggle) is
  // treated as available — matches the vendor app's own default.
  return entry ? entry.available : true;
}

function DayCell({ employee, day, mutation }: { employee: Employee; day: number; mutation: ReturnType<typeof useUpdateEmployeeAvailability> }) {
  const available = isAvailable(employee.availability, day);
  const isThisCellPending =
    mutation.isPending && mutation.variables?.id === employee._id && mutation.variables?.availability.some((a) => a.day === day);

  const toggle = () => {
    const base = Array.from({ length: 7 }, (_, d) => ({
      day: d,
      available: d === day ? !available : isAvailable(employee.availability, d),
    }));
    mutation.mutate({ id: employee._id, availability: base });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={mutation.isPending}
      title={`${employee.userId?.name ?? 'Employee'} — ${DAY_LABELS[day]}: click to mark ${available ? 'unavailable' : 'available'}`}
      className={`w-9 h-9 rounded-md text-xs font-semibold transition-colors border ${
        isThisCellPending
          ? 'bg-slate-100 border-slate-200 text-slate-400'
          : available
          ? 'bg-green-100 border-green-200 text-green-700 hover:bg-green-200'
          : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
      }`}
    >
      {available ? '✓' : '—'}
    </button>
  );
}

export default function EmployeeAvailabilityPage() {
  const { data: employees, isLoading } = useEmployees();
  const { data: branches } = useBranches();
  const updateAvailability = useUpdateEmployeeAvailability();
  const [branchFilter, setBranchFilter] = useState<string>('');

  const filtered = useMemo(() => {
    const list = employees || [];
    return branchFilter ? list.filter((e) => e.branchId === branchFilter) : list;
  }, [employees, branchFilter]);

  const branchName = (id: string) => branches?.find((b) => b._id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Employee Availability</h1>
          <p className="text-[13px] text-muted-foreground">Weekly working-day roster — click a cell to mark someone available or unavailable.</p>
        </div>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="">All branches</option>
          {(branches || []).map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} employees</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading employees...</div>
          ) : filtered.length === 0 ? (
            <div className="flex justify-center p-8 text-muted-foreground">No employees found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 font-semibold">Employee</th>
                    <th className="text-left py-2 pr-4 font-semibold">Branch</th>
                    {DAY_LABELS.map((label) => (
                      <th key={label} className="py-2 px-1 font-semibold text-center w-11">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((emp) => (
                    <tr key={emp._id}>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{emp.userId?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{emp.userId?.mobile}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary" className="text-[11px]">{branchName(emp.branchId)}</Badge>
                      </td>
                      {DAY_LABELS.map((_, day) => (
                        <td key={day} className="py-2 px-1 text-center">
                          <DayCell employee={emp} day={day} mutation={updateAvailability} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
