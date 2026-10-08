'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Database, Edit, Pencil, Image as ImageIcon, Layers, Plus, Search, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

import { usePermission } from '@/lib/hooks/useAuth';
import { resolveFileUrl, useDeleteFile, useFileList, useUploadFile } from '@/lib/hooks/useFiles';
import { Master, useCreateMaster, useDeleteMaster, useMasters, useUpdateMaster } from '@/lib/hooks/useMasters';

// Admin Section → Masters, laid out like FAQ Management: pick a master type
// from the dropdown, add / edit entries in the form on the left, and that
// type's list shows in the table on the right.

const MASTER_TYPES = ['SERVICE_CATEGORY', 'BRAND', 'PRODUCT_TYPE', 'COMPLAINT_TYPE', 'SYMPTOM', 'DEFECT', 'SOLUTION', 'PART', 'UNIT', 'TAX_RATE', 'PRIORITY', 'LEAD_SOURCE', 'CALL_TYPE', 'APPOINTMENT_SLOT', 'PAYMENT_METHOD', 'CUSTOMER_TYPE'];

const MASTER_TYPE_LABELS: Record<string, string> = {
  SERVICE_CATEGORY: 'Service Categories',
  BRAND: 'Brands',
  PRODUCT_TYPE: 'Product Types',
  COMPLAINT_TYPE: 'Complaint Types',
  SYMPTOM: 'Symptoms',
  DEFECT: 'Defects',
  SOLUTION: 'Solutions',
  PART: 'Parts',
  UNIT: 'Units',
  TAX_RATE: 'Tax Rates',
  PRIORITY: 'Priorities',
  LEAD_SOURCE: 'Lead Sources',
  CALL_TYPE: 'Call Types',
  APPOINTMENT_SLOT: 'Appointment Slots',
  PAYMENT_METHOD: 'Payment Methods',
  CUSTOMER_TYPE: 'Customer Types',
};

const PAGE_SIZE = 10;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;
const INPUT = 'w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#3e8914] disabled:bg-gray-100 disabled:text-gray-500';
const LABEL = 'mb-1 block text-xs font-bold uppercase text-gray-500';

// "AC Gas Leak" → "AC_GAS_LEAK" (system keys are UPPER_SNAKE_CASE).
const toKey = (label: string) => label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
// While typing: same, but keep a trailing "_" so the next word can be typed.
const typingKey = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+/, '').slice(0, 60);

interface FormState {
  key: string;
  label: string;
  parentId: string;
  sortOrder: number;
  vertical: string;
}
const emptyForm: FormState = { key: '', label: '', parentId: '', sortOrder: 0, vertical: '' };

function useMasterImage(masterId: string | null) {
  const { data: files } = useFileList('MASTER', masterId ?? '');
  return masterId ? files?.filter((f) => f.mimeType.startsWith('image/')) ?? [] : [];
}

function MasterImageCell({ masterId }: { masterId: string }) {
  const images = useMasterImage(masterId);
  const [failed, setFailed] = useState(false);
  const image = images[images.length - 1];
  if (!image || failed) return <div className="flex h-10 w-12 items-center justify-center rounded border border-gray-200 bg-gray-100 text-[9px] font-bold text-gray-400">No img</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolveFileUrl(image)} alt="Master icon" className="h-10 w-12 rounded border border-gray-200 object-cover" onError={() => setFailed(true)} />
  );
}

