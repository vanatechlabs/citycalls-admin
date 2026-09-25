'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
import { useDashboardRangeStats } from '@/lib/hooks/useDashboard';

const STAGE_COLORS: Record<string, string> = {
  Open: '#f59e0b',
  Assigned: '#6366f1',
  'In Progress': '#0ea5e9',
  Resolved: '#22c55e',
};
const FUNNEL_COLORS = ['#8cc63f', '#65a30d', '#4d7c0f', '#3f6212', '#365314', '#1a2e05'];
const REVENUE_COLORS = ['#22c55e', '#f59e0b'];

// Lower dashboard-body panels (Request Pipeline, Lead Funnel, etc.) match
// the Bharat admin's Panel/PanelTitle components exactly — rounded-[11px],
// neutral border + double box-shadow, and a compact bg-[#f0f3f6] title bar
// with a 10.5px/600-weight heading. The 8 KPI StatCards above stay as-is.
// Plain divs (not the shadcn Card primitives) so nothing fights the exact
// Bharat spacing/border/shadow — Card's own py/ring utilities would.
const PANEL_CARD = 'rounded-[11px] border border-[#e5e7e6] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.02),0px_0px_0px_1px_rgba(27,31,35,0.15)] flex flex-col h-full overflow-hidden';
const PANEL_HEADER = 'shrink-0 flex flex-col justify-center gap-0.5 border-b border-slate-200/80 bg-[#f0f3f6] px-2.5 py-1.5';
const PANEL_TITLE = 'flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[-0.01em] text-black';
const PANEL_DESC = 'text-[9px] text-slate-500 font-medium';
const PANEL_CONTENT = 'px-2.5 pt-2 pb-2.5 flex-1 flex flex-col';

