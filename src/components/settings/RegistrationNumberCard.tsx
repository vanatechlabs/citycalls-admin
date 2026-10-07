'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import { Hash, RotateCcw, Save } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { usePermission } from '@/lib/hooks/useAuth';
import {
  RegistrationNumberSettings, RegistrationNumberSettingsResponse,
  useRegistrationNumberSettings, useUpdateRegistrationNumberSettings,
} from '@/lib/hooks/useRegistrationNumberSettings';

// Settings → Registration Number series. Every part of e.g. CC2026100705 can
// be changed here; the running number restarts at 01 whenever the date part
// changes (daily when the day is in the number).

const DEFAULTS: RegistrationNumberSettings = {
  prefix: 'CC', includeYear: true, includeMonth: true, includeDay: true, sequenceDigits: 2, separator: '',
};

// Today's date in India time, like the server uses.
function todayParts() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

function resetLabel(s: RegistrationNumberSettings) {
  if (s.includeDay) return 'every day';
  if (s.includeMonth) return 'every month';
  if (s.includeYear) return 'every year';
  return 'never (one running number)';
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || 'Could not save the settings.';
}

const LABEL = 'mb-1 block text-[9px] font-bold uppercase tracking-wide text-gray-500';
const INPUT = 'w-full rounded border border-gray-300 px-2 py-1.5 text-[12px] font-semibold outline-none focus:border-[#3e8914] disabled:bg-gray-50';

export function RegistrationNumberCard() {
  const { data, isLoading } = useRegistrationNumberSettings();
  if (isLoading || !data) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b bg-[#233D4D] px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Registration Number Series</h2>
        </div>
        <p className="p-4 text-[11px] text-gray-400">Loading…</p>
      </div>
    );
  }
  // Re-mounts with fresh form values whenever the saved settings change.
  return <RegistrationNumberForm key={data.updatedAt ?? 'default'} saved={data} />;
}

