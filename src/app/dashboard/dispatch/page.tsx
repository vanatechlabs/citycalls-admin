'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Wrench, Store, GitBranch } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

import { useServiceRequests, useAssignServiceRequest, useUpdateServiceRequestStatus, ServiceRequest } from '@/lib/hooks/useServiceRequests';
import { useEmployees } from '@/lib/hooks/useEmployees';
import { useBranches, useSubBranches } from '@/lib/hooks/useOrganization';

// Statuses where the job is still active (counts toward a technician's
// current load) — mirrors the "not yet CLOSED/CANCELLED" idea without
// hardcoding every one of the 37 statuses individually.
const CLOSED_STATUSES = new Set(['CLOSED', 'CANCELLED']);
const DIRECT_TO_EMPLOYEE_STATUSES = new Set(['ASSIGNED_TO_BRANCH', 'ASSIGNED_TO_SUB_BRANCH', 'ASSIGNED_TO_TEAM', 'REASSIGNMENT_REQUIRED']);
const NEEDS_BRANCH_FIRST_STATUSES = new Set(['NEW', 'NEEDS_MANUAL_BRANCH_ASSIGNMENT']);
function dispatchReason(status: string): string | null {
  if (NEEDS_BRANCH_FIRST_STATUSES.has(status)) return 'Needs branch assignment';
  if (status === 'REASSIGNMENT_REQUIRED') return 'Needs re-assignment';
  if (DIRECT_TO_EMPLOYEE_STATUSES.has(status)) return 'Needs technician assignment';
  return null;
}