// Counts up from 0 to `target` once this span scrolls into view (same
// scroll-triggered, once-only count-up as Arogya's react-countup usage,
// without adding the dependency — plain rAF + IntersectionObserver).
function CountUpValue({ target, prefix = '', duration = 1500 }: { target: number; prefix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - (1 - progress) ** 3;
          setDisplay(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{prefix}{display.toLocaleString('en-IN')}</span>;
}

// Card container's bg gradient, box-shadow, corner radius, and floating
// bubble effect match the Arogya admin's dashboard StatsGrid.jsx exactly —
// title/number text sizes and the per-card icon/color/data stay CityCalls' own.
function StatCard({
  title, value, sub, icon: Icon, href, color, bg100, index, count, prefix,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href?: string;
  color: string;
  // Exact Tailwind `-100` pastel shade for this card's color (e.g. blue-100
  // for blue-500) — matches Arogya's `from-white from-50% to-{color}-100`
  // gradient precisely instead of approximating it with alpha-blended color.
  bg100: string;
  index: number;
  // Raw numeric value to scroll-triggered count up to — when provided (i.e.
  // data has loaded), this replaces the static `value` display.
  count?: number;
  prefix?: string;
}) {
  const body = (
    <div
      className="group relative p-4 border-2 border-slate-200 rounded-2xl transition-all duration-500 shadow-[rgba(60,64,67,0.3)_0px_1px_2px_0px,rgba(60,64,67,0.15)_0px_1px_3px_1px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:-translate-y-1 overflow-hidden h-full"
      style={{ backgroundImage: `linear-gradient(135deg, #ffffff 50%, ${bg100} 100%)` }}
    >
      {/* Small bubbles continuously floating up from the right side (always on) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <span className="absolute bottom-2 right-3 w-4 h-4 rounded-full opacity-60 animate-[floatUp_2.2s_ease-in_infinite]" style={{ backgroundColor: color }} />
        <span className="absolute bottom-2 right-10 w-3 h-3 rounded-full opacity-50 animate-[floatUp_2s_ease-in_0.5s_infinite]" style={{ backgroundColor: color }} />
        <span className="absolute bottom-2 right-6 w-2.5 h-2.5 rounded-full opacity-70 animate-[floatUp_2.6s_ease-in_1s_infinite]" style={{ backgroundColor: color }} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center shadow-md border border-gray-200" style={{ backgroundColor: color }}>
              <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide leading-tight">{title}</p>
          </div>
          <div
            className="px-2 py-0.5 text-[11px] font-bold border-2"
            style={{ backgroundColor: `${color}15`, color, borderColor: color }}
          >
            {index}
          </div>
        </div>

        <p className="text-2xl font-semibold mb-1 leading-none" style={{ color }}>
          {count !== undefined ? <CountUpValue target={count} prefix={prefix} /> : value}
        </p>
        {sub && <p className="text-[11px] text-gray-600 font-medium truncate">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{body}</Link> : body;
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

// Sub-stat chip used inside the TODAY / THIS WEEK / CUSTOM DATE panel —
// matches the Arogya admin's SubCard exactly (gradient bg, ring-style
// box-shadow, solid-color icon circle, uppercase label + bold value).
const SUB_CARD_COLORS: Record<string, { bg: string; iconBg: string; text: string }> = {
  blue: { bg: 'bg-gradient-to-br from-white to-[#dbeafe]', iconBg: 'bg-blue-500', text: 'text-blue-800' },
  emerald: { bg: 'bg-gradient-to-br from-white to-[#d1fae5]', iconBg: 'bg-emerald-500', text: 'text-emerald-800' },
  orange: { bg: 'bg-gradient-to-br from-white to-[#ffedd5]', iconBg: 'bg-orange-500', text: 'text-orange-800' },
  violet: { bg: 'bg-gradient-to-br from-white to-[#ede9fe]', iconBg: 'bg-violet-500', text: 'text-violet-800' },
};

function SubCard({ title, value, color, icon }: { title: string; value: React.ReactNode; color: keyof typeof SUB_CARD_COLORS; icon: React.ReactNode }) {
  const c = SUB_CARD_COLORS[color];
  return (
    <div
      className={`rounded-lg p-3 flex items-center gap-3 ${c.bg}`}
      style={{ boxShadow: 'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px' }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${c.iconBg}`}>
        {icon}
      </div>
      <div>
        <p className={`text-[10px] font-bold ${c.text} opacity-80 leading-tight uppercase`}>{title}</p>
        <p className={`text-lg font-bold ${c.text} leading-none mt-0.5`}>{value}</p>
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

  // --- TODAY / THIS WEEK / CUSTOM DATE panel ---
  const today = new Date();
  const monthStartDefault = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const todayDefault = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [customStartDate, setCustomStartDate] = useState(monthStartDefault);
  const [customEndDate, setCustomEndDate] = useState(todayDefault);
  const { data: rangeStats } = useDashboardRangeStats({ startDate: customStartDate, endDate: customEndDate });

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
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px] animate-in fade-in duration-500">
      <div className="mb-3 border-b pb-3">
        <h1 className="text-lg font-semibold text-[#3e8914] uppercase tracking-tight">
          Welcome back, {me?.name ?? '...'}
        </h1>
        <p className="text-gray-600 mt-1 text-sm">Here&apos;s what&apos;s happening across CityCalls today.</p>
      </div>

      {/* KPI row — bg/shadow/radius/bubble treatment matches Arogya admin's StatsGrid.jsx */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 0.85; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-90px) scale(1.1); opacity: 0; }
        }
      `}</style>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 mt-1">
        {canCalls && (
          <StatCard title="Total Calls Logged" icon={Phone} href="/dashboard/calls" color="#3b82f6" bg100="#dbeafe" index={1}
            value="—" count={callsLoading ? undefined : (totalCalls ?? 0)} sub={`${incomingCalls ?? 0} incoming`} />
        )}
        {canLeads && (
          <StatCard title="Total Leads" icon={Target} href="/dashboard/leads" color="#8b5cf6" bg100="#ede9fe" index={2}
            value="—" count={leadsLoading ? undefined : (totalLeads ?? 0)} sub={`${followUpLeads ?? 0} need follow-up`} />
        )}
        {canSR && (
          <StatCard title="Open Service Requests" icon={Ticket} href="/dashboard/service-requests" color="#f43f5e" bg100="#ffe4e6" index={3}
            value="—" count={srLoading ? undefined : (openSrCount ?? 0)}
            sub={srSummaryLoading ? undefined : `${srSummary?.totals.escalated ?? 0} escalated · ${srSummary?.totals.slaBreached ?? 0} SLA breached`} />
        )}
        {canVendors && (
          <StatCard title="Active Vendors" icon={Store} href="/dashboard/vendors" color="#f59e0b" bg100="#fef3c7" index={4}
            value="—" count={vendorsLoading ? undefined : (activeVendors ?? 0)} sub={`${blacklistedVendors ?? 0} blacklisted`} />
        )}
        {canEmployees && (
          <StatCard title="Active Employees" icon={Briefcase} href="/dashboard/employees" color="#0ea5e9" bg100="#e0f2fe" index={5}
            value="—" count={employeesLoading ? undefined : activeEmployeeCount} sub={`${employees?.length ?? 0} total on roster`} />
        )}
        {canHappyCalls && (
          <StatCard title="Happy Calls Pending" icon={SmilePlus} href="/dashboard/happy-calls" color="#ec4899" bg100="#fce7f3" index={6}
            value="—" count={happyCallsLoading ? undefined : pendingHappyCalls.length} sub={`of latest ${happyCalls?.length ?? 0} shown`} />
        )}
        {canHappyCalls && (
          <StatCard title="Recent Reopens" icon={RefreshCcw} href="/dashboard/reopen-requests" color="#fb923c" bg100="#ffedd5" index={7}
            value="—" count={reopenRequests?.length} sub="service requests reopened" />
        )}
        {canFinance && (
          <StatCard title="Revenue Collected" icon={IndianRupee} href="/dashboard/finance/invoices" color="#22c55e" bg100="#dcfce7" index={8}
            value="—" count={revenueLoading ? undefined : (revenue?.collected ?? 0)} prefix="₹"
            sub={revenue ? `of ₹${revenue.invoiced.toLocaleString('en-IN')} invoiced` : undefined} />
        )}
      </div>

      {/* TODAY / THIS WEEK / CUSTOM DATE panel — matches Arogya admin's
          time-based stats section (same card bg/border/box-shadow + SubCard
          chips), backed by Calls/Leads/Service Requests/Revenue counts. */}
      {canReports && rangeStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-300 shadow-[rgba(60,64,67,0.3)_0px_1px_2px_0px,rgba(60,64,67,0.15)_0px_1px_3px_1px]">
            <h3 className="text-center font-bold text-slate-800 mb-3 pb-3 border-b border-slate-200 tracking-wide text-sm">
              TODAY ({today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <SubCard title="Calls" value={rangeStats.today.calls.toLocaleString('en-IN')} color="blue" icon={<Phone size={16} />} />
              <SubCard title="Leads" value={rangeStats.today.leads.toLocaleString('en-IN')} color="emerald" icon={<Target size={16} />} />
              <SubCard title="Requests" value={rangeStats.today.serviceRequests.toLocaleString('en-IN')} color="orange" icon={<Ticket size={16} />} />
              <SubCard title="Revenue" value={`₹${rangeStats.today.revenue.toLocaleString('en-IN')}`} color="violet" icon={<IndianRupee size={16} />} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-300 shadow-[rgba(60,64,67,0.3)_0px_1px_2px_0px,rgba(60,64,67,0.15)_0px_1px_3px_1px]">
            <h3 className="text-center font-bold text-slate-800 mb-3 pb-3 border-b border-slate-200 tracking-wide text-sm">
              THIS WEEK
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <SubCard title="Calls" value={rangeStats.thisWeek.calls.toLocaleString('en-IN')} color="blue" icon={<Phone size={16} />} />
              <SubCard title="Leads" value={rangeStats.thisWeek.leads.toLocaleString('en-IN')} color="emerald" icon={<Target size={16} />} />
              <SubCard title="Requests" value={rangeStats.thisWeek.serviceRequests.toLocaleString('en-IN')} color="orange" icon={<Ticket size={16} />} />
              <SubCard title="Revenue" value={`₹${rangeStats.thisWeek.revenue.toLocaleString('en-IN')}`} color="violet" icon={<IndianRupee size={16} />} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-300 shadow-[rgba(60,64,67,0.3)_0px_1px_2px_0px,rgba(60,64,67,0.15)_0px_1px_3px_1px]">
            <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-slate-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs font-bold text-slate-600 border border-slate-200 outline-none bg-slate-50 px-2 py-1.5 rounded cursor-pointer"
              />
              <span className="text-slate-400 font-medium text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs font-bold text-slate-600 border border-slate-200 outline-none bg-slate-50 px-2 py-1.5 rounded cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SubCard title="Calls" value={rangeStats.custom.calls.toLocaleString('en-IN')} color="blue" icon={<Phone size={16} />} />
              <SubCard title="Leads" value={rangeStats.custom.leads.toLocaleString('en-IN')} color="emerald" icon={<Target size={16} />} />
              <SubCard title="Requests" value={rangeStats.custom.serviceRequests.toLocaleString('en-IN')} color="orange" icon={<Ticket size={16} />} />
              <SubCard title="Revenue" value={`₹${rangeStats.custom.revenue.toLocaleString('en-IN')}`} color="violet" icon={<IndianRupee size={16} />} />
            </div>
          </div>
        </div>
      )}

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
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><Ticket className="w-3 h-3 text-rose-500" /> Request Pipeline</h2>
              <p className={PANEL_DESC}>{srSummary?.totals.total ?? 0} requests, by stage</p>
            </div>
            <div className={`${PANEL_CONTENT} justify-center`}>
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
            </div>
          </div>
        )}
        {canReports && canLeads && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><TrendingUp className="w-3 h-3 text-purple-500" /> Lead Funnel</h2>
              <p className={PANEL_DESC}>
                {leadFunnel?.total ?? 0} leads · {leadFunnel ? Math.round(leadFunnel.conversionRate * 100) : 0}% converted
              </p>
            </div>
            <div className={PANEL_CONTENT}>
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
            </div>
          </div>
        )}
        {canReports && canFinance && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><IndianRupee className="w-3 h-3 text-emerald-500" /> Revenue Snapshot</h2>
              <p className={PANEL_DESC}>Across all invoices</p>
            </div>
            <div className={`${PANEL_CONTENT} space-y-3 justify-center`}>
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
            </div>
          </div>
        )}
        {canReports && canEmployees && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><Briefcase className="w-3 h-3 text-sky-500" /> Top Technicians</h2>
              <p className={PANEL_DESC}>By assigned requests</p>
            </div>
            <div className={`${PANEL_CONTENT} justify-center`}>
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
            </div>
          </div>
        )}

        {canLeads && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><User className="w-3 h-3 text-blue-500" /> Lead Follow-ups</h2>
              <p className={PANEL_DESC}>Leads awaiting your response</p>
            </div>
            <div className={PANEL_CONTENT}>
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
            </div>
          </div>
        )}

        {canHappyCalls && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><Phone className="w-3 h-3 text-amber-500" /> Pending Happy Calls</h2>
              <p className={PANEL_DESC}>Follow-ups required today</p>
            </div>
            <div className={PANEL_CONTENT}>
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
            </div>
          </div>
        )}

        {canCustomers && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><Target className="w-3 h-3 text-rose-500" /> Waitlist Overview</h2>
              <p className={PANEL_DESC}>Service areas we can&apos;t serve yet</p>
            </div>
            <div className={PANEL_CONTENT}>
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
            </div>
          </div>
        )}

        {canAudit && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><FileKey className="w-3 h-3 text-slate-500" /> Recent Activity</h2>
            </div>
            <div className={PANEL_CONTENT}>
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
            </div>
          </div>
        )}

        {canHappyCalls && (
          <div className={PANEL_CARD}>
            <div className={PANEL_HEADER}>
              <h2 className={PANEL_TITLE}><RefreshCcw className="w-3 h-3 text-orange-500" /> Recent Reopens</h2>
              <p className={PANEL_DESC}>Service requests reopened</p>
            </div>
            <div className={PANEL_CONTENT}>
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
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
