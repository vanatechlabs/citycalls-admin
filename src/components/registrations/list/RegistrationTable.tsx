'use client';

import { useState } from 'react';
import {
  Calendar, CalendarClock, Check, CheckCheck, Edit, Eye, Layers, Mail, Phone, StickyNote, Tag, Trash2, User, UserCog, Wrench, X,
} from 'lucide-react';
import type { Registration, RegistrationStatus, StageNote } from '@/lib/hooks/useRegistrations';
import { STATUS_META } from '@/lib/registrations/constants';
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
  onAdvance: (row: Registration) => void;
  onDelete: (row: Registration) => void;
}

const TH = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-900';
const TD = 'px-4 py-2.5 align-top';

// Glassy action buttons, as in the Arogya admin's list.
const actionButton = (tone: 'blue' | 'amber' | 'red' | 'green' | 'indigo') => {
  const tones = {
    blue: 'text-blue-700 from-blue-400/30 to-blue-600/10 hover:shadow-[0_4px_15px_rgba(59,130,246,0.3)]',
    amber: 'text-amber-700 from-amber-400/30 to-amber-600/10 hover:shadow-[0_4px_15px_rgba(245,158,11,0.3)]',
    red: 'text-red-700 from-red-400/30 to-red-600/10 hover:shadow-[0_4px_15px_rgba(239,68,68,0.3)]',
    green: 'text-[#2f6b0f] from-[#3e8914]/30 to-[#3e8914]/10 hover:shadow-[0_4px_15px_rgba(62,137,20,0.35)]',
    indigo: 'text-indigo-700 from-indigo-400/30 to-indigo-600/10 hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]',
  };
  return `relative cursor-pointer overflow-hidden rounded-md border border-white/60 bg-gradient-to-br p-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-300 hover:scale-105 ${tones[tone]}`;
};

