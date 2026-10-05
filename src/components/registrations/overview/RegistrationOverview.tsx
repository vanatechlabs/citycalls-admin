'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CalendarClock, ClipboardCheck, Edit, ImageIcon, Printer, TicketPercent, Wrench,
} from 'lucide-react';

import { useEffect } from 'react';
import { useMarkRegistrationViewed, useRegistrationServices, Registration } from '@/lib/hooks/useRegistrations';
import { ALL_CATEGORIES, registrationListPath, stageSlugOf, STATUS_META, STATUS_TRANSITIONS } from '@/lib/registrations/constants';
import { formatDate, formatTime, resolveMediaUrl } from '@/lib/registrations/format';
import { SourceBadge, StatusBadge } from '../shared/StatusBadge';
import { useStageTransition } from '../shared/useStageTransition';
import { ActivityTimeline } from './ActivityTimeline';
import { DetailTable, SectionHeading, Td, Th } from './DetailTable';

function Chip({ children, tone = 'amber' }: { children: React.ReactNode; tone?: 'amber' | 'green' | 'red' }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    green: 'border-green-200 bg-green-50 text-green-700',
    red: 'border-red-200 bg-red-50 text-red-600',
  };
  return <span className={`inline-block rounded-md border px-2 py-0.5 text-[11.5px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function RegistrationOverview({ registration: r }: { registration: Registration }) {
  const router = useRouter();
  const { changeStatus, isPending } = useStageTransition();
  const { mutate: markViewed } = useMarkRegistrationViewed();

  // Opening a new (unread) registration clears it from the sidebar badges.
  useEffect(() => {
    if (!r.viewedAt) markViewed(r._id);
  }, [r._id, r.viewedAt, markViewed]);
  const stage = STATUS_META[r.status];
  // Back goes to this registration's own category + stage list.
  const { data: menus = [] } = useRegistrationServices();
  const categorySlug = menus.find((m) => m.name === r.serviceCategory)?.slug ?? ALL_CATEGORIES;
  const listPath = registrationListPath(categorySlug, stageSlugOf(r.status));

  return (
    <div className="-ml-3 -mt-3 min-h-[calc(100vh-100px)] w-[calc(100%+12px)] bg-slate-50 p-5 pb-10 print:m-0 print:w-full print:bg-white print:p-0">
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-3 bg-[#23471d] p-3 px-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-2 text-sm font-medium">
          <button type="button" onClick={() => router.back()} className="transition-opacity hover:opacity-80" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link> /{' '}
            <Link href={listPath} className="hover:underline">{stage.listTitle}</Link> / {r.fullName}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-white px-4 py-1.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-100">
            <Printer className="h-4 w-4" /> Print
          </button>
          <Link href={`/dashboard/registrations/${r._id}/edit`} className="flex items-center gap-1.5 bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600">
            <Edit className="h-4 w-4" /> Edit
          </Link>
          <button type="button" onClick={() => router.push(listPath)} className="flex items-center gap-1.5 bg-red-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </div>

      <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
        <SectionHeading
          action={
            <div className="flex items-center gap-2.5 print:hidden">
              {/* One button per status this call can move to (each asks for a note). */}
              {STATUS_TRANSITIONS[r.status].map((target) => (
                <button
                  key={target}
                  type="button"
                  disabled={isPending}
                  onClick={() => void changeStatus(r, target)}
                  className={`flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs transition-colors disabled:opacity-60 ${STATUS_META[target].button}`}
                >
                  {STATUS_META[target].action}
                </button>
              ))}
              <span className="border border-[#3e8914]/30 bg-[#3e8914]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#23471d]">
                {r.serviceCategory ?? 'Service'} Call
              </span>
            </div>
          }
        >
          Registration Overview
        </SectionHeading>

        {/* Highlight card */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 border-2 border-emerald-200 bg-[#f0fdf4] p-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-[#3e8914] bg-white shadow-sm">
              <Wrench className="h-7 w-7 text-[#3e8914]" />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-950">{r.serviceName}</h3>
                <StatusBadge status={r.status} />
              </div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                <CalendarClock className="h-3.5 w-3.5" />
                Visit: {r.preferredDate ? formatDate(r.preferredDate) : 'Not scheduled'}{r.timeSlot ? `, ${r.timeSlot}` : ''}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Reg No:</span>
                <span className="border border-purple-300 bg-white px-2.5 py-1 font-mono text-sm font-extrabold tracking-wider text-purple-950 shadow-xs">
                  {r.registrationNo}
                </span>
              </div>
            </div>
          </div>
          {r.couponCode && (
            <div className="flex items-center gap-2 border-2 border-dashed border-[#4B1426]/40 bg-white px-4 py-2">
              <TicketPercent className="h-5 w-5 text-[#4B1426]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Coupon Applied</p>
                <p className="font-mono text-sm font-extrabold tracking-wider text-[#4B1426]">{r.couponCode}</p>
              </div>
            </div>
          )}
        </div>

        <DetailTable>
          <tr>
            <Th>Full Name</Th>
            <Td className="text-[14px] font-semibold" style={{ color: '#2563eb' }}>{r.fullName}</Td>
            <Th>Registration No</Th>
            <Td className="font-mono font-bold" style={{ color: '#4E1F6E' }}>{r.registrationNo}</Td>
          </tr>
          <tr>
            <Th>Date of Registration</Th>
            <Td className="font-semibold" style={{ color: '#dc2626' }}>
              {formatDate(r.createdAt)} <span className="ml-2 text-blue-600">{formatTime(r.createdAt)}</span>
            </Td>
            <Th>Source</Th>
            <Td><SourceBadge source={r.source} /></Td>
          </tr>
          <tr>
            <Th>Selected Service</Th>
            <Td className="font-semibold" style={{ color: '#063B00' }}>{r.serviceName}</Td>
            <Th>Service Category</Th>
            <Td className="font-semibold text-blue-600">{r.serviceCategory}</Td>
          </tr>
          <tr>
            <Th>Preferred Visit Date</Th>
            <Td className="font-semibold">{r.preferredDate ? formatDate(r.preferredDate) : undefined}</Td>
            <Th>Time Slot</Th>
            <Td>{r.timeSlot && <Chip tone="green">{r.timeSlot}</Chip>}</Td>
          </tr>
          <tr>
            <Th>Discount Applied</Th>
            <Td>{r.couponCode && <Chip tone="red">{r.couponCode} Applied</Chip>}</Td>
            <Th>Status</Th>
            <Td><StatusBadge status={r.status} size="md" /></Td>
          </tr>
          <tr>
            <Th>Mobile Number</Th>
            <Td className="font-medium" style={{ color: '#2563eb' }}>
              {r.phone}
              {r.altPhone && <span className="ml-1 text-[11px] font-medium text-slate-500">(Alt: {r.altPhone})</span>}
            </Td>
            <Th>Email Address</Th>
            <Td className="font-medium" style={{ color: '#2563eb' }}>{r.email}</Td>
          </tr>
          <tr>
            <Th>Created By</Th>
            <Td className="font-semibold">
              {r.createdBy?.name}
              <span className="ml-2 text-[11px] font-medium text-blue-600">{formatDate(r.createdAt)} {formatTime(r.createdAt)}</span>
            </Td>
            <Th>Updated By</Th>
            <Td className="font-semibold text-[#4B1426]">
              {r.updatedBy?.name}
              <span className="ml-2 text-[11px] font-medium text-blue-600">{formatDate(r.updatedAt)} {formatTime(r.updatedAt)}</span>
            </Td>
          </tr>
          <tr>
            <Th>Preferred Language</Th>
            <Td>{r.language}</Td>
            <Th>Heard About Us</Th>
            <Td>
              {r.heardFrom}
              {r.referenceName && <span className="ml-1 text-[11px] text-slate-500">(Ref: {r.referenceName})</span>}
            </Td>
          </tr>
        </DetailTable>

        <div className="mt-10">
          <SectionHeading>Notes &amp; Activity</SectionHeading>
          <ActivityTimeline registration={r} />
        </div>

        <div className="mt-10">
          <SectionHeading>Issue Details</SectionHeading>
          <DetailTable>
            <tr>
              <Th>Brand</Th>
              <Td className="font-semibold text-red-600">{r.brand}</Td>
              <Th>Model Number</Th>
              <Td className="font-mono">{r.modelNumber}</Td>
            </tr>
            <tr>
              <Th>Type</Th>
              <Td className="font-semibold">{r.applianceType}</Td>
              <Th>Capacity / Size</Th>
              <Td>{r.capacity}</Td>
            </tr>
            <tr>
              <Th>Reported Issues</Th>
              <Td colSpan={3}>
                {r.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">{r.issues.map((issue) => <Chip key={issue}>{issue}</Chip>)}</div>
                )}
              </Td>
            </tr>
            <tr>
              <Th>Issue Description</Th>
              <Td colSpan={3} className="whitespace-pre-wrap leading-relaxed">{r.issueDescription}</Td>
            </tr>
            <tr>
              <Th>How Often</Th>
              <Td>{r.issueFrequency}</Td>
              <Th>Safety Concern</Th>
              <Td className={r.safetyConcern && r.safetyConcern !== 'No safety concern' ? 'font-bold text-red-600' : ''}>{r.safetyConcern}</Td>
            </tr>
            {/* Service-specific answers from the website form, two per row */}
            {Array.from({ length: Math.ceil((r.extraDetails?.length ?? 0) / 2) }, (_, i) => r.extraDetails!.slice(i * 2, i * 2 + 2)).map((pair) => (
              <tr key={pair[0].label}>
                <Th>{pair[0].label}</Th>
                <Td colSpan={pair[1] ? undefined : 3}>{pair[0].value}</Td>
                {pair[1] && (
                  <>
                    <Th>{pair[1].label}</Th>
                    <Td>{pair[1].value}</Td>
                  </>
                )}
              </tr>
            ))}
            <tr>
              <Th>Photos</Th>
              <Td colSpan={3}>
                {r.photos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {r.photos.map((url) => (
                      <a key={url} href={resolveMediaUrl(url)} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 border-2 border-gray-200 transition hover:border-[#3e8914]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveMediaUrl(url)} alt="Issue photo" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium italic text-slate-400"><ImageIcon className="h-3.5 w-3.5" /> Not Uploaded</span>
                )}
              </Td>
            </tr>
          </DetailTable>
        </div>

        <div className="mt-10">
          <SectionHeading>Address &amp; Location</SectionHeading>
          <DetailTable>
            <tr>
              <Th>Complete Address</Th>
              <Td colSpan={3}>{r.address}</Td>
            </tr>
            <tr>
              <Th>City</Th>
              <Td>{r.city}</Td>
              <Th>State</Th>
              <Td>{r.state}</Td>
            </tr>
            <tr>
              <Th>Pincode</Th>
              <Td className="font-mono">{r.pincode}</Td>
              <Th>Instructions</Th>
              <Td>{r.instructions}</Td>
            </tr>
          </DetailTable>
        </div>
      </div>
    </div>
  );
}