function RegistrationNumberForm({ saved }: { saved: RegistrationNumberSettingsResponse }) {
  const canEdit = usePermission('config', 'manageSettings');
  const update = useUpdateRegistrationNumberSettings();
  const [form, setForm] = useState<RegistrationNumberSettings>({
    prefix: saved.prefix,
    includeYear: saved.includeYear,
    includeMonth: saved.includeMonth,
    includeDay: saved.includeDay,
    sequenceDigits: saved.sequenceDigits,
    separator: saved.separator,
  });
  const set = (patch: Partial<RegistrationNumberSettings>) => setForm((f) => ({ ...f, ...patch }));

  const { year, month, day } = todayParts();
  const seq = '5'.padStart(form.sequenceDigits, '0');
  const prefixValid = /^[A-Z0-9]{1,10}$/.test(form.prefix);
  const changed = (Object.keys(form) as (keyof RegistrationNumberSettings)[]).some((k) => form[k] !== saved[k]);

  // Coloured preview, one block per part, with what it means underneath.
  const blocks = [
    { value: form.prefix || '—', label: 'Brand', color: 'text-[#3e8914] bg-[#3e8914]/10 border-[#3e8914]/30' },
    ...(form.includeYear ? [{ value: year, label: 'Year', color: 'text-blue-700 bg-blue-50 border-blue-200' }] : []),
    ...(form.includeMonth ? [{ value: month, label: 'Month', color: 'text-orange-700 bg-orange-50 border-orange-200' }] : []),
    ...(form.includeDay ? [{ value: day, label: 'Date', color: 'text-violet-700 bg-violet-50 border-violet-200' }] : []),
    { value: seq, label: '5th of the day', color: 'text-red-600 bg-red-50 border-red-200' },
  ];
  if (!form.includeDay) blocks[blocks.length - 1].label = `5th of the ${form.includeMonth ? 'month' : form.includeYear ? 'year' : 'series'}`;
  const example = [form.prefix, `${form.includeYear ? year : ''}${form.includeMonth ? month : ''}${form.includeDay ? day : ''}`, seq]
    .filter(Boolean)
    .join(form.separator);

  const save = () => {
    if (!prefixValid) return;
    update.mutate(form, {
      onSuccess: (res) =>
        void Swal.fire({
          icon: 'success',
          title: 'Registration number updated',
          html: `The next registration will be <b>${res.nextNumber}</b>.`,
          confirmButtonColor: '#3e8914',
        }),
      onError: (err) => void Swal.fire({ icon: 'error', title: 'Not saved', text: errorMessage(err), confirmButtonColor: '#3e8914' }),
    });
  };

  const toggle = (key: 'includeYear' | 'includeMonth' | 'includeDay', label: string, sample: string) => (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => set({ [key]: !form[key] })}
      className={`flex flex-1 flex-col items-center rounded border px-2 py-1.5 transition-colors disabled:cursor-not-allowed ${
        form[key] ? 'border-[#3e8914] bg-[#3e8914]/10 text-[#2f6b0f]' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
      }`}
    >
      <span className="text-[12px] font-bold">{sample}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide">{form[key] ? '✓ ' : ''}{label}</span>
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b bg-[#233D4D] px-4 py-2.5">
        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
            <Hash className="h-3.5 w-3.5" /> Registration Number Series
          </h2>
          <p className="mt-0.5 text-[9px] font-medium uppercase text-slate-200">
            Next registration: <span className="font-mono text-[10px] font-bold text-[#a3e635]">{saved.nextNumber}</span>
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-1.5">
            {changed && (
              <button
                type="button"
                onClick={() => setForm({ prefix: saved.prefix, includeYear: saved.includeYear, includeMonth: saved.includeMonth, includeDay: saved.includeDay, sequenceDigits: saved.sequenceDigits, separator: saved.separator })}
                className="flex items-center gap-1 rounded border border-white/30 px-2 py-1 text-[9px] font-semibold uppercase text-white hover:bg-white/10"
              >
                <RotateCcw className="h-3 w-3" /> Undo
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!changed || !prefixValid || update.isPending}
              className="flex items-center gap-1 rounded bg-white px-2.5 py-1 text-[9px] font-semibold uppercase text-[#233D4D] shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        {/* Live preview */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="mb-2 text-[8px] font-bold uppercase tracking-widest text-gray-500">How the next numbers will look</p>
          <div className="flex flex-wrap items-start gap-1">
            {blocks.map((b, i) => (
              <div key={`${b.label}-${i}`} className="flex items-start gap-1">
                {i > 0 && form.separator && <span className="pt-1 font-mono text-[18px] font-bold text-gray-400">{form.separator}</span>}
                <div className="flex flex-col items-center">
                  <span className={`rounded border px-2 py-0.5 font-mono text-[18px] font-bold tracking-wide ${b.color}`}>{b.value}</span>
                  <span className="mt-1 text-[9px] font-semibold text-gray-500">{b.label}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-600">
            Example: <span className="font-mono font-bold text-[#18233b]">{example}</span> · the running number starts again at{' '}
            <span className="font-mono font-bold">{'1'.padStart(form.sequenceDigits, '0')}</span> <b>{resetLabel(form)}</b>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="reg-prefix">Prefix (brand code)</label>
            <input
              id="reg-prefix"
              value={form.prefix}
              disabled={!canEdit}
              maxLength={10}
              onChange={(e) => set({ prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
              placeholder="CC"
              className={`${INPUT} font-mono uppercase ${prefixValid ? '' : 'border-red-400'}`}
            />
            <p className="mt-0.5 text-[9px] text-gray-400">Letters or digits, up to 10 — e.g. CC for CityCalls.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL} htmlFor="reg-digits">Running number</label>
              <select
                id="reg-digits"
                value={form.sequenceDigits}
                disabled={!canEdit}
                onChange={(e) => set({ sequenceDigits: Number(e.target.value) })}
                className={INPUT}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} digits ({'1'.padStart(n, '0')})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="reg-separator">Separator</label>
              <select
                id="reg-separator"
                value={form.separator}
                disabled={!canEdit}
                onChange={(e) => set({ separator: e.target.value as RegistrationNumberSettings['separator'] })}
                className={INPUT}
              >
                <option value="">None (CC2026…)</option>
                <option value="-">Dash (CC-2026…)</option>
                <option value="/">Slash (CC/2026…)</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <span className={LABEL}>Date in the number</span>
          <div className="flex gap-2">
            {toggle('includeYear', 'Year', year)}
            {toggle('includeMonth', 'Month', month)}
            {toggle('includeDay', 'Date', day)}
          </div>
          <p className="mt-1 text-[9px] text-gray-400">These change on their own every day / month / year — no need to edit them.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <p className="text-[9px] italic text-gray-400">Only new registrations use this. Old registration numbers stay as they are.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => set(DEFAULTS)}
              className="text-[9px] font-semibold uppercase text-[#3e8914] hover:underline"
            >
              Use default (CC + YYYYMMDD + 01)
            </button>
          )}
        </div>
        {saved.updatedBy?.name && saved.updatedAt && (
          <p className="text-[9px] text-gray-400">
            Last changed by {saved.updatedBy.name} on {new Date(saved.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
      </div>
    </div>
  );
}