export default function DispatchBoardPage() {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [branchOverride, setBranchOverride] = useState<string | null>(null);
  const [subBranchChoice, setSubBranchChoice] = useState<string | null>(null);

  const { data: allRequests, isLoading: loadingReqs } = useServiceRequests();
  const { data: allEmployees, isLoading: loadingEmployees } = useEmployees();
  const { data: branches } = useBranches();
  const assignRequest = useAssignServiceRequest();
  const updateStatus = useUpdateServiceRequestStatus();
  const isBusy = assignRequest.isPending || updateStatus.isPending;
  const openRequests = allRequests?.filter((req) => !CLOSED_STATUSES.has(req.status)) || [];
  const selectedSr = openRequests.find((r) => r._id === selectedRequest) || null;

  // The branch this assignment is actually going through — the SR's own
  // branch once it has one, otherwise whatever the dispatcher picks below.
  const effectiveBranchId = selectedSr?.branchId || branchOverride;
  const { data: subBranches } = useSubBranches(effectiveBranchId || undefined);
  const hasSubBranches = (subBranches?.length ?? 0) > 0;

  // Picking a different SR resets the branch/sub-branch picks right in the
  // click handler (not a useEffect keyed on selectedRequest) — otherwise a
  // sub-branch chosen for the previous request could silently carry over
  // and filter the technician list for the wrong branch.
  const selectRequest = (id: string) => {
    setSelectedRequest(id);
    setBranchOverride(null);
    setSubBranchChoice(null);
    setAssignError(null);
  };

  const loadFor = (employeeId: string) =>
    (allRequests || []).filter((r) => r.assigneeId === employeeId && !CLOSED_STATUSES.has(r.status)).length;

  // Employees are only ever shown once a branch is settled, and are always
  // scoped to it (+ sub-branch, once that branch has any and one is picked)
  // — this was previously a flat list of every active employee company-wide,
  // which let a dispatcher assign a job to a technician in a completely
  // different branch.
  const scopedEmployees = effectiveBranchId
    ? (allEmployees || []).filter(
      (e) => e.active && e.branchId === effectiveBranchId && (!subBranchChoice || e.subBranchId === subBranchChoice)
    )
    : [];

  const handleAssign = async (employeeId: string) => {
    if (!selectedRequest || !selectedSr || !effectiveBranchId) return;
    setAssignError(null);
    try {
      if (NEEDS_BRANCH_FIRST_STATUSES.has(selectedSr.status)) {
        await assignRequest.mutateAsync({ id: selectedRequest, assigneeType: 'BRANCH', assigneeId: effectiveBranchId });
      } else if (!DIRECT_TO_EMPLOYEE_STATUSES.has(selectedSr.status)) {
        await updateStatus.mutateAsync({ id: selectedRequest, toStatus: 'REASSIGNMENT_REQUIRED', reason: 'Reassigned via Dispatch Board' });
      }
      if (subBranchChoice) {
        await assignRequest.mutateAsync({ id: selectedRequest, assigneeType: 'SUB_BRANCH', assigneeId: subBranchChoice });
      }
      await assignRequest.mutateAsync({ id: selectedRequest, assigneeType: 'EMPLOYEE', assigneeId: employeeId });
      setSelectedRequest(null);
      setBranchOverride(null);
      setSubBranchChoice(null);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setAssignError(err.response?.data?.message ?? (e instanceof Error ? e.message : 'Failed to assign this request.'));
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Dispatch Board</h1>
          <p className="text-[13px] text-muted-foreground">Assign open service requests to available technicians.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
        {/* Left Pane: All Open Requests (unassigned or already assigned — reassignable) */}
        <Card className="flex flex-col h-full shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Service Requests
              </CardTitle>
              <Badge variant="secondary">{openRequests.length} open</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingReqs ? (
              <div className="text-center text-muted-foreground p-8">Loading requests...</div>
            ) : openRequests.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">No open requests.</div>
            ) : (
              openRequests.map((req: ServiceRequest) => (
                <div
                  key={req._id}
                  onClick={() => selectRequest(req._id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${selectedRequest === req._id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900">{req.number}</h4>
                      <p className="text-sm font-medium">{req.customer?.name || 'Unknown'}</p>
                    </div>
                    <Badge variant={req.priority === 'HIGH' || req.priority === 'URGENT' ? 'destructive' : 'secondary'}>{req.priority}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <MapPin className="w-3 h-3" />
                    {req.addressSnapshot ? `${req.addressSnapshot.city}, ${req.addressSnapshot.pinCode}` : 'No address on file'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Wrench className="w-3 h-3" /> Status: {req.status}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {req.assignee ? (
                      <StatusBadge
                        label={`Assigned: ${req.assignee.name} (${req.assignee.type.replace(/_/g, ' ')})`}
                        category={req.assignee.type === 'EMPLOYEE' ? 'success' : 'info'}
                      />
                    ) : (
                      <StatusBadge label="Unassigned" category="error" />
                    )}
                    {dispatchReason(req.status) && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        {dispatchReason(req.status)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Pane: Branch → Sub-Branch → Technician */}
        <Card className="flex flex-col h-full shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-slate-500" />
                Assign
              </CardTitle>
              {effectiveBranchId && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{scopedEmployees.length} Available</Badge>}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 relative">
            {!selectedRequest ? (
              <div className="flex items-center justify-center h-full">
                <div className="bg-white p-4 rounded-lg shadow border text-sm font-medium text-slate-600">
                  Select a Service Request to assign it.
                </div>
              </div>
            ) : (
              <>
                {assignError && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-100 text-sm text-red-700">{assignError}</div>
                )}

                {/* Step 1: Branch — read-only display once the SR already has one; a
                    picker only when it genuinely doesn't (NEEDS_MANUAL_BRANCH_ASSIGNMENT) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Branch</label>
                  {selectedSr?.branchId ? (
                    <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800">
                      {branches?.find((b) => b._id === selectedSr.branchId)?.name ?? selectedSr.branchId}
                    </div>
                  ) : (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                      value={branchOverride ?? ''}
                      onChange={(e) => {
                        setBranchOverride(e.target.value || null);
                        setSubBranchChoice(null);
                      }}
                    >
                      <option value="">Select a branch...</option>
                      {branches?.filter((b) => b.active).map((b) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 2: Sub-branch — only shown at all when this branch actually
                    has sub-branches; otherwise assignment goes straight to Step 3. */}
                {effectiveBranchId && hasSubBranches && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Sub-Branch</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                      value={subBranchChoice ?? ''}
                      onChange={(e) => setSubBranchChoice(e.target.value || null)}
                    >
                      <option value="">Whole branch (any sub-branch)</option>
                      {subBranches?.filter((sb) => sb.active).map((sb) => (
                        <option key={sb._id} value={sb._id}>{sb.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 3: Employee — scoped to whatever was picked above. */}
                <div className="pt-2 space-y-3">
                  <label className="text-xs font-semibold text-slate-500">Employee</label>
                  {!effectiveBranchId ? (
                    <div className="text-center text-muted-foreground text-sm p-6 border border-dashed rounded-lg">Pick a branch first.</div>
                  ) : loadingEmployees ? (
                    <div className="text-center text-muted-foreground p-8">Loading technicians...</div>
                  ) : scopedEmployees.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm p-6 border border-dashed rounded-lg">
                      No active employees in this {subBranchChoice ? 'sub-branch' : 'branch'}.
                    </div>
                  ) : (
                    scopedEmployees.map((tech) => (
                      <div key={tech._id} className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 bg-white">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">{tech.userId?.name ?? 'Unknown'}</h4>
                              <p className="text-xs text-slate-500">{tech.userId?.mobile}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => handleAssign(tech._id)}
                            disabled={isBusy}
                          >
                            Assign
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                          <div>
                            <span className="text-slate-500 block">Current Load</span>
                            <span className="font-semibold text-slate-900">{loadFor(tech._id)} Active Jobs</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Daily Capacity</span>
                            <span className="font-semibold text-slate-900">{tech.dailyCapacity}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {(tech.skills || []).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-[10px] bg-slate-100">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
