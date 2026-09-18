'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BarChart4, PieChart, TrendingUp, Download, Users, Wrench, Megaphone } from 'lucide-react';

import { useBranches } from '@/lib/hooks/useOrganization';
import {
  useReport,
  ServiceRequestSummaryReport,
  BranchPerformanceRow,
  LeadFunnelReport,
  RevenueSummaryReport,
  TechnicianPerformanceRow,
} from '@/lib/hooks/useReports';

function downloadCsv<T extends object>(filename: string, rows: T[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]) as (keyof T)[];
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCard({
  icon,
  iconClass,
  title,
  description,
  isLoading,
  isError,
  children,
  onExport,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
  isLoading: boolean;
  isError: boolean;
  children: React.ReactNode;
  onExport: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`p-2 rounded-md ${iconClass}`}>{icon}</div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-2 border-t">
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading...</div>
        ) : isError ? (
          <div className="text-sm text-destructive py-4">Failed to load report.</div>
        ) : (
          children
        )}
        <div className="flex justify-end pt-2">
          <Button size="sm" variant="ghost" className="gap-2 text-primary" onClick={onExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { data: branches } = useBranches();
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const params = { branchId: branchId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const srSummary = useReport('service-request-summary', params);
  const branchPerf = useReport('branch-performance', params);
  const leadFunnel = useReport('lead-funnel', params);
  const revenue = useReport('revenue-summary', params);
  const techPerf = useReport('technician-performance', params);
  const campaignPerf = useReport('campaign-performance', params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Reports Catalog</h1>
          <p className="text-[13px] text-muted-foreground">Live operational reports, computed on demand from current data.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All Branches</option>
            {(branches || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <input type="date" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-sm text-muted-foreground">to</span>
          <input type="date" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportCard
          icon={<BarChart4 className="w-5 h-5" />}
          iconClass="bg-blue-50 text-blue-600"
          title="Service Request Summary"
          description="Breakdown of service requests by status, SLA breaches, and escalations."
          isLoading={srSummary.isLoading}
          isError={srSummary.isError}
          onExport={() => downloadCsv('service-request-summary.csv', (srSummary.data as ServiceRequestSummaryReport)?.byStatus ?? [])}
        >
          {srSummary.data && (
            <>
              <div className="flex gap-4 text-sm">
                <span><strong>{srSummary.data.totals.total}</strong> total</span>
                <span className="text-red-600"><strong>{srSummary.data.totals.slaBreached}</strong> SLA breached</span>
                <span className="text-amber-600"><strong>{srSummary.data.totals.escalated}</strong> escalated</span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
                {srSummary.data.byStatus.map((s) => (
                  <div key={s.status} className="flex justify-between"><span>{s.status}</span><span className="font-medium">{s.count}</span></div>
                ))}
              </div>
            </>
          )}
        </ReportCard>

        <ReportCard
          icon={<TrendingUp className="w-5 h-5" />}
          iconClass="bg-green-50 text-green-600"
          title="Branch Performance"
          description="Completion rate and revenue by branch."
          isLoading={branchPerf.isLoading}
          isError={branchPerf.isError}
          onExport={() => downloadCsv('branch-performance.csv', (branchPerf.data as BranchPerformanceRow[]) ?? [])}
        >
          <div className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
            {(branchPerf.data || []).map((b) => (
              <div key={b.branchId} className="flex justify-between">
                <span>{branches?.find((br) => br._id === b.branchId)?.name ?? b.branchId}</span>
                <span className="font-medium">{(b.completionRate * 100).toFixed(0)}% · ₹{b.revenue.toLocaleString('en-IN')}</span>
              </div>
            ))}
            {branchPerf.data?.length === 0 && <span>No data for this range.</span>}
          </div>
        </ReportCard>

        <ReportCard
          icon={<Users className="w-5 h-5" />}
          iconClass="bg-purple-50 text-purple-600"
          title="Lead Funnel"
          description="Lead distribution by stage and overall conversion rate."
          isLoading={leadFunnel.isLoading}
          isError={leadFunnel.isError}
          onExport={() => downloadCsv('lead-funnel.csv', (leadFunnel.data as LeadFunnelReport)?.byStage ?? [])}
        >
          {leadFunnel.data && (
            <>
              <div className="text-sm">
                <strong>{leadFunnel.data.total}</strong> leads · <strong>{(leadFunnel.data.conversionRate * 100).toFixed(1)}%</strong> converted
              </div>
              <div className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
                {leadFunnel.data.byStage.map((s) => (
                  <div key={s.stage} className="flex justify-between"><span>{s.stage}</span><span className="font-medium">{s.count}</span></div>
                ))}
              </div>
            </>
          )}
        </ReportCard>

        <ReportCard
          icon={<PieChart className="w-5 h-5" />}
          iconClass="bg-indigo-50 text-indigo-600"
          title="Revenue Summary"
          description="Invoiced vs. collected amounts, and outstanding balance."
          isLoading={revenue.isLoading}
          isError={revenue.isError}
          onExport={() => downloadCsv('revenue-summary.csv', (revenue.data as RevenueSummaryReport)?.byStatus ?? [])}
        >
          {revenue.data && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-xs text-slate-500">Invoiced</p><p className="font-semibold">₹{revenue.data.invoiced.toLocaleString('en-IN')}</p></div>
              <div><p className="text-xs text-slate-500">Collected</p><p className="font-semibold text-green-700">₹{revenue.data.collected.toLocaleString('en-IN')}</p></div>
              <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-semibold text-red-700">₹{revenue.data.outstanding.toLocaleString('en-IN')}</p></div>
            </div>
          )}
        </ReportCard>

        <ReportCard
          icon={<Wrench className="w-5 h-5" />}
          iconClass="bg-amber-50 text-amber-600"
          title="Technician Performance"
          description="Jobs assigned vs. completed per technician."
          isLoading={techPerf.isLoading}
          isError={techPerf.isError}
          onExport={() => downloadCsv('technician-performance.csv', (techPerf.data as TechnicianPerformanceRow[]) ?? [])}
        >
          <div className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
            {(techPerf.data || []).map((t) => (
              <div key={t.employeeId} className="flex justify-between">
                <span>{t.employeeId}</span>
                <span className="font-medium">{t.completed}/{t.assigned} ({(t.completionRate * 100).toFixed(0)}%)</span>
              </div>
            ))}
            {techPerf.data?.length === 0 && <span>No data for this range.</span>}
          </div>
        </ReportCard>

        <ReportCard
          icon={<Megaphone className="w-5 h-5" />}
          iconClass="bg-rose-50 text-rose-600"
          title="Campaign Performance"
          description="Delivery stats for marketing campaigns."
          isLoading={campaignPerf.isLoading}
          isError={campaignPerf.isError}
          onExport={() =>
            downloadCsv(
              'campaign-performance.csv',
              (campaignPerf.data || []).map((c) => ({ name: c.name, channel: c.channel, status: c.status, ...c.stats }))
            )
          }
        >
          <div className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
            {(campaignPerf.data || []).map((c) => (
              <div key={c.campaignId} className="flex justify-between">
                <span>{c.name}</span>
                <span className="font-medium">{c.stats.sent} sent, {c.stats.failed} failed</span>
              </div>
            ))}
            {campaignPerf.data?.length === 0 && <span>No campaigns for this range.</span>}
          </div>
        </ReportCard>
      </div>
    </div>
  );
}
