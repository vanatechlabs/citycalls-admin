'use client';

import { useState } from 'react';
import {
  ArrowRightLeft, Edit, Eye, StickyNote, Trash2, X,
} from 'lucide-react';
import type { Registration, RegistrationStatus } from '@/lib/hooks/useRegistrations';
import { STATUS_META, STATUS_TRANSITIONS } from '@/lib/registrations/constants';
import { formatDate, formatTime } from '@/lib/registrations/format';
import { SourceBadge, StatusBadge } from '../shared/StatusBadge';

interface RegistrationTableProps {
  // undefined on the "All" page: adds a Status column, per-row actions.
  stage?: RegistrationStatus;
  rows: Registration[];
  startIndex: number;
  loading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onView: (row: Registration) => void;
  onEdit: (row: Registration) => void;
  onChangeStatus: (row: Registration) => void;
  onDelete: (row: Registration) => void;
}

const TH = 'px-3 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-white';
// One fact per column, at most two short lines per cell, rows centred.
const TD = 'px-3 py-2.5 align-middle';

// Glassy action buttons, as in the Arogya admin's list.
const actionButton = (tone: 'blue' | 'amber' | 'red' | 'green' | 'indigo') => {
  const tones = {
    blue: 'text-blue-700 from-blue-400/30 to-blue-600/10 hover:shadow-[0_4px_15px_rgba(59,130,246,0.3)]',
    amber: 'text-amber-700 from-amber-400/30 to-amber-600/10 hover:shadow-[0_4px_15px_rgba(245,158,11,0.3)]',
    red: 'text-red-700 from-red-400/30 to-red-600/10 hover:shadow-[0_4px_15px_rgba(239,68,68,0.3)]',
    green: 'text-[#2f6b0f] from-[#3e8914]/30 to-[#3e8914]/10 hover:shadow-[0_4px_15px_rgba(62,137,20,0.35)]',
    indigo: 'text-indigo-700 from-indigo-400/30 to-indigo-600/10 hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]',
  };
  return `relative cursor-pointer overflow-hidden rounded-md border border-white/60 bg-gradient-to-br p-1 shadow-[0_4px_10px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-300 hover:scale-105 ${tones[tone]}`;
};

// SUPER_ADMIN → "Super Admin"
const formatRole = (role: string) => role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Every status move that has a note, newest first.
function notesOf(row: Registration) {
  return (row.statusHistory ?? []).filter((entry) => entry.note).slice().reverse();
}

