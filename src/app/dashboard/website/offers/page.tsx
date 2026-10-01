'use client';

import { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  ArrowRight, Bug, Copy, Droplets, Edit, Eye, Fan, Gift, List, Percent, PlusCircle, Save, Scissors,
  ShieldCheck, Sparkles, Tag, Trash2, Wrench, X, Zap,
} from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import {
  useOfferStrip, useUpdateOfferStrip, useOffers, useCreateOffer, useUpdateOffer, useDeleteOffer,
  OFFER_ICONS, Offer, OfferIcon, OfferInput, OfferStatus, OfferStrip,
} from '@/lib/hooks/useHomeOffers';

// Same lucide names nextfrontend's SpotlightCarousel.tsx maps offer.icon to.
const ICONS: Record<OfferIcon, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Gift, Fan, Sparkles, Zap, Droplets, ShieldCheck, Wrench, Bug, Scissors, Tag,
};

const EMPTY_STRIP: OfferStrip = {
  textLeft: '', discountText: '', textRight: '', couponCode: '', buttonText: '', buttonLink: '',
  bgGradientFrom: '', bgGradientVia: '', bgGradientTo: '',
  discountBg: '', discountTextColor: '', couponBg: '', couponTextColor: '',
  status: 'ACTIVE',
};

const EMPTY_OFFER: Required<OfferInput> = {
  title: '', description: '', couponCode: '', icon: 'Gift',
  accentColor: '#3e8914', tintColor: '#e8f5e9', sortOrder: 0, status: 'ACTIVE',
};

// Same field language as Social Media (dashboard/seo/social-media).
const FIELD_LABEL = 'mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500';
const FIELD_INPUT = 'w-full border-2 border-gray-300 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#3e8914]';
// Status dropdown filled green (Active) or red (Inactive); the option list
// itself stays white so it reads normally when opened.
function statusSelectClass(status: OfferStatus) {
  return `w-full cursor-pointer border-2 px-2.5 py-1.5 text-xs font-bold text-white outline-none transition-colors [&>option]:bg-white [&>option]:text-gray-800 ${
    status === 'ACTIVE' ? 'border-[#3e8914] bg-[#3e8914]' : 'border-red-600 bg-red-600'
  }`;
}
const CARD = 'border-2 border-gray-200 bg-white p-5 shadow-sm';
const CARD_TITLE = 'mb-3 flex items-center gap-1.5 text-sm font-bold text-[#3e8914]';
const SAVE_BUTTON = 'flex items-center justify-center gap-1.5 rounded-[6px] bg-[#4B1426] px-5 py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] transition-colors hover:bg-[#3a0f1d] disabled:cursor-not-allowed disabled:opacity-60';

function errorMessage(error: unknown, fallback: string) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || fallback;
}

// Same background rules as nextfrontend's OfferStrip.tsx getBackgroundStyle().
function stripBackground(strip: OfferStrip): React.CSSProperties {
  const from = strip.bgGradientFrom.trim();
  const via = strip.bgGradientVia.trim();
  const to = strip.bgGradientTo.trim();
  const gradient = [from, via, to].find((v) => v.startsWith('linear-gradient'));
  if (gradient) return { backgroundImage: gradient };
  if (from && !via && !to) return { backgroundColor: from };
  if (from && via && !to) return { backgroundImage: `linear-gradient(to right, ${from}, ${via})` };
  if (from && via && to) return { backgroundImage: `linear-gradient(to right, ${from}, ${via}, ${to})` };
  return { backgroundImage: 'linear-gradient(to right, #020617, #0d131f, #020617)' };
}

// Hex text input with a clickable swatch that opens the native colour picker.
// Non-hex values (rgba, gradients) still work — they just skip the picker.
function ColorField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string;
}) {
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div>
      <label className={FIELD_LABEL}>{label}</label>
      <div className="flex">
        <label
          className="relative h-[31px] w-[34px] shrink-0 cursor-pointer border-2 border-r-0 border-gray-300"
          style={{ background: value || 'transparent' }}
          title="Pick colour"
        >
          <input
            type="color"
            value={isHex ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FIELD_INPUT} />
      </div>
    </div>
  );
}

