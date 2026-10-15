'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CalendarRange, Loader2, Mail, MapPin, Phone, PhoneIncoming, Printer, UserRound, Wrench,
} from 'lucide-react';

import { DetailTable, SectionHeading, Td, Th } from '@/components/registrations/overview/DetailTable';
import { StatusBadge } from '@/components/registrations/shared/StatusBadge';
import { usePermission } from '@/lib/hooks/useAuth';
import { CUSTOMER_KIND_META, CustomerProfile, useCustomerProfile } from '@/lib/hooks/useCustomerProfiles';
import { displayCategoryName, formatDate, formatTime } from '@/lib/registrations/format';

// Customer Section → customer profile (also opened from the top-bar search):
// who they are, how many services they've had and of what, how often they
// were reopened, month by month, and every call / enquiry — in the
// Registration Overview style, kept compact.

const SOURCE_LABEL = { SERVICE_CALL: 'Service Call', CALL_ENQUIRY: 'Call Enquiry', WEBSITE_ENQUIRY: 'Website Enquiry' } as const;
const ENQUIRY_STATUS: Record<string, string> = {
  OPEN: 'border-amber-200 bg-amber-50 text-amber-700',
  CONVERTED: 'border-green-200 bg-green-50 text-green-700',
  CLOSED: 'border-slate-200 bg-slate-50 text-slate-600',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  CONTACTED: 'border-blue-200 bg-blue-50 text-blue-700',
  RESOLVED: 'border-green-200 bg-green-50 text-green-700',
};

// "2026-09" → "Sep 2026"
function monthLabel(month: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold ${className}`}>{children}</span>;
}

function StatTile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone: string }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <p className="text-[9.5px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-0.5 text-[18px] font-black leading-tight">{value}</p>
      {hint && <p className="truncate text-[10px] font-semibold opacity-75" title={hint}>{hint}</p>}
    </div>
  );
}

// Label + count with a bar sized against the largest row.
function BarList({ rows, empty }: { rows: { key: string; label: string; count: number; note?: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) return <p className="py-3 text-[11px] italic text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
            <span className="truncate font-semibold text-slate-700" title={row.label}>{row.label}</span>
            <span className="shrink-0 font-bold text-slate-900">
              {row.count}× {row.note && <span className="text-[10px] font-semibold text-red-600">{row.note}</span>}
            </span>
          </div>
          <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-[#3e8914]" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-2 border-gray-200 bg-white p-4 ${className}`}>
      <SectionHeading>{title}</SectionHeading>
      {children}
    </div>
  );
}

const TH = 'whitespace-nowrap px-2.5 py-1.5';
const TD = 'px-2.5 py-1.5';