function NotesDialog({ row, onClose }: { row: Registration; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registration notes"
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-[#063B00]">Notes</p>
            <p className="font-mono text-[10px] font-semibold text-gray-500">{row.registrationNo} · {row.fullName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-4">
          {notesOf(row).map((entry, i) => (
            <div key={`${entry.at}-${i}`} className={`whitespace-pre-wrap break-words rounded-lg border px-3 py-2 ${STATUS_META[entry.to].badge}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                {entry.from ? `${STATUS_META[entry.from].label} → ` : ''}{STATUS_META[entry.to].label}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-gray-900">{entry.note}</p>
              <p className="mt-1 text-[10px] font-semibold opacity-80">— {entry.by.name}, {formatDate(entry.at)}, {formatTime(entry.at)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RegistrationTable({
  stage, rows, startIndex, loading, selectedIds, onSelectionChange, onView, onEdit, onChangeStatus, onDelete,
}: RegistrationTableProps) {
  const pageIds = rows.map((r) => r._id);
  const allOnPageSelected = rows.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  // New calls have no notes yet.
  const showNotes = stage !== 'NEW';
  const showStatus = !stage;
  const columnCount = 11 + (showNotes ? 1 : 0) + (showStatus ? 1 : 0);
  // Rows whose "+N" issues chip was clicked to show every issue.
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);
  const [notesRow, setNotesRow] = useState<Registration | null>(null);

  function toggleIssues(id: string) {
    setExpandedIssues((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  function toggleAll(checked: boolean) {
    onSelectionChange(checked
      ? Array.from(new Set([...selectedIds, ...pageIds]))
      : selectedIds.filter((id) => !pageIds.includes(id)));
  }

  function toggleOne(id: string, checked: boolean) {
    onSelectionChange(checked ? [...selectedIds, id] : selectedIds.filter((s) => s !== id));
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3e8914] border-t-transparent" />
        </div>
      )}

      <div className="thin-scrollbar overflow-x-auto bg-white">
        <table className="w-full min-w-[1250px] whitespace-nowrap text-sm">
          <thead className="bg-[#233D4D]">
            <tr>
              <th className={`${TH} w-[70px]`}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer accent-[#3e8914]"
                    title="Select / deselect all on this page"
                  />
                  S.NO
                </div>
              </th>
              <th className={TH}>Name</th>
              <th className={TH}>Mobile / Email</th>
              <th className={TH}>Service</th>
              <th className={TH}>Issue</th>
              <th className={TH}>Brand</th>
              <th className={TH}>Visit</th>
              <th className={TH}>Coupon</th>
              {/* WEBSITE = booked on citycalls.in, ADMIN = added from New Registration */}
              <th className={TH}>Source</th>
              {showStatus && <th className={TH}>Status</th>}
              {showNotes && <th className={TH}>Notes</th>}
              <th className={TH}>Received On</th>
              <th className={TH}>Updated By</th>
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="py-12 text-center text-sm text-gray-400">
                  {loading ? 'Loading registrations...' : 'No data found'}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const canMove = STATUS_TRANSITIONS[row.status].length > 0;
                const noteCount = notesOf(row).length;
                const issuesExpanded = expandedIssues.includes(row._id);
                return (
                <tr key={row._id} className={`transition hover:bg-[#3e8914]/5 ${selectedIds.includes(row._id) ? 'bg-[#3e8914]/5' : ''}`}>
                  <td className={TD}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row._id)}
                        onChange={(e) => toggleOne(row._id, e.target.checked)}
                        className="h-3.5 w-3.5 cursor-pointer accent-[#3e8914]"
                      />
                      <span className="text-xs font-semibold text-gray-800">{startIndex + index + 1}</span>
                    </div>
                  </td>

                  {/* Name: CityCalls registration ID on top, customer name below */}
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[9px] font-semibold tracking-wide text-[#2f6b0f]">{row.registrationNo}</span>
                      {/* Not opened by anyone yet */}
                      {!row.viewedAt && (
                        <span className="rounded-full bg-red-600 px-1.5 text-[8px] font-extrabold uppercase tracking-wide text-white">New</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-[#1e3a5f]">{row.fullName}</p>
                  </td>

                  {/* Mobile number on top, email below */}
                  <td className={TD}>
                    <a href={`tel:+91${row.phone}`} className="block text-[10px] font-medium text-slate-800 hover:text-[#2f6b0f]">+91 {row.phone}</a>
                    <a href={`mailto:${row.email}`} title={row.email} className="block max-w-[180px] truncate text-[9px] text-sky-700 hover:underline">{row.email}</a>
                  </td>

                  <td className={TD}>
                    <p className="text-[10px] font-semibold text-orange-600">{row.serviceName}</p>
                    <p className="text-[9px] font-medium text-teal-700">{row.serviceCategory || '—'}</p>
                  </td>

                  <td className={TD}>
                    <div className="flex max-w-[190px] flex-wrap items-center gap-1 whitespace-normal">
                      {(issuesExpanded ? row.issues : row.issues.slice(0, 1)).map((issue) => (
                        <span key={issue} className="rounded border border-slate-300 px-1.5 py-0.5 text-[9px] font-medium text-slate-700">{issue}</span>
                      ))}
                      {row.issues.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleIssues(row._id)}
                          className="cursor-pointer rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600 hover:bg-red-100"
                          title={issuesExpanded ? 'Show less' : row.issues.slice(1).join(', ')}
                        >
                          {issuesExpanded ? 'Less' : `+${row.issues.length - 1}`}
                        </button>
                      )}
                    </div>
                  </td>

                  <td className={TD}>
                    <p className="text-[10px] font-semibold text-purple-700">{row.brand || '—'}</p>
                    {row.modelNumber && <p className="text-[9px] text-slate-500">{row.modelNumber}</p>}
                  </td>

                  <td className={TD}>
                    <p className="text-[10px] font-medium text-slate-800">{row.preferredDate ? formatDate(row.preferredDate) : 'Not set'}</p>
                    {row.timeSlot && <p className="text-[9px] font-medium text-blue-600">{row.timeSlot}</p>}
                  </td>

                  <td className={TD}>
                    {row.couponCode ? (
                      <span className="rounded border border-dashed border-[#3e8914]/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#2f6b0f]">{row.couponCode}</span>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>

                  <td className={TD}><SourceBadge source={row.source} /></td>

                  {showStatus && <td className={TD}><StatusBadge status={row.status} /></td>}

                  {showNotes && (
                    <td className={TD}>
                      {noteCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setNotesRow(row)}
                          className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 py-0.5 text-[9px] font-semibold text-slate-700 transition hover:border-sky-600 hover:text-sky-700"
                        >
                          <StickyNote className="h-3 w-3" />
                          View
                          <span className="rounded-full bg-slate-700 px-1.5 text-[8.5px] text-white">{noteCount}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </td>
                  )}

                  <td className={TD}>
                    <p className="text-[10px] font-medium text-slate-800">{formatDate(row.createdAt)}</p>
                    <p className="text-[9px] font-medium text-blue-600">{formatTime(row.createdAt)}</p>
                  </td>

                  <td className={TD}>
                    {row.updatedBy ? (
                      <>
                        <p className="text-[10px] font-medium text-slate-800">{row.updatedBy.name}</p>
                        {row.updatedBy.role && (
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#4B1426]">{formatRole(row.updatedBy.role)}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>

                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      {canMove && (
                        <button
                          type="button"
                          onClick={() => onChangeStatus(row)}
                          className={actionButton('green')}
                          title="Change status (with a note)"
                          aria-label="Change status"
                        >
                          <ArrowRightLeft className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                      )}
                      <button type="button" onClick={() => onView(row)} className={actionButton('blue')} title="View details" aria-label="View details">
                        <Eye className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => onEdit(row)} className={actionButton('amber')} title="Edit" aria-label="Edit">
                        <Edit className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => onDelete(row)} className={actionButton('red')} title="Delete" aria-label="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {notesRow && <NotesDialog row={notesRow} onClose={() => setNotesRow(null)} />}
    </div>
  );
}