export default function MastersPage() {
  const canEdit = usePermission('config', 'manageSettings');
  const [selectedType, setSelectedType] = useState('SERVICE_CATEGORY');
  const { data: masters = [], isLoading, isError } = useMasters([selectedType]);
  const createMaster = useCreateMaster();
  const updateMaster = useUpdateMaster();
  const deleteMaster = useDeleteMaster();
  const deleteFile = useDeleteFile();
  const uploader = useUploadFile('MASTER', 'new');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [keyTouched, setKeyTouched] = useState(false);
  const [imageFile, setImageFile] = useState<{ file: File; preview: string } | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const editing = masters.find((m) => m._id === editingId) ?? null;
  const editingImages = useMasterImage(editingId);
  const currentImage = editingImages[editingImages.length - 1];
  const previewSrc = imageFile?.preview ?? (currentImage ? resolveFileUrl(currentImage) : '');
  const saving = createMaster.isPending || updateMaster.isPending || uploader.isPending;
  const label = MASTER_TYPE_LABELS[selectedType];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? masters.filter((m) => m.label.toLowerCase().includes(q) || m.key.toLowerCase().includes(q)) : masters;
  }, [masters, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const activeCount = masters.filter((m) => m.active).length;

  function resetForm() {
    if (imageFile) URL.revokeObjectURL(imageFile.preview);
    setImageFile(null);
    setEditingId(null);
    setKeyTouched(false);
    setForm(emptyForm);
  }

  function changeType(type: string) {
    resetForm();
    setSelectedType(type);
    setSearch('');
    setPage(1);
  }

  function startEdit(item: Master) {
    resetForm();
    setEditingId(item._id);
    setKeyTouched(true);
    setForm({
      key: item.key,
      label: item.label,
      parentId: item.parentId ?? '',
      sortOrder: item.sortOrder ?? 0,
      vertical: typeof item.meta?.vertical === 'string' ? item.meta.vertical : '',
    });
  }

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      void Swal.fire({ icon: 'warning', title: 'Invalid image', text: 'Use a JPG, PNG, WebP or SVG image.', confirmButtonColor: '#3e8914' });
      return;
    }
    if (imageFile) URL.revokeObjectURL(imageFile.preview);
    setImageFile({ file, preview: URL.createObjectURL(file) });
  }

  async function submit() {
    const key = toKey(form.key);
    if (!form.label.trim() || !key) {
      void Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Display Label and System Key are required', confirmButtonColor: '#3e8914' });
      return;
    }
    const meta = selectedType === 'SERVICE_CATEGORY' ? { ...(editing?.meta ?? {}), vertical: form.vertical.trim() || undefined } : undefined;
    try {
      const saved = editing
        ? await updateMaster.mutateAsync({
            masterType: editing.masterType,
            id: editing._id,
            // Only send the key when it actually changed.
            ...(key !== editing.key ? { key } : {}),
            label: form.label.trim(),
            parentId: form.parentId || undefined,
            sortOrder: form.sortOrder,
            ...(meta ? { meta } : {}),
          })
        : await createMaster.mutateAsync({
            masterType: selectedType,
            key,
            label: form.label.trim(),
            parentId: form.parentId || undefined,
            sortOrder: form.sortOrder,
            meta,
          });
      if (imageFile) {
        await uploader.upload(imageFile.file, 'CATALOG_IMAGE', saved._id);
        // Replacing: drop the old picture(s) so the new one shows.
        await Promise.all(editingImages.map((f) => deleteFile.mutateAsync({ id: f._id, entityType: 'MASTER', entityId: saved._id }).catch(() => undefined)));
      }
      resetForm();
    } catch {
      // The API error is already shown as a toast.
    }
  }

  async function remove(item: Master) {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `<strong>${item.label.replace(/</g, '&lt;')}</strong> will be permanently deleted from ${label}. This cannot be undone.<br><span class="text-red-600">If it is still in use, it won't be deleted — set it to Inactive instead.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteMaster.mutateAsync({ masterType: item.masterType, id: item._id });
      if (editingId === item._id) resetForm();
    } catch {
      // Toast already shown.
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Masters Configuration</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage system master lists — pick a type from the dropdown to see and edit that list.</p>
        </div>

        <div style={{ zoom: 0.75 }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              {/* Master type */}
              <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#3e8914]">
                  <Layers className="h-5 w-5" /> Master Type
                </h2>
                <label className={LABEL} htmlFor="master-type">Select Category</label>
                <select
                  id="master-type"
                  value={selectedType}
                  onChange={(e) => changeType(e.target.value)}
                  className="w-full cursor-pointer appearance-none border-2 border-[#3e8914] bg-[#3e8914]/5 bg-[right_12px_center] bg-no-repeat px-4 py-2.5 pr-9 text-sm font-bold text-[#23471d] outline-none"
                  style={{ backgroundImage: SELECT_ARROW }}
                >
                  {MASTER_TYPES.map((t) => <option key={t} value={t}>{MASTER_TYPE_LABELS[t]}</option>)}
                </select>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Total', value: masters.length, cls: 'text-[#233D4D]' },
                    { label: 'Active', value: activeCount, cls: 'text-[#23714a]' },
                    { label: 'Inactive', value: masters.length - activeCount, cls: 'text-[#dc2626]' },
                  ].map((s) => (
                    <div key={s.label} className="border-2 border-gray-100 bg-gray-50 py-2">
                      <p className={`text-xl font-bold ${s.cls}`}>{isLoading ? '–' : s.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add / edit */}
              {canEdit && (
                <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]">
                    {editing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    {editing ? `Edit ${editing.label}` : `Add New — ${label}`}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={LABEL}>Display Label</label>
                      <input
                        value={form.label}
                        maxLength={120}
                        onChange={(e) => setForm((f) => ({ ...f, label: e.target.value, ...(keyTouched ? {} : { key: toKey(e.target.value) }) }))}
                        placeholder="e.g. AC Gas Leak"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>System Key</label>
                      <input
                        value={form.key}
                        maxLength={60}
                        onChange={(e) => { setKeyTouched(true); setForm((f) => ({ ...f, key: typingKey(e.target.value) })); }}
                        placeholder="e.g. AC_GAS_LEAK"
                        className={`${INPUT} font-mono`}
                      />
                      <p className="mt-1 text-[10px] text-gray-400">{editing ? 'Capital letters and underscores. Change it only if needed — other records refer to it.' : 'Filled in from the label — capital letters and underscores.'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Parent (Optional)</label>
                        <select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))} className={INPUT}>
                          <option value="">None</option>
                          {masters.filter((m) => m._id !== editingId).map((m) => <option key={m._id} value={m._id}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>Sort Order</label>
                        <input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Math.max(0, Number(e.target.value) || 0) }))} className={INPUT} />
                      </div>
                    </div>
                    {selectedType === 'SERVICE_CATEGORY' && (
                      <div>
                        <label className={LABEL}>Vertical (Optional)</label>
                        <input value={form.vertical} maxLength={40} onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value.toUpperCase() }))} placeholder="e.g. BEAUTY" className={INPUT} />
                      </div>
                    )}

                    <div>
                      <label className={LABEL}>Icon / Image (Optional)</label>
                      <div className="flex items-center gap-3">
                        <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-100 hover:border-[#3e8914]">
                          {previewSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          )}
                          <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pickImage} className="hidden" />
                        </label>
                        <p className="text-[11px] text-gray-500">
                          {imageFile ? <><span className="font-bold text-gray-700">{imageFile.file.name}</span> — saved with the entry.</> : 'Click the box to choose an icon (JPG, PNG, WebP or SVG).'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => void submit()} disabled={saving} className="flex-1 bg-[#DE802B] py-2 font-bold text-white transition-colors hover:bg-[#c66d21] disabled:opacity-60">
                        {saving ? 'Saving…' : editing ? 'Update Master' : 'Add Master'}
                      </button>
                      {editing && (
                        <button type="button" onClick={resetForm} className="bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-600">Cancel</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* List of the selected type */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#233D4D] px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Database className="h-5 w-5 text-[#DE802B]" /> {label} List
                  </h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      placeholder={`Search ${label.toLowerCase()}...`}
                      className="h-9 w-full border-2 border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-white"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#233D4D] text-xs font-bold uppercase tracking-wider text-white">
                        <th className="px-6 py-3">No.</th>
                        <th className="px-6 py-3">Icon</th>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">System Key</th>
                        {selectedType === 'SERVICE_CATEGORY' && <th className="px-6 py-3">Vertical</th>}
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading {label.toLowerCase()}…</td></tr>
                      ) : isError ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-red-600">Failed to load masters.</td></tr>
                      ) : rows.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No {label.toLowerCase()} found. Add one using the form.</td></tr>
                      ) : (
                        rows.map((item, index) => (
                          <tr key={item._id} className={`transition-colors hover:bg-gray-50 ${editingId === item._id ? 'bg-[#3e8914]/5' : ''}`}>
                            <td className="px-6 py-3 font-bold text-[#3e8914]">{start + index + 1}</td>
                            <td className="px-6 py-3"><MasterImageCell masterId={item._id} /></td>
                            <td className="px-6 py-3 font-semibold text-[#4B1426]">{item.label}</td>
                            <td className="px-6 py-3 font-mono text-xs text-[#334155]">{item.key}</td>
                            {selectedType === 'SERVICE_CATEGORY' && (
                              <td className="px-6 py-3 text-xs font-medium text-[#6c7587]">{typeof item.meta?.vertical === 'string' && item.meta.vertical ? item.meta.vertical : '—'}</td>
                            )}
                            <td className="px-6 py-3">
                              <select
                                key={`${item._id}-${item.active}`}
                                value={item.active ? 'ACTIVE' : 'INACTIVE'}
                                disabled={!canEdit}
                                onChange={(e) => updateMaster.mutate({ masterType: item.masterType, id: item._id, active: e.target.value === 'ACTIVE' })}
                                className={`h-[26px] cursor-pointer appearance-none rounded-[4px] bg-[right_6px_center] bg-no-repeat px-[8px] pr-[22px] text-[11px] font-bold outline-none disabled:cursor-not-allowed ${
                                  item.active ? 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]' : 'border border-[#fca5a5] bg-[#fee2e2] text-[#dc2626]'
                                }`}
                                style={{ backgroundImage: SELECT_ARROW }}
                                aria-label={`Status of ${item.label}`}
                              >
                                <option value="ACTIVE" className="bg-white font-bold text-[#23714a]">ACTIVE</option>
                                <option value="INACTIVE" className="bg-white font-bold text-[#dc2626]">INACTIVE</option>
                              </select>
                            </td>
                            <td className="px-6 py-3">
                              {canEdit && (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button type="button" onClick={() => startEdit(item)} title="Edit Master Entry" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_3px_10px_rgba(37,99,235,0.25)] hover:scale-105 active:scale-95">
                                    <Pencil className="h-[12px] w-[12px] text-blue-600" />
                                  </button>
                                  <button type="button" onClick={() => void remove(item)} title="Delete Master Entry" className="flex h-[25px] w-[25px] items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-[0_3px_10px_rgba(220,38,38,0.25)] hover:scale-105 active:scale-95">
                                    <Trash2 className="h-[12px] w-[12px] text-red-600" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filtered.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8e5df] bg-[#fafafa] px-6 py-2 text-[12px]">
                    <span className="font-semibold text-[#2563eb]">
                      Total Entries: <strong className="font-bold text-[#1d4ed8]">{filtered.length}</strong>
                      <span className="ml-2 text-[#8a92a0]">(Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)})</span>
                    </span>
                    <div className="flex items-center gap-[4px]">
                      <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`flex h-[26px] min-w-[26px] items-center justify-center rounded-[4px] border px-1.5 text-[12px] font-bold ${p === safePage ? 'border-[#233D4D] bg-[#233D4D] text-white' : 'border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50'}`}
                        >
                          {p}
                        </button>
                      ))}
                      <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="flex h-[26px] w-[26px] items-center justify-center rounded-[4px] border border-[#d8dce2] bg-white text-[#334155] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
