'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import { AlarmClock, CalendarClock, Edit, Globe, Info, Plus, RefreshCw, Save, Server, ShieldAlert, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import {
  SERVER_ASSET_TYPES, ServerAsset, ServerAssetInput, ServerAssetType,
  useCreateServerAsset, useDeleteServerAsset, useServerAssets, useUpdateServerAsset,
} from '@/lib/hooks/useServerAssets';
import { usePermission } from '@/lib/hooks/useAuth';
import { formatDate } from '@/lib/registrations/format';
import {
  countdown, daysLeft, daysLeftLabel, expiryTone, ORANGE_WITHIN_DAYS, RED_WITHIN_DAYS, TONE_CLASSES, TYPE_LABEL,
} from '@/lib/serverAssets/expiry';
import { useNow } from '@/lib/serverAssets/useNow';

const LABEL = 'mb-1 block text-xs font-bold uppercase text-gray-500';
const INPUT = 'w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]';
const CARD_TITLE = 'mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]';
const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-[6px] backdrop-blur-md border transition-all hover:scale-105 active:scale-95';

// Field wording per category, so the form and table read naturally.
const WORDING: Record<ServerAssetType, { name: string; namePlaceholder: string; provider: string; providerPlaceholder: string }> = {
  DOMAIN: { name: 'Domain Name', namePlaceholder: 'e.g. citycalls.in', provider: 'Registrar (bought from)', providerPlaceholder: 'e.g. GoDaddy, Hostinger, Namecheap' },
  HOSTING: { name: 'Hosting / Server Name', namePlaceholder: 'e.g. VPS 4GB — api.citycalls.in', provider: 'Hosting Provider', providerPlaceholder: 'e.g. Hostinger, AWS, DigitalOcean' },
  SSL: { name: 'Certificate For', namePlaceholder: 'e.g. *.citycalls.in', provider: 'Issued By', providerPlaceholder: "e.g. Let's Encrypt, Sectigo" },
  OTHER: { name: 'Name', namePlaceholder: 'e.g. Google Workspace', provider: 'Provider', providerPlaceholder: 'e.g. Google' },
};

const TYPE_ICON: Record<ServerAssetType, typeof Globe> = { DOMAIN: Globe, HOSTING: Server, SSL: ShieldAlert, OTHER: Info };

const toDateInput = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : '');

function emptyForm(type: ServerAssetType): ServerAssetInput {
  return { type, name: '', provider: '', purchasedOn: '', expiresOn: '', reminderDays: 30, autoRenew: false, cost: undefined, notes: '' };
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false });
}

