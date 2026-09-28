import type { Registration } from '@/lib/hooks/useRegistrations';
import { STATUS_META } from './constants';
import { formatDate, formatTime } from './format';

const COLUMNS: [header: string, value: (r: Registration, index: number) => string][] = [
  ['S.NO', (_, i) => String(i + 1)],
  ['Registration No', (r) => r.registrationNo],
  ['Name', (r) => r.fullName],
  ['Phone', (r) => r.phone],
  ['Alternate Phone', (r) => r.altPhone ?? ''],
  ['Email', (r) => r.email],
  ['Service', (r) => r.serviceName],
  ['Category', (r) => r.serviceCategory ?? ''],
  ['Brand', (r) => r.brand ?? ''],
  ['Model', (r) => r.modelNumber ?? ''],
  ['Type', (r) => r.applianceType ?? ''],
  ['Capacity / Size', (r) => r.capacity ?? ''],
  ['Issues', (r) => r.issues.join(', ')],
  ['Description', (r) => r.issueDescription],
  ['Visit Date', (r) => (r.preferredDate ? formatDate(r.preferredDate) : '')],
  ['Time Slot', (r) => r.timeSlot ?? ''],
  ['Coupon', (r) => r.couponCode ?? ''],
  ['Address', (r) => r.address],
  ['City', (r) => r.city],
  ['State', (r) => r.state],
  ['Pincode', (r) => r.pincode],
  ['Status', (r) => STATUS_META[r.status].label],
  ['Active Note', (r) => r.activationNote?.note ?? ''],
  ['Active Note By', (r) => (r.activationNote ? `${r.activationNote.by.name}, ${formatDate(r.activationNote.at)} ${formatTime(r.activationNote.at)}` : '')],
  ['Completion Note', (r) => r.completionNote?.note ?? ''],
  ['Completion Note By', (r) => (r.completionNote ? `${r.completionNote.by.name}, ${formatDate(r.completionNote.at)} ${formatTime(r.completionNote.at)}` : '')],
  ['Source', (r) => r.source],
  ['Registered On', (r) => `${formatDate(r.createdAt)} ${formatTime(r.createdAt)}`],
  ['Created By', (r) => r.createdBy?.name ?? ''],
  ['Updated By', (r) => r.updatedBy?.name ?? ''],
  ['Updated On', (r) => `${formatDate(r.updatedAt)} ${formatTime(r.updatedAt)}`],
];

function csvCell(value: string) {
  // Quote everything; neutralise leading =,+,-,@ so Excel never runs a formula.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Downloads a CSV (opens directly in Excel) — BOM so ₹ and Hindi text survive.
export function downloadRegistrationsCsv(rows: Registration[], fileName: string) {
  const lines = [
    COLUMNS.map(([header]) => csvCell(header)).join(','),
    ...rows.map((row, i) => COLUMNS.map(([, value]) => csvCell(value(row, i))).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
