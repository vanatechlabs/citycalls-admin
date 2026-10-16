'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import { Edit, Image as ImageIcon, Info, LayoutGrid, Link2, ListPlus, Plus, Save, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useUploadFile } from '@/lib/hooks/useFiles';
import {
  AllServiceCard, AllServiceCardInput, useAllServiceCards, useCreateAllServiceCard, useDeleteAllServiceCard,
  useImportAllServiceCards, useUpdateAllServiceCard,
} from '@/lib/hooks/useAllServices';
import type { OurServiceStatus } from '@/lib/hooks/useOurServices';
import { useRegistrationServices } from '@/lib/hooks/useRegistrations';
import { displayCategoryName, resolveMediaUrl } from '@/lib/registrations/format';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Default card images are the website's own files (/assets/...).
const WEBSITE_ORIGIN = (process.env.NEXT_PUBLIC_CITYCALLS_WEBSITE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const LABEL = 'mb-1 block text-xs font-bold uppercase text-gray-500';
const INPUT = 'w-full border-2 border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-[#134698]';
const CARD_TITLE = 'mb-4 flex items-center gap-2 text-lg font-bold text-[#DE802B]';
const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-[6px] backdrop-blur-md border transition-all hover:scale-105 active:scale-95';

// Pages Section → All Services: a card for every service, built the same
// way as the home page's Our Services cards. Where they show on the website
// is decided later.

const emptyCard: AllServiceCardInput = {
  navServiceId: undefined, name: '', path: '', shortDescription: '', image: '', imageAlt: '', priceText: '₹299 visit charge', sortOrder: 0, status: 'ACTIVE',
};

function previewUrl(image: string) {
  if (!image) return '';
  if (image.startsWith('/assets/')) return `${WEBSITE_ORIGIN}${image}`;
  return resolveMediaUrl(image);
}

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || undefined;
}

function showToast(icon: 'success' | 'error' | 'warning', title: string) {
  void Swal.fire({ toast: true, position: 'top-end', icon, title, timer: 2200, showConfirmButton: false });
}