function OfferCardPreview({ offer }: { offer: Required<OfferInput> }) {
  const Icon = ICONS[offer.icon] ?? Gift;
  return (
    <div
      className="relative rounded-2xl border-2 border-gray-200 p-5 shadow-xl"
      style={{ backgroundImage: `linear-gradient(to bottom right, #f8fafc 50%, ${offer.tintColor || '#f1f5f9'})` }}
    >
      <div className="absolute -right-3 -top-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1 text-[10px] font-bold text-white">
        <Percent className="h-2.5 w-2.5" /> OFFER
      </div>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border shadow" style={{ background: offer.tintColor }}>
        <Icon className="h-5 w-5" style={{ color: offer.accentColor }} />
      </div>
      <h3 className="mb-1.5 text-base font-extrabold" style={{ color: offer.accentColor }}>{offer.title || 'Offer title'}</h3>
      <p className="mb-3 text-xs leading-snug text-gray-700">{offer.description || 'Short description of the offer.'}</p>
      {offer.couponCode && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 rounded-lg border bg-white/70 px-3 py-2 text-xs font-bold tracking-wider" style={{ color: offer.accentColor }}>
            {offer.couponCode}
          </div>
          <span className="rounded-lg border bg-white px-3 py-2 text-xs font-bold" style={{ color: offer.accentColor }}>Copy →</span>
        </div>
      )}
    </div>
  );
}