export default function ServerManagementPage() {
  const now = useNow(1000);
  const canEdit = usePermission('config', 'manageSettings');
  const { data: assets = [], isLoading } = useServerAssets();
  const createAsset = useCreateServerAsset();
  const updateAsset = useUpdateServerAsset();
  const deleteAssetMutation = useDeleteServerAsset();

  const [category, setCategory] = useState<ServerAssetType | 'ALL'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServerAssetInput>(emptyForm('DOMAIN'));
  const isSaving = createAsset.isPending || updateAsset.isPending;
  const wording = WORDING[form.type];

  const rows = category === 'ALL' ? assets : assets.filter((a) => a.type === category);
  const withDays = assets.map((a) => ({ asset: a, days: daysLeft(a.expiresOn, now) }));
  const orangeCount = withDays.filter((x) => expiryTone(x.days) === 'orange').length;
  const redCount = withDays.filter((x) => expiryTone(x.days) === 'red').length;
  const next = withDays.filter((x) => x.days >= 0).sort((a, b) => a.days - b.days)[0];
  const listWording = category === 'ALL' ? null : WORDING[category];

  const update = <K extends keyof ServerAssetInput>(key: K, value: ServerAssetInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function pickCategory(type: ServerAssetType | 'ALL') {
    setCategory(type);
    if (!editingId && type !== 'ALL') setForm((prev) => ({ ...prev, type }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(category === 'ALL' ? 'DOMAIN' : category));
  }

  function startEdit(asset: ServerAsset) {
    setEditingId(asset._id);
    setForm({
      type: asset.type, name: asset.name, provider: asset.provider ?? '', purchasedOn: toDateInput(asset.purchasedOn),
      expiresOn: toDateInput(asset.expiresOn), reminderDays: asset.reminderDays ?? 30, autoRenew: !!asset.autoRenew,
      cost: asset.cost, notes: asset.notes ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    if (!form.name.trim()) return showToast('warning', `${wording.name} is required`);
    if (!form.expiresOn) return showToast('warning', 'Expiry date is required');
    if (form.purchasedOn && form.purchasedOn > form.expiresOn) return showToast('warning', 'Purchase date must be before the expiry date');

    const payload: ServerAssetInput = {
      ...form,
      purchasedOn: form.purchasedOn || undefined,
      cost: form.cost === undefined || Number.isNaN(form.cost) ? undefined : form.cost,
      notes: form.notes?.trim() || undefined,
    };
    try {
      if (editingId) await updateAsset.mutateAsync({ id: editingId, ...payload });
      else await createAsset.mutateAsync(payload);
      showToast('success', editingId ? 'Record updated' : 'Record added');
      resetForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save', text: errorMessage(error) });
    }
  }

  async function deleteAsset(asset: ServerAsset) {
    const result = await Swal.fire({
      title: `Delete "${asset.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAssetMutation.mutateAsync(asset._id);
      if (editingId === asset._id) resetForm();
      showToast('success', 'Record deleted');
    } catch {
      showToast('error', 'Failed to delete');
    }
  }

  const summary = [
    { label: 'Total Records', value: String(assets.length), sub: 'Domains, hosting & more', icon: Server, tone: 'text-[#233D4D]', ring: 'border-[#233D4D]/30' },
    {
      label: 'Next Expiry',
      value: next ? countdown(next.asset.expiresOn, now) : '—',
      sub: next ? `${next.asset.name} · ${formatDate(next.asset.expiresOn)}` : 'Nothing upcoming',
      icon: AlarmClock,
      tone: next ? TONE_CLASSES[expiryTone(next.days)].text : 'text-gray-500',
      ring: 'border-gray-200',
    },
    { label: `Within ${ORANGE_WITHIN_DAYS} Days`, value: String(orangeCount), sub: 'Renew soon', icon: CalendarClock, tone: 'text-orange-600', ring: 'border-orange-200' },
    { label: `Within ${RED_WITHIN_DAYS} Days / Expired`, value: String(redCount), sub: 'Renew now', icon: ShieldAlert, tone: 'text-red-600', ring: 'border-red-200' },
  ];

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Server Management</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
            Keep track of domains, hosting and SSL — where they were bought and when they expire. You&apos;ll be reminded before anything lapses.
          </p>
        </div>

        <div style={{ zoom: 0.75 }}>
          {/* Summary */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((card) => (
              <div key={card.label} className={`border-2 bg-white p-4 shadow-sm ${card.ring}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <card.icon className="h-4 w-4" /> {card.label}
                </div>
                <p className={`mt-2 font-mono text-2xl font-extrabold ${card.tone}`}>{card.value}</p>
                <p className="mt-1 truncate text-xs font-medium text-gray-500">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Category tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(['ALL', ...SERVER_ASSET_TYPES] as const).map((type) => {
              const count = type === 'ALL' ? assets.length : assets.filter((a) => a.type === type).length;
              const active = category === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => pickCategory(type)}
                  className={`flex items-center gap-2 border-2 px-4 py-2 text-sm font-bold transition-colors ${
                    active ? 'border-[#233D4D] bg-[#233D4D] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#233D4D]/50'
                  }`}
                >
                  {type === 'ALL' ? 'All' : TYPE_LABEL[type]}
                  <span className={`rounded-full px-2 text-xs ${active ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Add / edit */}
            {canEdit && (
              <div className="lg:col-span-1">
                <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className={CARD_TITLE}>
                    {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    {editingId ? `Edit ${TYPE_LABEL[form.type]}` : `Add ${TYPE_LABEL[form.type]}`}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={LABEL}>Category *</label>
                      <select value={form.type} onChange={(e) => update('type', e.target.value as ServerAssetType)} className={INPUT}>
                        {SERVER_ASSET_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>{wording.name} *</label>
                      <input value={form.name} maxLength={160} onChange={(e) => update('name', e.target.value)} placeholder={wording.namePlaceholder} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>{wording.provider}</label>
                      <input value={form.provider} maxLength={80} onChange={(e) => update('provider', e.target.value)} placeholder={wording.providerPlaceholder} className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Purchased On</label>
                        <input type="date" value={form.purchasedOn ?? ''} onChange={(e) => update('purchasedOn', e.target.value)} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Expires On *</label>
                        <input type="date" value={form.expiresOn} onChange={(e) => update('expiresOn', e.target.value)} className={INPUT} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Remind Before (days)</label>
                        <input type="number" min={1} max={365} value={form.reminderDays} onChange={(e) => update('reminderDays', Number(e.target.value))} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Renewal Cost (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={form.cost ?? ''}
                          onChange={(e) => update('cost', e.target.value === '' ? undefined : Number(e.target.value))}
                          placeholder="Optional"
                          className={INPUT}
                        />
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                      <input type="checkbox" checked={form.autoRenew} onChange={(e) => update('autoRenew', e.target.checked)} className="h-4 w-4 accent-[#3e8914]" />
                      Auto-renew is on
                    </label>
                    <div>
                      <label className={LABEL}>Notes</label>
                      <textarea rows={2} value={form.notes ?? ''} maxLength={500} onChange={(e) => update('notes', e.target.value)} placeholder="Login email, account ID, anything useful" className={`${INPUT} resize-none`} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => void save()}
                        disabled={isSaving}
                        className="flex flex-1 items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving...' : editingId ? 'Update' : 'Add Record'}
                      </button>
                      {editingId && (
                        <button type="button" onClick={resetForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3 border border-blue-100 bg-blue-50 p-4">
                    <Info className="h-5 w-5 shrink-0 text-blue-600" />
                    <p className="text-[10px] font-bold uppercase leading-relaxed text-blue-700">
                      Green: more than {ORANGE_WITHIN_DAYS} days left · Orange: {ORANGE_WITHIN_DAYS} days or less · Red: {RED_WITHIN_DAYS} days or less.
                      A reminder pops up in admin from the &quot;remind before&quot; day.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* List */}
            <div className={canEdit ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                <div className="border-b bg-[#233D4D] px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Server className="h-5 w-5 text-[#DE802B]" /> {category === 'ALL' ? 'All Records' : `${TYPE_LABEL[category]} List`}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                        <th className="px-4 py-3">No.</th>
                        <th className="px-4 py-3">{listWording?.name ?? 'Name'}</th>
                        <th className="px-4 py-3">{listWording?.provider.replace(' (bought from)', '') ?? 'Provider'}</th>
                        <th className="px-4 py-3">Purchased</th>
                        <th className="px-4 py-3">Expires</th>
                        <th className="px-4 py-3">Time Left</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">Loading...</td></tr>
                      ) : rows.length === 0 ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">Nothing here yet{canEdit ? ' — add one from the form.' : '.'}</td></tr>
                      ) : (
                        rows.map((asset, index) => {
                          const days = daysLeft(asset.expiresOn, now);
                          const tone = TONE_CLASSES[expiryTone(days)];
                          const TypeIcon = TYPE_ICON[asset.type];
                          return (
                            <tr key={asset._id} className={`transition-colors hover:bg-gray-50 ${editingId === asset._id ? 'bg-blue-50/70' : ''}`}>
                              <td className="px-4 py-4 text-[12px] font-bold text-[#3e8914]">{(index + 1).toString().padStart(2, '0')}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <TypeIcon className="h-4 w-4 shrink-0 text-[#233D4D]" />
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-bold text-[#4B1426]">{asset.name}</p>
                                    <p className="text-[10px] font-bold uppercase text-gray-400">
                                      {TYPE_LABEL[asset.type]}{asset.autoRenew ? ' · auto-renew' : ''}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-[12px] font-semibold text-gray-700">{asset.provider || '—'}</td>
                              <td className="px-4 py-4 text-[12px] text-gray-600">{asset.purchasedOn ? formatDate(asset.purchasedOn) : '—'}</td>
                              <td className="px-4 py-4 text-[12px] font-semibold text-gray-800">{formatDate(asset.expiresOn)}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                                  {daysLeftLabel(days)}
                                </span>
                                <p className={`mt-1 font-mono text-[10px] font-semibold ${tone.text}`}>{countdown(asset.expiresOn, now)}</p>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex justify-center gap-1.5">
                                  {canEdit ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEdit(asset)}
                                        title="Edit / renew"
                                        className={`${ICON_BUTTON} bg-blue-500/10 text-blue-600 border-blue-400/30 hover:bg-blue-500/20`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void deleteAsset(asset)}
                                        title="Delete"
                                        className={`${ICON_BUTTON} bg-red-500/10 text-red-600 border-red-400/30 hover:bg-red-500/20`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <RefreshCw className="h-4 w-4 text-gray-300" />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
