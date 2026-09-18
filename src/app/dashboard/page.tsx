'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone, PhoneCall, Target, Ticket, Store, Briefcase, SmilePlus, RefreshCcw,
  IndianRupee, Clock, FileKey, UserSquare2, Upload, BarChart4, TrendingUp, User, MapPin
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  FunnelChart, Funnel, LabelList, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

import { useMe, usePermission } from '@/lib/hooks/useAuth';
import { useCallsCount } from '@/lib/hooks/useCalls';
import { useLeads, useLeadsCount } from '@/lib/hooks/useLeads';
import {
  useServiceRequestsCount, OPEN_SERVICE_REQUEST_STATUSES,
  stageForStatus, SERVICE_REQUEST_STAGE_NAMES,
} from '@/lib/hooks/useServiceRequests';
import { useVendorsCount } from '@/lib/hooks/useVendors';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useHappyCalls, assignedToName, serviceRequestNumber } from '@/lib/hooks/useHappyCalls';
import { useReopenRequests } from '@/lib/hooks/useReopenRequests';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { useAuditLogs } from '@/lib/hooks/useAuditLogs';
import { useReport } from '@/lib/hooks/useReports';

const STAGE_COLORS: Record<string, string> = {
  Open: '#f59e0b',
  Assigned: '#6366f1',
  'In Progress': '#0ea5e9',
  Resolved: '#22c55e',
};
const FUNNEL_COLORS = ['#8cc63f', '#65a30d', '#4d7c0f', '#3f6212', '#365314', '#1a2e05'];
const REVENUE_COLORS = ['#22c55e', '#f59e0b'];

