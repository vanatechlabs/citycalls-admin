'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { useAuditLogs, AUDIT_LOG_MODULES } from '@/lib/hooks/useAuditLogs';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [entityType, setEntityType] = useState('');
  const { data, isLoading, isError } = useAuditLogs({ page, limit: 20, module, entityType });
  const logs = data?.items ?? [];
  const meta = data?.meta;

  const updateFilter = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">System Audit Logs</h1>
          <p className="text-[13px] text-muted-foreground">Immutable trail of all actions performed within the system.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-1">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription className="mt-1">Showing recent system actions. This table is strictly read-only.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Module</label>
              <select className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 text-sm" value={module} onChange={updateFilter(setModule)}>
                <option value="">All modules</option>
                {AUDIT_LOG_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Entity Type</label>
              <input
                className="h-9 w-[250px] rounded-md border border-input bg-transparent px-3 text-sm"
                placeholder="e.g. LEAD, CUSTOMER"
                value={entityType}
                onChange={updateFilter(setEntityType)}
              />
            </div>
            {(module || entityType) && (
              <Button size="sm" variant="ghost" onClick={() => { setModule(''); setEntityType(''); setPage(1); }}>
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Loading audit logs...</div>
          ) : isError ? (
            <div className="flex justify-center p-8 text-destructive">Failed to load audit logs.</div>
          ) : (
            <>
            {/* <p className="text-sm text-muted-foreground mb-2">{meta?.total ?? logs.length} entries</p> */}
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User / Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">No audit log entries found.</TableCell>
                    </TableRow>
                  ) : (
                    logs.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{item.user}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                            item.action === 'CREATE' || item.action === 'CREATED' ? 'bg-green-100 text-green-800' :
                            item.action === 'UPDATE' || item.action === 'UPDATED' ? 'bg-blue-100 text-blue-800' :
                            item.action === 'DELETE' || item.action === 'DELETED' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {item.action}
                          </span>
                        </TableCell>
                        <TableCell>{item.module}</TableCell>
                        <TableCell>{item.entityType}</TableCell>
                        <TableCell><span className="font-mono text-xs">{item.entityId}</span></TableCell>
                        <TableCell>{item.reason ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                  <span>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