export default function AllServicesPage() {
  const { data: cards = [], isLoading } = useAllServiceCards();
  const { data: menus = [] } = useRegistrationServices();
  const createCard = useCreateAllServiceCard();
  const updateCard = useUpdateAllServiceCard();
  const deleteCardMutation = useDeleteAllServiceCard();
  const importCards = useImportAllServiceCards();
  const imageUpload = useUploadFile('ALL_SERVICE_CARD', 'new', { skipGlobalToast: true });
  const [categoryFilter, setCategoryFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AllServiceCardInput>(emptyCard);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const isSaving = createCard.isPending || updateCard.isPending || imageUpload.isPending;
  const allLinks = menus.flatMap((m) => m.services.map((s) => ({ ...s, menu: m.name })));
  // Next free position, so new cards go to the end unless changed.
  const nextOrder = cards.length ? Math.max(...cards.map((c) => c.sortOrder ?? 0)) + 1 : 0;
  // Navbar List services that don't have a card yet.
  const missing = allLinks.filter((l) => !cards.some((c) => c.navServiceId === l.id || c.path === l.path));
  const categories = [...new Set(cards.map((c) => c.category).filter(Boolean))];
  const shown = categoryFilter ? cards.filter((c) => c.category === categoryFilter) : cards;

  const update = <K extends keyof AllServiceCardInput>(key: K, value: AllServiceCardInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  // Picking a Navbar List service fills in its name and path.
  function pickService(id: string) {
    const link = allLinks.find((l) => l.id === id);
    setForm((prev) => ({
      ...prev,
      navServiceId: link?.id,
      path: link?.path ?? '',
      name: link ? link.name : prev.name,
      imageAlt: prev.imageAlt || (link ? `${link.name} by CityCalls` : ''),
    }));
  }

  function resetForm() {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setEditingId(null);
    setForm({ ...emptyCard, sortOrder: nextOrder });
    setImageFile(null);
    setImagePreview(null);
  }

  function startEdit(card: AllServiceCard) {
    setEditingId(card._id);
    setForm({
      navServiceId: card.navServiceId, name: card.name, path: card.path, shortDescription: card.shortDescription ?? '',
      image: card.image ?? '', imageAlt: card.imageAlt ?? '', priceText: card.priceText ?? '', sortOrder: card.sortOrder ?? 0, status: card.status,
    });
    setImageFile(null);
    setImagePreview(card.image ? previewUrl(card.image) : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      showToast('warning', 'Use a JPG, PNG or WebP image up to 10 MB');
      return;
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function saveCard() {
    if (!form.path) return showToast('warning', 'Select a service');
    if (!form.name.trim()) return showToast('warning', 'Service name is required');

    try {
      const payload = { ...form, sortOrder: editingId ? form.sortOrder : form.sortOrder || nextOrder };
      // The image needs the card's id, so a new card is saved first.
      const saved = editingId ? await updateCard.mutateAsync({ id: editingId, ...payload }) : await createCard.mutateAsync(payload);
      if (imageFile) {
        const uploaded = await imageUpload.upload(imageFile, 'WEBSITE_SERVICE_CARD_IMAGE', saved._id);
        await updateCard.mutateAsync({ id: saved._id, image: uploaded.url });
      }
      showToast('success', editingId ? 'Service card updated' : 'Service card added');
      resetForm();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not save service card', text: errorMessage(error) });
    }
  }

  async function changeStatus(card: AllServiceCard, status: OurServiceStatus) {
    try {
      await updateCard.mutateAsync({ id: card._id, status });
      showToast('success', `Card ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } catch {
      showToast('error', 'Failed to change status');
    }
  }

  async function importAll() {
    const names = missing.slice(0, 8).map((m) => m.name.replace(/</g, '&lt;')).join(', ');
    const result = await Swal.fire({
      title: `Add ${missing.length} service card${missing.length === 1 ? '' : 's'}?`,
      html: `A card is made for every Navbar List service that has none yet:<br><b>${names}${missing.length > 8 ? '…' : ''}</b><br><span class="text-[13px] text-gray-500">Description, price and image are copied from the home page card where there is one — add the rest after.</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3e8914',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, add them',
    });
    if (!result.isConfirmed) return;
    try {
      const { created } = await importCards.mutateAsync();
      showToast('success', `${created} card${created === 1 ? '' : 's'} added`);
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Could not add the cards', text: errorMessage(error) });
    }
  }

  async function deleteCard(card: AllServiceCard) {
    const result = await Swal.fire({
      title: `Delete "${card.name}" card?`,
      text: 'Only this card is removed — the service page, navbar link and home page card stay.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCardMutation.mutateAsync(card._id);
      if (editingId === card._id) resetForm();
      showToast('success', 'Service card deleted');
    } catch {
      showToast('error', 'Failed to delete card');
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white">
      <div className="min-h-screen bg-white p-6 shadow-md">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">All Services</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">
            A card for every service from Navbar List — with image, short description and price. Separate from the home page&apos;s Our Services cards.
          </p>
        </div>

        <div style={{ zoom: 0.75 }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Add / edit card */}
            <div className="space-y-6 lg:col-span-1">
              <div className="border-2 border-gray-200 bg-white p-6 shadow-sm">
                <h2 className={CARD_TITLE}>
                  {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? 'Edit Service Card' : 'Add Service Card'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Select Service *</label>
                    <select value={form.navServiceId ?? ''} onChange={(e) => pickService(e.target.value)} className={INPUT}>
                      <option value="">Select a service from Navbar List</option>
                      {menus.map((menu) => (
                        <optgroup key={menu.id} label={menu.name}>
                          {menu.services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}{cards.some((c) => c.navServiceId === s.id && c._id !== editingId) ? '  ✓ card added' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {form.path && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gray-500">
                        <Link2 className="h-3 w-3" /> {form.path}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={LABEL}>Card Name *</label>
                    <input value={form.name} maxLength={120} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Refrigerator Service" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Short Description</label>
                    <textarea
                      rows={2}
                      value={form.shortDescription}
                      maxLength={200}
                      onChange={(e) => update('shortDescription', e.target.value)}
                      placeholder="e.g. Cooling issues, gas refill, ice buildup — sorted at your doorstep."
                      className={`${INPUT} resize-none`}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Price Text</label>
                    <input value={form.priceText} maxLength={60} onChange={(e) => update('priceText', e.target.value)} placeholder="e.g. ₹299 visit charge" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Card Image</label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept={IMAGE_TYPES.join(',')}
                        onChange={handleImageFile}
                        className="min-w-0 flex-1 border-2 border-gray-300 px-3 py-2 text-xs font-semibold outline-none focus:border-[#134698]"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">Uploads to Cloudinary — JPG, PNG, or WebP, up to 10 MB. A landscape photo works best.</p>
                  </div>
                  <div>
                    <label className={LABEL}>Image Alt Text</label>
                    <input value={form.imageAlt} maxLength={200} onChange={(e) => update('imageAlt', e.target.value)} placeholder="e.g. Technician repairing a refrigerator" className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Sort Order</label>
                      <input type="number" min={0} value={editingId ? form.sortOrder : form.sortOrder || nextOrder} onChange={(e) => update('sortOrder', Number(e.target.value))} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Status</label>
                      <select value={form.status} onChange={(e) => update('status', e.target.value as OurServiceStatus)} className={INPUT}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => void saveCard()}
                      disabled={isSaving}
                      className="flex flex-1 items-center justify-center gap-2 bg-[#4B1426] py-2 font-bold text-white transition-colors hover:bg-[#3a0f1d] disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : editingId ? 'Update Card' : 'Add Card'}
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
                    Make a card for every service here. Sort order is filled in automatically — change it to move a card. Where these cards show on the website will be set up later.
                  </p>
                </div>
              </div>
            </div>

            {/* Cards list */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#233D4D] px-6 py-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                      <LayoutGrid className="h-5 w-5 text-[#88be1e]" /> All Service Cards
                    </h2>
                    <p className="mt-0.5 text-[12px] text-slate-200">
                      {cards.length} card{cards.length === 1 ? '' : 's'}{missing.length ? ` · ${missing.length} Navbar List service${missing.length === 1 ? '' : 's'} without a card` : ' · every service has a card'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {categories.length > 1 && (
                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 border-2 border-gray-300 bg-white px-2 text-xs font-bold text-gray-800 outline-none" aria-label="Filter by category">
                        <option value="">All Categories</option>
                        {categories.map((c) => <option key={c} value={c}>{displayCategoryName(c)}</option>)}
                      </select>
                    )}
                    {missing.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void importAll()}
                        disabled={importCards.isPending}
                        className="flex h-9 items-center gap-1.5 bg-[#3e8914] px-3 text-xs font-bold text-white transition-colors hover:bg-[#347311] disabled:opacity-60"
                      >
                        <ListPlus className="h-4 w-4" /> {importCards.isPending ? 'Adding...' : `Add all from Navbar List (${missing.length})`}
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#233D4D] text-center text-xs font-bold uppercase tracking-wider text-white">
                        <th className="px-5 py-3 text-left">No.</th>
                        <th className="px-5 py-3 text-left">Image</th>
                        <th className="px-5 py-3 text-left">Service</th>
                        <th className="px-5 py-3">Price</th>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">Loading service cards...</td></tr>
                      ) : shown.length === 0 ? (
                        <tr><td colSpan={7} className="py-10 text-center text-sm text-[#6c7587]">No service cards yet — add one from the form, or use &quot;Add all from Navbar List&quot;.</td></tr>
                      ) : (
                        shown.map((card, index) => (
                          <tr key={card._id} className={`transition-colors hover:bg-gray-50 ${editingId === card._id ? 'bg-blue-50/70' : ''}`}>
                            <td className="px-5 py-4 text-[12px] font-bold text-[#3e8914]">{(index + 1).toString().padStart(2, '0')}</td>
                            <td className="px-5 py-4">
                              <div className="flex h-12 w-16 items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-50">
                                {card.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={previewUrl(card.image)} alt={card.imageAlt || card.name} className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td className="max-w-[320px] px-5 py-4">
                              <span className="block text-[12px] font-bold uppercase tracking-tighter text-[#4B1426]">{card.name}</span>
                              <span className="mt-0.5 block text-[11px] font-medium text-[#334155]">
                                {card.path}
                                {card.category && <span className="ml-1.5 rounded border border-[#3e8914]/25 bg-[#3e8914]/10 px-1 text-[10px] font-bold text-[#2f6b0f]">{displayCategoryName(card.category)}</span>}
                              </span>
                              {card.shortDescription && <span className="mt-0.5 block truncate text-[11px] text-[#6c7587]">{card.shortDescription}</span>}
                            </td>
                            <td className="px-5 py-4 text-center text-[11px] font-bold text-[#3e8914]">{card.priceText || '—'}</td>
                            <td className="px-5 py-4 text-center text-[11px] font-bold uppercase text-[#6c7587]">#{card.sortOrder}</td>
                            <td className="px-5 py-4 text-center">
                              <select
                                key={`${card._id}-${card.status}`}
                                value={card.status}
                                onChange={(e) => void changeStatus(card, e.target.value as OurServiceStatus)}
                                className={`h-[24px] cursor-pointer appearance-none rounded-[4px] px-[8px] pr-[22px] text-[11px] font-bold outline-none bg-no-repeat bg-[right_6px_center] shadow-xs transition ${
                                  card.status === 'ACTIVE'
                                    ? 'bg-[#e8f5e9] text-[#23714a] border border-[#a5d6a7]'
                                    : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                                }`}
                                style={{
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                }}
                              >
                                <option value="ACTIVE" className="bg-white font-bold text-[#23714a]">Active</option>
                                <option value="INACTIVE" className="bg-white font-bold text-[#dc2626]">Inactive</option>
                              </select>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEdit(card)}
                                  title="Edit"
                                  className={`${ICON_BUTTON} bg-blue-500/10 text-blue-600 border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] hover:bg-blue-500/20 hover:border-blue-400/50`}
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteCard(card)}
                                  title="Delete"
                                  className={`${ICON_BUTTON} bg-red-500/10 text-red-600 border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] hover:bg-red-500/20 hover:border-red-400/50`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
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