function StatCard({
  title, value, sub, icon: Icon, href, color,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  color: string;
}) {
  const body = (
    <Card size="sm" className={href ? 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 border-l-[3px] overflow-hidden relative group' : 'border-l-[3px] overflow-hidden relative'} style={{ borderLeftColor: color }}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="flex items-center gap-2 p-1.5">
        <div className="rounded-md p-1 shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="w-4 h-4 drop-shadow-sm" />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate leading-none mb-0.5">{title}</p>
          <div className="flex items-baseline gap-1.5 overflow-hidden">
            <span className="text-[15px] font-bold tracking-tight text-slate-800 leading-none">{value}</span>
            {sub && <span className="text-[9px] font-medium text-muted-foreground/80 truncate leading-none">{sub}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">{body}</Link> : body;
}

function DonutWithCenter({ data, colors, centerLabel, centerValue }: {
  data: { name: string; value: number }[];
  colors: string[];
  centerLabel: string;
  centerValue: React.ReactNode;
}) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[130px] h-[130px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={hasData ? data : [{ name: 'None', value: 1 }]} dataKey="value" nameKey="name" innerRadius={42} outerRadius={60} paddingAngle={2} strokeWidth={0}>
              {(hasData ? data : [{ name: 'None', value: 1 }]).map((entry, i) => (
                <Cell key={entry.name} fill={hasData ? colors[i % colors.length] : '#e5e7eb'} />
              ))}
            </Pie>
            {hasData && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold">{centerValue}</span>
          <span className="text-[10px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-xs gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="font-semibold shrink-0">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: me } = useMe();

  const canCalls = usePermission('calls');
  const canCreateCalls = usePermission('calls', 'create');
  const canLeads = usePermission('leads');
  const canImportLeads = usePermission('leads', 'import');
  const canSR = usePermission('serviceRequests');
  const canVendors = usePermission('vendors');
  const canEmployees = usePermission('employees');
  const canHappyCalls = usePermission('happyCalls');
  const canFinance = usePermission('finance');
  const canCustomers = usePermission('customers');
  const canCreateCustomers = usePermission('customers', 'create');
  const canAudit = usePermission('config', 'manageSettings');
  const canReports = usePermission('reports');

  // --- KPI row ---
  const { data: totalCalls, isLoading: callsLoading } = useCallsCount(undefined, { enabled: canCalls });
  const { data: incomingCalls } = useCallsCount({ direction: 'INCOMING' }, { enabled: canCalls });

  const { data: totalLeads, isLoading: leadsLoading } = useLeadsCount(undefined, { enabled: canLeads });
  const { data: followUpLeads } = useLeadsCount({ stage: 'FOLLOW_UP' }, { enabled: canLeads });

  const { data: openSrCount, isLoading: srLoading } = useServiceRequestsCount({ status_in: OPEN_SERVICE_REQUEST_STATUSES }, { enabled: canSR });

  const { data: activeVendors, isLoading: vendorsLoading } = useVendorsCount({ active: true }, { enabled: canVendors });
  const { data: blacklistedVendors } = useVendorsCount({ blacklisted: true }, { enabled: canVendors });

  const { data: employees, isLoading: employeesLoading } = useEmployees({ enabled: canEmployees });
  const activeEmployeeCount = (employees || []).filter((e) => e.active).length;

  const { data: happyCalls, isLoading: happyCallsLoading } = useHappyCalls({ enabled: canHappyCalls });
  const pendingHappyCalls = (happyCalls || []).filter((h) => h.status === 'PENDING');

  const { data: reopenRequests } = useReopenRequests({ enabled: canHappyCalls });

  // --- Reports-backed widgets (needs reports.view) ---
  const { data: srSummary, isLoading: srSummaryLoading } = useReport('service-request-summary', {}, { enabled: canReports && canSR });
  const { data: leadFunnel, isLoading: leadFunnelLoading } = useReport('lead-funnel', {}, { enabled: canReports && canLeads });
  const { data: revenue, isLoading: revenueLoading } = useReport('revenue-summary', {}, { enabled: canReports && canFinance });
  const { data: technicianPerf } = useReport('technician-performance', {}, { enabled: canReports && canEmployees });

  const stageCounts = SERVICE_REQUEST_STAGE_NAMES.map((stage) => ({
    name: stage,
    value: (srSummary?.byStatus ?? []).reduce((sum, row) => (stageForStatus(row.status) === stage ? sum + row.count : sum), 0),
  }));

  const funnelData = (leadFunnel?.byStage ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((s) => ({ name: s.stage.replace(/_/g, ' '), value: s.count }));

  const topTechnicians = (technicianPerf ?? [])
    .slice()
    .sort((a, b) => b.assigned - a.assigned)
    .slice(0, 5)
    .map((row) => ({
      ...row,
      name: employees?.find((e) => e._id === row.employeeId)?.userId?.name ?? 'Unknown',
    }));
  const technicianChartData = topTechnicians.map((t) => ({ name: t.name.split(' ')[0], Assigned: t.assigned, Completed: t.completed }));

  // --- Follow-ups ---
  const { data: followUpLeadsList, isLoading: followUpListLoading } = useLeads({ stage: 'FOLLOW_UP', limit: 5 }, { enabled: canLeads });

  // --- Recent activity ---
  const { data: auditPage, isLoading: auditLoading } = useAuditLogs({ limit: 6 }, { enabled: canAudit });

  // --- Service area waitlist ---
  const { data: waitlistCustomers, isLoading: waitlistLoading } = useCustomers({ tag: 'waitlist' }, { enabled: canCustomers });
  const waitlistByPincode = (waitlistCustomers || []).reduce<Record<string, number>>((acc, c) => {
    const pincodeTag = c.tags?.find((t) => t.startsWith('waitlist-'))?.replace('waitlist-', '');
    if (pincodeTag) acc[pincodeTag] = (acc[pincodeTag] || 0) + 1;
    return acc;
  }, {});
  const topWaitlistPincodes = Object.entries(waitlistByPincode).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-2 animate-in fade-in duration-500 max-w-[1500px] mx-auto pb-8">
      <div className="pb-1 mb-1 border-b border-border/50">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">{me?.name ?? '...'}</span>
        </h1>
        <p className="text-[13px] text-muted-foreground">Here&apos;s what&apos;s happening across CityCalls today.</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 mt-1">
        {canCalls && (
          <StatCard title="Total Calls Logged" icon={Phone} href="/dashboard/calls" color="#3b82f6"
            value={callsLoading ? '—' : totalCalls} sub={`${incomingCalls ?? 0} incoming`} />
        )}
        {canLeads && (
          <StatCard title="Total Leads" icon={Target} href="/dashboard/leads" color="#8b5cf6"
            value={leadsLoading ? '—' : totalLeads} sub={`${followUpLeads ?? 0} need follow-up`} />
        )}
        {canSR && (
          <StatCard title="Open Service Requests" icon={Ticket} href="/dashboard/service-requests" color="#f43f5e"
            value={srLoading ? '—' : openSrCount}
            sub={srSummaryLoading ? undefined : `${srSummary?.totals.escalated ?? 0} escalated · ${srSummary?.totals.slaBreached ?? 0} SLA breached`} />
        )}
        {canVendors && (
          <StatCard title="Active Vendors" icon={Store} href="/dashboard/vendors" color="#f59e0b"
            value={vendorsLoading ? '—' : activeVendors} sub={`${blacklistedVendors ?? 0} blacklisted`} />
        )}
        {canEmployees && (
          <StatCard title="Active Employees" icon={Briefcase} href="/dashboard/employees" color="#0ea5e9"
            value={employeesLoading ? '—' : activeEmployeeCount} sub={`${employees?.length ?? 0} total on roster`} />
        )}
        {canHappyCalls && (
          <StatCard title="Happy Calls Pending" icon={SmilePlus} href="/dashboard/happy-calls" color="#ec4899"
            value={happyCallsLoading ? '—' : pendingHappyCalls.length} sub={`of latest ${happyCalls?.length ?? 0} shown`} />
        )}
        {canHappyCalls && (
          <StatCard title="Recent Reopens" icon={RefreshCcw} href="/dashboard/reopen-requests" color="#fb923c"
            value={reopenRequests?.length ?? '—'} sub="service requests reopened" />
        )}
        {canFinance && (
          <StatCard title="Revenue Collected" icon={IndianRupee} href="/dashboard/finance/invoices" color="#22c55e"
            value={revenueLoading ? '—' : `₹${(revenue?.collected ?? 0).toLocaleString('en-IN')}`}
            sub={revenue ? `of ₹${revenue.invoiced.toLocaleString('en-IN')} invoiced` : undefined} />
        )}
      </div>

      {/* Quick Actions Strip - Full Width */}
      {(canCreateCalls || canCreateCustomers || canImportLeads || canReports || canSR || canVendors) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 mt-1">
          {canCreateCalls && (
            <Link href="/dashboard/calls/entry" className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50/50 transition-all group overflow-hidden">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md group-hover:scale-110 transition-transform shrink-0">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[12px] font-semibold text-slate-800 truncate leading-tight">Log New Call</span>
                <span className="text-[9px] text-muted-foreground font-medium truncate leading-tight">Record a conversation</span>
              </div>
            </Link>
          )}
          {canCreateCustomers && (
            <Link href="/dashboard/customers/create" className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group overflow-hidden">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md group-hover:scale-110 transition-transform shrink-0">
                <UserSquare2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[12px] font-semibold text-slate-800 truncate leading-tight">Add Customer</span>
                <span className="text-[9px] text-muted-foreground font-medium truncate leading-tight">Register new client</span>
              </div>
            </Link>
          )}
          {canImportLeads && (
            <Link href="/dashboard/leads/import" className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:border-purple-300 hover:bg-purple-50/50 transition-all group overflow-hidden">
              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-md group-hover:scale-110 transition-transform shrink-0">
                <Upload className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[12px] font-semibold text-slate-800 truncate leading-tight">Import Leads</span>
                <span className="text-[9px] text-muted-foreground font-medium truncate leading-tight">Upload CSV data</span>
              </div>
            </Link>
          )}
          {canReports && (
            <Link href="/dashboard/reports" className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:border-orange-300 hover:bg-orange-50/50 transition-all group overflow-hidden">
              <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md group-hover:scale-110 transition-transform shrink-0">
                <BarChart4 className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[12px] font-semibold text-slate-800 truncate leading-tight">View Reports</span>
                <span className="text-[9px] text-muted-foreground font-medium truncate leading-tight">Analyze performance</span>
              </div>
            </Link>
          )}
          {canSR && (
            <Link href="/dashboard/service-requests/create" className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:border-rose-300 hover:bg-rose-50/50 transition-all group overflow-hidden">
              <div className="p-1.5 bg-rose-100 text-rose-600 rounded-md group-hover:scale-110 transition-transform shrink-0">
                <Ticket className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[12px] font-semibold text-slate-800 truncate leading-tight">New Request</span>
                <span className="text-[9px] text-muted-foreground font-medium truncate leading-tight">Create service ticket</span>
              </div>
            </Link>
          )}
          {canVendors && (
            <Link href="/dashboard/vendors/create" className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:border-amber-300 hover:bg-amber-50/50 transition-all group overflow-hidden">
              <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md group-hover:scale-110 transition-transform shrink-0">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[12px] font-semibold text-slate-800 truncate leading-tight">Add Vendor</span>
                <span className="text-[9px] text-muted-foreground font-medium truncate leading-tight">Register service partner</span>
              </div>
            </Link>
          )}
        </div>
      )}


      {/* Dashboard Body - 3 Column Grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mt-1">
        {canReports && canSR && (
          <Card size="sm" className="overflow-hidden shadow-sm border-t-[3px] border-t-rose-500 hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            <CardHeader className="pb-2 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><Ticket className="w-4 h-4 text-rose-500" /> Request Pipeline</CardTitle>
              <CardDescription className="text-xs">{srSummary?.totals.total ?? 0} requests, by stage</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex-1 flex flex-col justify-center">
              {srSummaryLoading ? (
                <div className="flex items-center justify-center h-[160px]">
                  <Skeleton className="w-[140px] h-[140px] rounded-full" />
                </div>
              ) : (
                <DonutWithCenter
                  data={stageCounts}
                  colors={stageCounts.map((s) => STAGE_COLORS[s.name] ?? '#94a3b8')}
                  centerLabel="Total"
                  centerValue={srSummary?.totals.total ?? 0}
                />
              )}
            </CardContent>
          </Card>
        )}
        {canReports && canLeads && (
          <Card size="sm" className="overflow-hidden shadow-sm border-t-[3px] border-t-purple-500 hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            <CardHeader className="pb-2 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><TrendingUp className="w-4 h-4 text-purple-500" /> Lead Funnel</CardTitle>
              <CardDescription className="text-xs">
                {leadFunnel?.total ?? 0} leads · {leadFunnel ? Math.round(leadFunnel.conversionRate * 100) : 0}% converted
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex-1 flex flex-col">
              {leadFunnelLoading ? (
                <div className="space-y-3 max-h-[160px]">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-1/4" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : funnelData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads yet.</p>
              ) : (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 pb-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {funnelData.map((entry, i) => {
                    const maxVal = Math.max(...funnelData.map((d) => d.value), 1);
                    const percentage = Math.max(1, (entry.value / maxVal) * 100);
                    return (
                      <div key={entry.name} className="relative group">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="font-medium text-slate-700 capitalize truncate pr-2 group-hover:text-purple-700 transition-colors">
                            {entry.name.toLowerCase()}
                          </span>
                          <span className="text-slate-500 font-bold tabular-nums shrink-0">{entry.value}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {canReports && canFinance && (
          <Card size="sm" className="overflow-hidden shadow-sm border-t-[3px] border-t-emerald-500 hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            <CardHeader className="pb-2 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><IndianRupee className="w-4 h-4 text-emerald-500" /> Revenue Snapshot</CardTitle>
              <CardDescription className="text-xs">Across all invoices</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3 flex-1 flex flex-col justify-center">
              {revenueLoading ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Skeleton className="w-[100px] h-[100px] rounded-full" />
                  <div className="w-full space-y-3 pt-2">
                    <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /></div>
                    <div className="flex justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-14" /></div>
                  </div>
                </div>
              ) : (
                <>
                  <DonutWithCenter
                    data={[{ name: 'Collected', value: revenue?.collected ?? 0 }, { name: 'Outstanding', value: revenue?.outstanding ?? 0 }]}
                    colors={REVENUE_COLORS}
                    centerLabel="Invoiced"
                    centerValue={`₹${((revenue?.invoiced ?? 0) / 1000).toFixed(0)}k`}
                  />
                  <div className="space-y-1.5 pt-3 border-t">
                    {(revenue?.byStatus ?? []).map((s) => (
                      <div key={s.status} className="flex justify-between items-center text-[13px]">
                        <span className="text-muted-foreground">{s.status} <span className="text-[11px] opacity-70">({s.count})</span></span>
                        <span className="font-semibold text-slate-700">₹{s.total.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
        {canReports && canEmployees && (
          <Card size="sm" className="overflow-hidden shadow-sm border-t-[3px] border-t-sky-500 hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            <CardHeader className="pb-2 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><Briefcase className="w-4 h-4 text-sky-500" /> Top Technicians</CardTitle>
              <CardDescription className="text-xs">By assigned requests</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex-1 flex flex-col justify-center">
              {topTechnicians.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignment data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={technicianChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                    <Bar dataKey="Assigned" fill="#bae6fd" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="Completed" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {canLeads && (
          <Card size="sm" className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50 border-border/60 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border/40 mb-3 bg-white/50 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><User className="w-4 h-4 text-blue-500" /> Lead Follow-ups</CardTitle>
              <CardDescription className="text-xs">Leads awaiting your response</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 flex-1 flex flex-col">
              {followUpListLoading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !followUpLeadsList || followUpLeadsList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No leads awaiting follow-up.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {followUpLeadsList.map((l) => (
                    <Link key={l._id} href={`/dashboard/leads/${l._id}`} className="group flex items-center justify-between p-2.5 bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-lg shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-semibold text-slate-700 group-hover:text-blue-600 transition-colors truncate max-w-[140px]">{l.contactName || l.number}</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">{l.followUpDate ? new Date(l.followUpDate).toLocaleDateString() : 'Today'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canHappyCalls && (
          <Card size="sm" className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50 border-border/60 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border/40 mb-3 bg-white/50 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><Phone className="w-4 h-4 text-amber-500" /> Pending Happy Calls</CardTitle>
              <CardDescription className="text-xs">Follow-ups required today</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 flex-1 flex flex-col">
              {happyCallsLoading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingHappyCalls.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No happy calls pending.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {pendingHappyCalls.slice(0, 5).map((h) => (
                    <div key={h._id} className="group flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-semibold text-slate-700 truncate">SR {serviceRequestNumber(h)}</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 truncate max-w-[100px]">{assignedToName(h)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canCustomers && (
          <Card size="sm" className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50 border-border/60 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border/40 mb-3 bg-white/50 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><Target className="w-4 h-4 text-rose-500" /> Waitlist Overview</CardTitle>
              <CardDescription className="text-xs">Service areas we can&apos;t serve yet</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 flex-1 flex flex-col">
              {waitlistLoading ? (
                <div className="space-y-4 py-2">
                  <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-12" /></div>
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1"><Skeleton className="h-3 w-1/2" /></div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (waitlistCustomers?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No one is waiting right now.</p>
              ) : (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-semibold text-slate-700">{waitlistCustomers?.length} people waiting</span>
                    <Link href="/dashboard/customers/waitlist" className="text-xs font-medium text-primary hover:underline">View all</Link>
                  </div>
                  <div className="space-y-2">
                    {topWaitlistPincodes.map(([pincode, count]) => (
                      <div key={pincode} className="group flex items-center justify-between p-2.5 bg-white border border-slate-100 hover:border-rose-100 rounded-lg shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <span className="text-[13px] font-medium text-slate-700">Pincode {pincode}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <span className="text-[11px] font-bold text-rose-600">{count} waiting</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canAudit && (
          <Card size="sm" className="shadow-sm hover:shadow-md transition-shadow border-border/60 bg-slate-50/30 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border/40 mb-3 bg-white/50 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><FileKey className="w-4 h-4 text-slate-500" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 flex-1 flex flex-col">
              {auditLoading ? (
                <div className="space-y-4 py-2 ml-4 relative before:absolute before:inset-y-0 before:-left-[11px] before:w-px before:bg-slate-100">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative pl-6">
                      <Skeleton className="absolute -left-[15px] top-1 w-2 h-2 rounded-full box-content border-2 border-white" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !auditPage || auditPage.items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No recent activity.</p>
              ) : (
                <div className="space-y-2 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-border/60 ml-1 mt-1 max-h-[160px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {auditPage.items.map((log) => (
                    <div key={log.id} className="relative pl-9 py-2 group">
                      <div className="absolute left-[3px] top-4 w-2 h-2 rounded-full bg-slate-300 group-hover:bg-primary transition-colors border-2 border-white box-content shadow-sm z-10" />
                      <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-slate-100 shadow-sm group-hover:border-primary/20 transition-colors">
                        <span className="text-[13px] text-slate-700 leading-tight">
                          <span className="font-semibold text-slate-900">{log.user}</span>{' '}
                          <span className="text-slate-500">{log.action.toLowerCase().replace(/_/g, ' ')} <span className="font-medium text-slate-700">{log.entityType.toLowerCase()}</span></span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canHappyCalls && (
          <Card size="sm" className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/50 border-border/60 flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border/40 mb-3 bg-white/50 flex-none">
              <CardTitle className="flex items-center gap-2 text-[15px]"><RefreshCcw className="w-4 h-4 text-orange-500" /> Recent Reopens</CardTitle>
              <CardDescription className="text-xs">Service requests reopened</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 flex-1 flex flex-col">
              {!reopenRequests || reopenRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No recent reopens.</p>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {reopenRequests.slice(0, 5).map((r) => (
                    <div key={r.id} className="group flex flex-col p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-slate-700">SR {r.requestNumber || r.originalServiceRequestId.slice(-4)}</span>
                        <span className="text-[11px] font-medium text-orange-600 bg-orange-50 px-1.5 rounded">{r.status}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 truncate">{r.customerName} - {r.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