// SUPER_ADMIN → "Super Admin"
const formatRole = (role: string) => role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function NoteBlock({ label, note, tone }: { label: string; note?: StageNote; tone: 'indigo' | 'green' }) {
  if (!note) return null;
  const colors = tone === 'indigo' ? 'border-indigo-200 bg-indigo-50/60 text-indigo-900' : 'border-green-200 bg-green-50/70 text-green-900';
  return (
    <div className={`whitespace-pre-wrap break-words rounded-lg border px-3 py-2 ${colors}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-medium leading-snug">{note.note}</p>
      <p className="mt-1 text-[10px] font-semibold opacity-70">— {note.by.name}, {formatDate(note.at)}, {formatTime(note.at)}</p>
    </div>
  );
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
          <NoteBlock label="Active note" note={row.activationNote} tone="indigo" />
          <NoteBlock label="Completion note" note={row.completionNote} tone="green" />
        </div>
      </div>
    </div>
  );
}

export function RegistrationTable({
  stage, rows, startIndex, loading, selectedIds, onSelectionChange, onView, onEdit, onAdvance, onDelete,
}: RegistrationTableProps) {
  const pageIds = rows.map((r) => r._id);
  const allOnPageSelected = rows.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const showNotes = stage !== 'PENDING';
  const showStatus = !stage;
  const columnCount = 9 + (showNotes ? 1 : 0) + (showStatus ? 1 : 0);
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
        <table className="w-full min-w-[1300px] whitespace-nowrap text-sm">
          <thead className="border-b border-[#23471d]/10 bg-[#e8efe6]">
            <tr>
              <th className={`${TH} w-[80px]`}>
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
              <th className={TH}>Name &amp; Contact</th>
              <th className={TH}>Service / Category</th>
              <th className={TH}>Issue / Brand</th>
              <th className={TH}>Visit &amp; Coupon</th>
              {/* WEBSITE = booked on citycalls.in, ADMIN = added from New Registration */}
              <th className={TH}>Source</th>
              {showStatus && <th className={TH}>Status</th>}
              {showNotes && <th className={TH}>Notes</th>}
              <th className={TH}>Date &amp; Time</th>
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
                const next = STATUS_META[row.status].next;
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

                  <td className={TD}>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-fit rounded border border-green-200 bg-green-50 px-1 font-mono text-[9px] font-bold text-[#14532d]">
                          {row.registrationNo}
                        </span>
                        {/* Not opened by anyone yet */}
                        {!row.viewedAt && (
                          <span className="rounded-full bg-red-600 px-1.5 text-[8px] font-extrabold uppercase tracking-wide text-white">New</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#23471d]" />
                        <span className="text-[10.5px] font-bold text-red-600">{row.fullName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9.5px]">
                        <Phone className="ml-0.5 h-2.5 w-2.5 shrink-0 text-green-500" />
                        <span className="font-medium text-green-600">{row.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9.5px]">
                        <Mail className="ml-0.5 h-2.5 w-2.5 shrink-0 text-red-500" />
                        <a href={`mailto:${row.email}`} className="break-all font-medium text-blue-500 hover:underline">{row.email}</a>
                      </div>
                    </div>
                  </td>

                  <td className={TD}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start gap-1">
                        <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-[#3e8914]" />
                        <span className="text-[10.5px] font-bold text-[#063B00]">{row.serviceName}</span>
                      </div>
                      {row.serviceCategory && (
                        <div className="flex items-start gap-1">
                          <Layers className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                          <span className="text-[9.5px] font-medium text-blue-600">{row.serviceCategory}</span>
                        </div>
                      )}
                      {(row.applianceType || row.capacity) && (
                        <span className="text-[9px] font-semibold text-gray-500">
                          {[row.applianceType, row.capacity].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className={TD}>
                    <div className="flex max-w-[210px] flex-col gap-1">
                      <div className="flex flex-wrap gap-1">
                        {(expandedIssues.includes(row._id) ? row.issues : row.issues.slice(0, 2)).map((issue) => (
                          <span key={issue} className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">{issue}</span>
                        ))}
                        {row.issues.length > 2 && (
                          <button
                            type="button"
                            onClick={() => toggleIssues(row._id)}
                            className="cursor-pointer rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-600 hover:bg-gray-200"
                            title={expandedIssues.includes(row._id) ? 'Show less' : 'Show all issues'}
                          >
                            {expandedIssues.includes(row._id) ? 'Show less' : `+${row.issues.length - 2}`}
                          </button>
                        )}
                      </div>
                      {row.brand && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-red-500" />
                          <span className="text-[9.5px] font-semibold text-red-600">{row.brand}{row.modelNumber ? ` · ${row.modelNumber}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className={TD}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-800">
                        <CalendarClock className="h-3 w-3 text-[#23471d]" />
                        {row.preferredDate ? formatDate(row.preferredDate) : '—'}
                      </div>
                      {row.timeSlot && <span className="ml-4 text-[9px] font-medium text-blue-500">{row.timeSlot}</span>}
                      {row.couponCode ? (
                        <span className="w-fit rounded border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-600">{row.couponCode}</span>
                      ) : (
                        <span className="text-[9px] text-gray-400">No coupon</span>
                      )}
                    </div>
                  </td>

                  <td className={TD}><SourceBadge source={row.source} /></td>

                  {showStatus && <td className={TD}><StatusBadge status={row.status} /></td>}

                  {showNotes && (
                    <td className={TD}>
                      {row.activationNote || row.completionNote ? (
                        <button
                          type="button"
                          onClick={() => setNotesRow(row)}
                          className="flex cursor-pointer items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <StickyNote className="h-3 w-3" />
                          View
                          <span className="rounded-full bg-indigo-600 px-1.5 text-[8.5px] text-white">
                            {[row.activationNote, row.completionNote].filter(Boolean).length}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-gray-400">—</span>
                      )}
                    </td>
                  )}

                  <td className={TD}>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-800">
                        <Calendar className="h-3 w-3 text-[#23471d]" />
                        {formatDate(row.createdAt)}
                      </div>
                      <span className="ml-4 text-[9px] font-medium text-blue-500">{formatTime(row.createdAt)}</span>
                    </div>
                  </td>

                  <td className={TD}>
                    {row.updatedBy ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#4B1426]">
                          <UserCog className="h-3 w-3" />
                          {row.updatedBy.name}
                        </div>
                        {row.updatedBy.role && (
                          <span className="ml-4 w-fit rounded border border-[#4B1426]/20 bg-[#4B1426]/5 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-[#4B1426]">
                            {formatRole(row.updatedBy.role)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-400">—</span>
                    )}
                  </td>

                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      {next && (
                        <button
                          type="button"
                          onClick={() => onAdvance(row)}
                          className={actionButton(row.status === 'PENDING' ? 'green' : 'indigo')}
                          title={next.action}
                          aria-label={next.action}
                        >
                          {row.status === 'PENDING' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.5} />}
                        </button>
                      )}
                      <button type="button" onClick={() => onView(row)} className={actionButton('blue')} title="View details" aria-label="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => onEdit(row)} className={actionButton('amber')} title="Edit" aria-label="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => onDelete(row)} className={actionButton('red')} title="Delete" aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
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