function ProfileView({ profile }: { profile: CustomerProfile }) {
  const router = useRouter();
  const canCreate = usePermission('customers', 'create');
  const { customer: c, stats } = profile;
  const kind = CUSTOMER_KIND_META[profile.kind];
  const enquiryHref = `/dashboard/call-enquiries/add?${new URLSearchParams({ phone: c.phone, name: c.name })}`;

  return (
    <div className="-ml-3 -mt-3 min-h-[calc(100vh-100px)] w-[calc(100%+12px)] bg-slate-50 p-5 pb-10 print:m-0 print:w-full print:bg-white print:p-0">
      {/* Top bar */}
      <div className="mb-5 flex flex-col gap-3 bg-[#23471d] p-3 px-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-2 text-sm font-medium">
          <button type="button" onClick={() => router.back()} className="transition-opacity hover:opacity-80" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="truncate">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link> /{' '}
            <Link href="/dashboard/customer-profiles" className="hover:underline">All Customers</Link> / <span className="capitalize">{c.name}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-100">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          {canCreate && (
            <>
              <Link href={enquiryHref} className="flex items-center gap-1.5 bg-white px-3 py-1.5 text-xs font-bold text-[#23471d] shadow-sm hover:bg-slate-100">
                <PhoneIncoming className="h-3.5 w-3.5" /> Add Enquiry
              </Link>
              <Link href={`/dashboard/registrations/new?customer=${encodeURIComponent(c.customerCode)}`} className="flex items-center gap-1.5 bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600">
                <Wrench className="h-3.5 w-3.5" /> New Service Call
              </Link>
            </>
          )}
          <button type="button" onClick={() => router.push('/dashboard/customer-profiles')} className="flex items-center gap-1.5 bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>
      </div>

      <div className="space-y-5 border-2 border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeading action={<Pill className={kind.className}>{kind.label} customer</Pill>}>Customer Overview</SectionHeading>

        {/* Who they are */}
        <div className="flex flex-col gap-4 border-2 border-emerald-200 bg-[#f0fdf4] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#3e8914] bg-white text-[22px] font-black uppercase text-[#3e8914] shadow-sm">
              {c.name.trim()[0] ?? <UserRound className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-bold capitalize text-emerald-950">{c.name}</h3>
                <span className="border border-purple-300 bg-white px-2 py-0.5 font-mono text-[12px] font-extrabold tracking-wider text-purple-950">{c.customerCode}</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-medium text-slate-700">
                <a href={`tel:+91${c.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3 w-3 text-[#3e8914]" /> +91 {c.phone}</a>
                {c.altPhone && <span className="text-slate-500">Alt: {c.altPhone}</span>}
                {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="h-3 w-3 text-[#3e8914]" /> {c.email}</a>}
                {c.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-[#3e8914]" /> {[c.city, c.state].filter(Boolean).join(', ')}</span>}
              </p>
            </div>
          </div>
          <div className="text-[11px] font-medium text-emerald-900 md:text-right">
            <p className="flex items-center gap-1 md:justify-end"><CalendarRange className="h-3 w-3" /> Customer since <b>{formatDate(c.firstSeenAt)}</b></p>
            <p className="mt-0.5">Last activity <b>{formatDate(c.lastSeenAt)}</b> · {SOURCE_LABEL[c.lastSource]}</p>
          </div>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
          <StatTile label="Total Services" value={stats.services} tone="bg-[#ecf8ee] border-[#cdeccf] text-[#2f6b0f]" />
          <StatTile label="Completed" value={stats.completed} tone="bg-[#eaf3ff] border-[#cfe2fb] text-[#1d5fb8]" />
          <StatTile label="Open Now" value={stats.open} tone="bg-[#fff6e5] border-[#fbe2b0] text-[#a96400]" />
          <StatTile label="Reopens" value={stats.reopens} hint={stats.reopens ? `in ${stats.reopenedServices} service${stats.reopenedServices === 1 ? '' : 's'}` : undefined} tone="bg-[#fff0f3] border-[#f9d0da] text-[#b4234a]" />
          <StatTile label="Cancelled" value={stats.cancelled} tone="bg-[#f3f5f8] border-[#dde2ea] text-[#475569]" />
          <StatTile label="Call Enquiries" value={stats.callEnquiries} tone="bg-[#f3efff] border-[#ddd3fb] text-[#5b3cc4]" />
          <StatTile label="Web Enquiries" value={stats.websiteEnquiries} tone="bg-[#eefaf8] border-[#c9ece6] text-[#0f766e]" />
          <StatTile
            label="First → Last Service"
            value={<span className="text-[12px]">{stats.firstServiceAt ? `${formatDate(stats.firstServiceAt)}` : '—'}</span>}
            hint={stats.lastServiceAt ? `to ${formatDate(stats.lastServiceAt)}` : undefined}
            tone="bg-[#f7f9f4] border-[#dfe7d6] text-[#23471d]"
          />
        </div>

        {/* What they took, and when */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Services Taken" className="lg:col-span-2">
            {profile.byService.length === 0 ? (
              <p className="py-3 text-[11px] italic text-slate-400">No service calls yet — only enquiries.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 text-left text-[11.5px]">
                  <thead className="bg-[#f6f9f4] text-[10.5px] font-bold uppercase tracking-wide text-slate-600">
                    <tr>{['Service', 'Category', 'Times', 'Completed', 'Reopens', 'Last On'].map((h) => <th key={h} className={`${TH} border border-slate-200`}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {profile.byService.map((row) => (
                      <tr key={row.name}>
                        <td className={`${TD} border border-slate-200 font-semibold text-slate-800`}>{row.name}</td>
                        <td className={`${TD} border border-slate-200 text-slate-600`}>{displayCategoryName(row.category) || '—'}</td>
                        <td className={`${TD} border border-slate-200 font-black text-[#2f6b0f]`}>{row.count}×</td>
                        <td className={`${TD} border border-slate-200 text-slate-700`}>{row.completed ?? 0}</td>
                        <td className={`${TD} border border-slate-200 font-bold ${row.reopens ? 'text-red-600' : 'text-slate-400'}`}>{row.reopens ?? 0}</td>
                        <td className={`${TD} border border-slate-200 whitespace-nowrap text-slate-600`}>{row.lastAt ? formatDate(row.lastAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {profile.byBrand.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Brands:</span>
                {profile.byBrand.map((b) => <Pill key={b.name} className="border-slate-200 bg-slate-50 text-slate-700">{b.name} · {b.count}</Pill>)}
              </div>
            )}
          </Panel>

          <div className="space-y-4">
            <Panel title="By Category">
              <BarList
                empty="No services yet."
                rows={profile.byCategory.map((r) => ({ key: r.name, label: displayCategoryName(r.name), count: r.count, note: r.reopens ? `${r.reopens} reopen${r.reopens === 1 ? '' : 's'}` : undefined }))}
              />
            </Panel>
            <Panel title="Month-wise">
              <BarList empty="No services yet." rows={profile.byMonth.map((m) => ({ key: m.month, label: monthLabel(m.month), count: m.count }))} />
            </Panel>
          </div>
        </div>

        {/* Every service call */}
        <div>
          <SectionHeading>Service History ({profile.services.length})</SectionHeading>
          {profile.services.length === 0 ? (
            <p className="border-2 border-dashed border-slate-200 py-6 text-center text-[11.5px] text-slate-400">No service calls yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse border border-slate-200 text-left text-[11.5px]">
                <thead className="bg-[#233D4D] text-[10.5px] font-bold uppercase tracking-wide text-white">
                  <tr>{['Reg No', 'Service', 'Category', 'Brand / Type', 'Booked On', 'Visit', 'Status', 'Reopens', 'Closed On', 'Source'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profile.services.map((s) => (
                    <tr key={s._id} className="align-top hover:bg-slate-50/80">
                      <td className={TD}>
                        <Link href={`/dashboard/registrations/${s._id}`} className="font-mono font-bold text-blue-600 hover:underline">{s.registrationNo}</Link>
                      </td>
                      <td className={`${TD} font-semibold text-slate-800`}>{s.serviceName}{s.issues.length > 0 && <span className="block text-[10px] font-normal text-slate-500">{s.issues.slice(0, 2).join(', ')}</span>}</td>
                      <td className={`${TD} text-slate-600`}>{displayCategoryName(s.serviceCategory) || '—'}</td>
                      <td className={`${TD} text-slate-600`}>{[s.brand, s.applianceType].filter(Boolean).join(' · ') || '—'}</td>
                      <td className={`${TD} whitespace-nowrap text-slate-700`}>{formatDate(s.createdAt)}<span className="block text-[10px] text-slate-500">{formatTime(s.createdAt)}</span></td>
                      <td className={`${TD} whitespace-nowrap text-slate-700`}>{s.preferredDate ? formatDate(s.preferredDate) : '—'}{s.timeSlot && <span className="block text-[10px] text-slate-500">{s.timeSlot}</span>}</td>
                      <td className={TD}><StatusBadge status={s.status} /></td>
                      <td className={`${TD} font-bold ${s.reopens ? 'text-red-600' : 'text-slate-400'}`}>{s.reopens}</td>
                      <td className={`${TD} whitespace-nowrap text-slate-700`}>{s.closedAt ? formatDate(s.closedAt) : '—'}</td>
                      <td className={`${TD} text-[10px] font-bold text-slate-500`}>{s.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enquiries */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title={`Call Enquiries (${profile.callEnquiries.length})`}>
            {profile.callEnquiries.length === 0 ? (
              <p className="py-2 text-[11px] italic text-slate-400">None.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-[11.5px]">
                {profile.callEnquiries.map((e) => (
                  <li key={e._id} className="flex items-start justify-between gap-3 py-1.5">
                    <span className="min-w-0">
                      <Link href={`/dashboard/call-enquiries/add?editId=${e._id}`} className="font-mono font-bold text-blue-600 hover:underline">{e.enquiryNo}</Link>
                      <span className="ml-2 font-semibold text-slate-800">{e.serviceName}</span>
                      <span className="block text-[10px] text-slate-500">{formatDate(e.createdAt)} · via {e.source}{e.registrationNo ? ` · became ${e.registrationNo}` : ''}</span>
                    </span>
                    <Pill className={ENQUIRY_STATUS[e.status] ?? ENQUIRY_STATUS.CLOSED}>{e.status}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={`Website Enquiries (${profile.websiteEnquiries.length})`}>
            {profile.websiteEnquiries.length === 0 ? (
              <p className="py-2 text-[11px] italic text-slate-400">None.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-[11.5px]">
                {profile.websiteEnquiries.map((e) => (
                  <li key={e._id} className="flex items-start justify-between gap-3 py-1.5">
                    <span className="min-w-0">
                      <Link href={e.type === 'QUICK_BOOKING' ? '/dashboard/enquiries/quick-booking' : '/dashboard/enquiries/contact'} className="font-mono font-bold text-blue-600 hover:underline">{e.referenceNo}</Link>
                      <span className="ml-2 font-semibold text-slate-800">{e.services.join(', ') || e.subject || (e.type === 'QUICK_BOOKING' ? 'Quick Booking' : 'Contact')}</span>
                      <span className="block text-[10px] text-slate-500">{formatDate(e.createdAt)} · {e.type === 'QUICK_BOOKING' ? 'Quick Booking' : 'Contact form'}</span>
                    </span>
                    <Pill className={ENQUIRY_STATUS[e.status] ?? ENQUIRY_STATUS.CLOSED}>{e.status}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Contact & addresses */}
        <div>
          <SectionHeading>Contact &amp; Addresses</SectionHeading>
          <DetailTable>
            <tr>
              <Th>Mobile Number</Th>
              <Td className="font-semibold">{c.phone}{c.altPhone && <span className="ml-1 text-[11px] font-medium text-slate-500">(Alt: {c.altPhone})</span>}</Td>
              <Th>Email Address</Th>
              <Td>{c.email}</Td>
            </tr>
            {profile.addresses.length === 0 ? (
              <tr><Th>Address</Th><Td colSpan={3} /></tr>
            ) : (
              profile.addresses.map((a, i) => (
                <tr key={`${a.address}-${a.pincode}`}>
                  <Th>{i === 0 ? 'Latest Address' : `Address ${i + 1}`}</Th>
                  <Td colSpan={3}>
                    {a.address}, {a.city}, {a.state} – {a.pincode}
                    <span className="ml-2 text-[11px] text-slate-500">used {a.times}× · last {formatDate(a.lastUsedAt)}</span>
                  </Td>
                </tr>
              ))
            )}
          </DetailTable>
        </div>
      </div>
    </div>
  );
}

export default function CustomerProfilePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const key = decodeURIComponent(code);
  const { data: profile, isLoading, isError } = useCustomerProfile(key);

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading customer…</div>;
  }
  if (isError || !profile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-bold text-red-600">Customer “{key}” not found.</p>
        <Link href="/dashboard/customer-profiles" className="bg-[#3e8914] px-4 py-2 text-xs font-bold text-white hover:bg-[#347311]">All Customers</Link>
      </div>
    );
  }
  return <ProfileView profile={profile} />;
}