export default function OffersPage() {
  // ─── Offer strip ───────────────────────────────────────────────────────────
  const { data: savedStrip, isLoading: stripLoading, isError: stripLoadError } = useOfferStrip();
  const updateStrip = useUpdateOfferStrip();
  const [strip, setStrip] = useState<OfferStrip>(EMPTY_STRIP);
  // Load each fetched version of the strip into the form once (on first load
  // and after a save refetches it) without an effect.
  const [loadedStrip, setLoadedStrip] = useState<OfferStrip | undefined>();
  if (savedStrip && savedStrip !== loadedStrip) {
    setLoadedStrip(savedStrip);
    setStrip({ ...EMPTY_STRIP, ...savedStrip });
  }

  const setStripField = (field: keyof OfferStrip, value: string) => setStrip((prev) => ({ ...prev, [field]: value }));

  async function handleStripSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Send only the editable fields — the API schema is strict and the
      // fetched document also carries _id/key/timestamps.
      const payload = Object.fromEntries(
        (Object.keys(EMPTY_STRIP) as (keyof OfferStrip)[]).map((key) => [key, strip[key]])
      ) as Partial<OfferStrip>;
      await updateStrip.mutateAsync(payload);
      void Swal.fire({ icon: 'success', title: 'Offer strip updated', timer: 1500, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Failed to save offer strip', text: errorMessage(error, '') || undefined });
    }
  }

  // ─── Offer cards ───────────────────────────────────────────────────────────
  const { data: offers, isLoading: offersLoading, isError: offersLoadError } = useOffers();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const deleteOffer = useDeleteOffer();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offer, setOffer] = useState<Required<OfferInput>>(EMPTY_OFFER);
  const offerSaving = createOffer.isPending || updateOffer.isPending;

  useEffect(() => {
    if (stripLoadError || offersLoadError) {
      void Swal.fire({ icon: 'error', title: 'Failed to load offers', timer: 2000, showConfirmButton: false });
    }
  }, [stripLoadError, offersLoadError]);

  const offerList = offers ?? [];

  const setOfferField = <K extends keyof OfferInput>(field: K, value: Required<OfferInput>[K]) =>
    setOffer((prev) => ({ ...prev, [field]: value }));

  function resetOffer() {
    setEditingId(null);
    setOffer(EMPTY_OFFER);
  }

  function startEdit(item: Offer) {
    setEditingId(item._id);
    setOffer({
      title: item.title,
      description: item.description ?? '',
      couponCode: item.couponCode ?? '',
      icon: item.icon,
      accentColor: item.accentColor,
      tintColor: item.tintColor,
      sortOrder: item.sortOrder,
      status: item.status,
    });
    document.getElementById('offer-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleOfferSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateOffer.mutateAsync({ id: editingId, ...offer });
      } else {
        await createOffer.mutateAsync(offer);
      }
      void Swal.fire({ icon: 'success', title: editingId ? 'Offer updated' : 'Offer created', timer: 1500, showConfirmButton: false });
      resetOffer();
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'Failed to save offer', text: errorMessage(error, '') || undefined });
    }
  }

  async function handleDelete(id: string) {
    const result = await Swal.fire({
      title: 'Delete this offer?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;

    deleteOffer.mutate(id, {
      onSuccess: () => {
        void Swal.fire({ icon: 'success', title: 'Offer deleted', timer: 1500, showConfirmButton: false });
        if (editingId === id) resetOffer();
      },
      onError: () => void Swal.fire({ icon: 'error', title: 'Failed to delete offer' }),
    });
  }

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Offers &amp; Promotions</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage promotional offers and your homepage top offer strip.</p>
        </div>

        {/* ─── OFFER STRIP SETTINGS ─── */}
        <form onSubmit={handleStripSubmit} className={`${CARD} mb-8`}>
          <h2 className={CARD_TITLE}><Gift className="h-4 w-4" /> Offer Strip Settings</h2>
          <p className="-mt-2 mb-4 text-[11px] font-medium text-gray-400">
            This controls the home page banner like: “Special Home Services Discount — FLAT 15% OFF on your first booking. Use code CITY15”
          </p>

          {stripLoading ? (
            <p className="py-6 text-center text-xs font-semibold text-gray-400">Loading offer strip...</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
              <div className="space-y-3 lg:col-span-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className={FIELD_LABEL}>Left Text</label>
                    <input value={strip.textLeft} onChange={(e) => setStripField('textLeft', e.target.value)} maxLength={120} placeholder="e.g. Special Home Services Discount —" className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Discount Text</label>
                    <input value={strip.discountText} onChange={(e) => setStripField('discountText', e.target.value)} maxLength={60} placeholder="e.g. FLAT 15% OFF" className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Right Text</label>
                    <input value={strip.textRight} onChange={(e) => setStripField('textRight', e.target.value)} maxLength={160} placeholder="e.g. on your first booking. Use code" className={FIELD_INPUT} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className={FIELD_LABEL}>Coupon Code</label>
                    <input value={strip.couponCode} onChange={(e) => setStripField('couponCode', e.target.value)} maxLength={40} placeholder="e.g. CITY15" className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Button Text</label>
                    <input value={strip.buttonText} onChange={(e) => setStripField('buttonText', e.target.value)} maxLength={40} placeholder="e.g. Claim Offer" className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Button Link</label>
                    <input value={strip.buttonLink} onChange={(e) => setStripField('buttonLink', e.target.value)} maxLength={500} placeholder="e.g. /services" className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Status</label>
                    <select value={strip.status} onChange={(e) => setStripField('status', e.target.value)} className={statusSelectClass(strip.status)}>
                      <option value="ACTIVE">Active (shown)</option>
                      <option value="INACTIVE">Inactive (hidden)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <ColorField label="Background From" value={strip.bgGradientFrom} onChange={(v) => setStripField('bgGradientFrom', v)} placeholder="#020617" />
                  <ColorField label="Background Via" value={strip.bgGradientVia} onChange={(v) => setStripField('bgGradientVia', v)} placeholder="#0d131f" />
                  <ColorField label="Background To" value={strip.bgGradientTo} onChange={(v) => setStripField('bgGradientTo', v)} placeholder="#020617" />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <ColorField label="Discount BG" value={strip.discountBg} onChange={(v) => setStripField('discountBg', v)} placeholder="#7cb342" />
                  <ColorField label="Discount Text Color" value={strip.discountTextColor} onChange={(v) => setStripField('discountTextColor', v)} placeholder="#020617" />
                  <ColorField label="Coupon BG" value={strip.couponBg} onChange={(v) => setStripField('couponBg', v)} placeholder="rgba(251,191,36,0.12)" />
                  <ColorField label="Coupon Text Color" value={strip.couponTextColor} onChange={(v) => setStripField('couponTextColor', v)} placeholder="#fcd34d" />
                </div>

                <button type="submit" disabled={updateStrip.isPending} className={SAVE_BUTTON}>
                  <Save className="h-3.5 w-3.5" />
                  {updateStrip.isPending ? 'Saving...' : 'Save Offer Strip'}
                </button>
              </div>

              {/* LIVE PREVIEW */}
              <div className="lg:col-span-2">
                <label className={FIELD_LABEL}><Eye className="h-3 w-3" /> Live Preview</label>
                <p className="mb-3 text-[10px] font-medium text-gray-400">This live preview updates automatically as you type.</p>
                {/* Same design as the website's OfferStrip (nextfrontend/src/components/home/OfferStrip) */}
                <div className="relative w-full overflow-hidden shadow-lg" style={stripBackground(strip)}>
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '14px 14px' }}
                  />
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7cb342]/70 to-transparent" />
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#7cb342]/50 to-transparent" />

                  <div className="relative flex flex-wrap items-center justify-center gap-4 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7cb342]/15 shadow-[0_0_16px_rgba(124,179,66,0.35)] ring-1 ring-[#7cb342]/40">
                        <Gift className="h-4 w-4 text-[#7cb342]" />
                      </span>
                      <div className="leading-tight">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#7cb342]">Limited Offer</span>
                        {strip.textLeft && (
                          <span className="block text-[13px] font-semibold text-white">{strip.textLeft.replace(/\s*[—-]\s*$/, '')}</span>
                        )}
                      </div>
                    </div>

                    <span aria-hidden className="h-8 w-px bg-white/15" />

                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      {strip.discountText && (
                        <span
                          className="inline-flex items-center px-3.5 py-1 text-[12px] font-black uppercase tracking-wider shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]"
                          style={{
                            background: strip.discountBg,
                            color: strip.discountTextColor,
                            WebkitMaskImage: 'radial-gradient(circle at 0 50%, transparent 5px, #000 5.5px), radial-gradient(circle at 100% 50%, transparent 5px, #000 5.5px)',
                            WebkitMaskComposite: 'source-in',
                            maskImage: 'radial-gradient(circle at 0 50%, transparent 5px, #000 5.5px), radial-gradient(circle at 100% 50%, transparent 5px, #000 5.5px)',
                            maskComposite: 'intersect',
                          }}
                        >
                          {strip.discountText}
                        </span>
                      )}
                      {strip.textRight && <span className="text-[12px] font-medium text-white/80">{strip.textRight}</span>}
                      {strip.couponCode && (
                        <span
                          className="inline-flex items-center gap-2 rounded-lg border border-dashed px-2.5 py-1 text-[12px] font-bold tracking-[0.15em]"
                          style={{ background: strip.couponBg, color: strip.couponTextColor, borderColor: strip.couponTextColor }}
                        >
                          {strip.couponCode}
                          <span className="flex items-center gap-1 border-l pl-2 text-[10px] font-semibold tracking-normal opacity-90" style={{ borderColor: strip.couponTextColor }}>
                            <Copy className="h-3 w-3" /> Copy
                          </span>
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7cb342] px-4 py-2 text-[12px] font-bold text-slate-950 shadow-[0_8px_20px_-8px_rgba(124,179,66,0.8)]">
                      {strip.buttonText || 'Claim Offer'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
                {strip.status === 'INACTIVE' && (
                  <p className="mt-2 text-[10px] font-bold text-red-500">Inactive — the strip is hidden on the website.</p>
                )}
              </div>
            </div>
          )}
        </form>

        {/* ─── OFFER CARDS ─── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1" id="offer-form">
            <form onSubmit={handleOfferSubmit} className={CARD}>
              <h2 className={CARD_TITLE}>
                <PlusCircle className="h-4 w-4" /> {editingId ? 'Update Offer' : 'Create New Offer'}
              </h2>

              <div className="space-y-3">
                <div>
                  <label className={FIELD_LABEL}>Offer Title <span className="text-red-500">*</span></label>
                  <input value={offer.title} onChange={(e) => setOfferField('title', e.target.value)} maxLength={80} required placeholder="e.g. AC Servicing" className={FIELD_INPUT} />
                </div>

                <div>
                  <label className={FIELD_LABEL}>Short Description</label>
                  <textarea value={offer.description} onChange={(e) => setOfferField('description', e.target.value)} maxLength={240} rows={3} placeholder="e.g. Get 20% off on complete AC servicing and chemical washing." className={`${FIELD_INPUT} resize-none`} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={FIELD_LABEL}>Coupon Code</label>
                    <input value={offer.couponCode} onChange={(e) => setOfferField('couponCode', e.target.value)} maxLength={40} placeholder="e.g. COOL20" className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Icon</label>
                    <select value={offer.icon} onChange={(e) => setOfferField('icon', e.target.value as OfferIcon)} className={FIELD_INPUT}>
                      {OFFER_ICONS.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Accent Color" value={offer.accentColor} onChange={(v) => setOfferField('accentColor', v)} placeholder="#0369a1" />
                  <ColorField label="Tint Color" value={offer.tintColor} onChange={(v) => setOfferField('tintColor', v)} placeholder="#e0f2fe" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={FIELD_LABEL}>Display Order</label>
                    <input type="number" min={0} value={offer.sortOrder} onChange={(e) => setOfferField('sortOrder', Number(e.target.value))} className={FIELD_INPUT} />
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Status</label>
                    <select value={offer.status} onChange={(e) => setOfferField('status', e.target.value as OfferStatus)} className={statusSelectClass(offer.status)}>
                      <option value="ACTIVE">Active Offer</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className={FIELD_LABEL}><Eye className="h-3 w-3" /> Card Preview</label>
                  <div className="px-3 pb-1 pt-4">
                    <OfferCardPreview offer={offer} />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {editingId && (
                    <button type="button" onClick={resetOffer} className="flex items-center justify-center gap-1.5 rounded-[6px] bg-gray-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-gray-600">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  )}
                  <button type="submit" disabled={offerSaving} className={`${SAVE_BUTTON} flex-1`}>
                    <Save className="h-3.5 w-3.5" />
                    {offerSaving ? 'Saving...' : editingId ? 'Update Offer' : 'Create Offer'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className={CARD}>
              <h2 className={CARD_TITLE}>
                <List className="h-4 w-4" /> Offers List
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {offersLoading ? 'Loading...' : `${offerList.length} offers`}
                </span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap border-collapse text-left">
                  <thead>
                    <tr className="border-y-2 border-gray-200 bg-gray-50">
                      {['Title', 'Colors', 'Icon', 'Coupon', 'Order', 'Status', 'Actions'].map((h) => (
                        <th key={h} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {offersLoading ? (
                      <tr><td colSpan={7} className="py-10 text-center text-xs font-semibold text-gray-400">Loading offers...</td></tr>
                    ) : offerList.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-xs font-semibold text-gray-400">No offers yet. Create one on the left.</td></tr>
                    ) : (
                      offerList.map((item) => {
                        const Icon = ICONS[item.icon] ?? Gift;
                        return (
                          <tr key={item._id} className={`transition hover:bg-slate-50/80 ${editingId === item._id ? 'bg-[#3e8914]/5' : ''}`}>
                            <td className="max-w-[220px] px-3 py-2.5">
                              <p className="truncate text-xs font-bold text-[#111827]">{item.title}</p>
                              {item.description && <p className="truncate text-[10px] font-medium text-gray-400">{item.description}</p>}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1">
                                <span className="h-6 w-6 border-2 border-gray-200" style={{ background: item.accentColor }} title={item.accentColor} />
                                <span className="h-6 w-6 border-2 border-gray-200" style={{ background: item.tintColor }} title={item.tintColor} />
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <Icon className="h-4 w-4" style={{ color: item.accentColor }} />
                            </td>
                            <td className="px-3 py-2.5 text-xs font-bold tracking-wider text-[#35445f]">{item.couponCode || '—'}</td>
                            <td className="px-3 py-2.5 text-xs font-semibold text-[#293681]">#{item.sortOrder}</td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center rounded-[5px] px-2 py-1 text-[10px] font-bold ${
                                item.status === 'ACTIVE'
                                  ? 'border border-[#a5d6a7] bg-[#e8f5e9] text-[#23714a]'
                                  : 'border border-[#ef9a9a] bg-[#ffebee] text-[#c62828]'
                              }`}>
                                {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-blue-400/30 bg-blue-500/10 text-blue-600 transition-all hover:scale-105 hover:bg-blue-500/20"
                                  title="Edit offer"
                                  aria-label="Edit offer"
                                >
                                  <Edit className="h-[15px] w-[15px]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item._id)}
                                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-red-400/30 bg-red-500/10 text-red-600 transition-all hover:scale-105 hover:bg-red-500/20"
                                  title="Delete offer"
                                  aria-label="Delete offer"
                                >
                                  <Trash2 className="h-[15px] w-[15px]" />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
