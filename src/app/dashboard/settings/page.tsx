'use client';

import { useState } from 'react';
import {
  ArrowUp,
  Contact,
  Edit2,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Settings as SettingsIcon,
  Trash2,
  X,
} from 'lucide-react';
import Swal from 'sweetalert2';

interface EmailEntry {
  id: string;
  email: string;
  isEditing: boolean;
  forTopbar: boolean;
  forContact: boolean;
}

interface PhoneEntry {
  id: string;
  phone: string;
  isEditing: boolean;
  forTopbar: boolean;
  forContact: boolean;
}

interface OfficeAddress {
  id: string;
  title: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  mapLink: string;
  isEditing: boolean;
}

interface QuickLink {
  id: string;
  label: string;
  href: string;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function SettingsPage() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [emails, setEmails] = useState<EmailEntry[]>([
    { id: uid(), email: 'info@citycalls.in', isEditing: false, forTopbar: true, forContact: true },
  ]);
  const [newEmail, setNewEmail] = useState('');

  const [phones, setPhones] = useState<PhoneEntry[]>([
    { id: uid(), phone: '+91 98765 43210', isEditing: false, forTopbar: true, forContact: true },
  ]);
  const [newPhone, setNewPhone] = useState('');

  const [mapIframe, setMapIframe] = useState('');

  const [addresses, setAddresses] = useState<OfficeAddress[]>([
    { id: uid(), title: 'Head Office', street: 'Plot No. 1, Sector 5', city: 'Gurugram', state: 'Haryana', zipCode: '122001', mapLink: '', isEditing: false },
  ]);

  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([
    { id: uid(), label: 'Appliance Repair', href: '/services/refrigerator-service' },
    { id: uid(), label: 'Home Cleaning', href: '/home-cleaning' },
  ]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkHref, setNewLinkHref] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveConfiguration = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      void Swal.fire({ icon: 'success', title: 'Configuration Saved', text: 'System settings have been updated successfully.', confirmButtonColor: '#3e8914' });
    }, 400);
  };

  // Emails
  const addEmail = () => {
    if (!newEmail.trim() || emails.some((e) => e.email === newEmail)) return;
    setEmails((prev) => [...prev, { id: uid(), email: newEmail.trim(), isEditing: false, forTopbar: prev.length === 0, forContact: prev.length === 0 }]);
    setNewEmail('');
  };
  const removeEmail = (id: string) => setEmails((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  const setTopbarEmail = (id: string) => setEmails((prev) => prev.map((e) => ({ ...e, forTopbar: e.id === id })));
  const setContactEmail = (id: string) => setEmails((prev) => prev.map((e) => ({ ...e, forContact: e.id === id })));

  // Phones
  const addPhone = () => {
    if (!newPhone.trim() || phones.some((p) => p.phone === newPhone)) return;
    setPhones((prev) => [...prev, { id: uid(), phone: newPhone.trim(), isEditing: false, forTopbar: prev.length === 0, forContact: prev.length === 0 }]);
    setNewPhone('');
  };
  const removePhone = (id: string) => setPhones((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  const setTopbarPhone = (id: string) => setPhones((prev) => prev.map((p) => ({ ...p, forTopbar: p.id === id })));
  const setContactPhone = (id: string) => setPhones((prev) => prev.map((p) => (p.id === id ? { ...p, forContact: !p.forContact } : p)));

  // Addresses
  const addNewAddress = () => {
    setAddresses((prev) => [{ id: uid(), title: '', street: '', city: '', state: '', zipCode: '', mapLink: '', isEditing: true }, ...prev]);
  };
  const saveAddressField = (id: string, field: keyof OfficeAddress, value: string) => {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };
  const saveAddress = (id: string) => {
    const address = addresses.find((a) => a.id === id);
    if (!address?.title.trim() || !address.street.trim()) {
      void Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in the title and address before saving.', confirmButtonColor: '#3e8914' });
      return;
    }
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, isEditing: false } : a)));
  };
  const cancelAddressEdit = (id: string) => {
    const address = addresses.find((a) => a.id === id);
    if (!address?.street.trim()) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } else {
      setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, isEditing: false } : a)));
    }
  };
  const startEditingAddress = (id: string) => setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, isEditing: true } : a)));
  const removeAddress = (id: string) => setAddresses((prev) => prev.filter((a) => a.id !== id));

  // Quick links
  const submitLink = () => {
    if (!newLinkLabel.trim() || !newLinkHref.trim()) return;
    if (editingLinkId) {
      setQuickLinks((prev) => prev.map((l) => (l.id === editingLinkId ? { ...l, label: newLinkLabel, href: newLinkHref } : l)));
      setEditingLinkId(null);
    } else {
      setQuickLinks((prev) => [...prev, { id: uid(), label: newLinkLabel, href: newLinkHref }]);
    }
    setNewLinkLabel('');
    setNewLinkHref('');
  };
  const startEditingLink = (link: QuickLink) => {
    setEditingLinkId(link.id);
    setNewLinkLabel(link.label);
    setNewLinkHref(link.href);
  };
  const cancelLinkEdit = () => {
    setEditingLinkId(null);
    setNewLinkLabel('');
    setNewLinkHref('');
  };
  const removeLink = (id: string) => setQuickLinks((prev) => prev.filter((l) => l.id !== id));

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        <div className="mb-[20px] flex flex-wrap items-center justify-between gap-3 border-b-[2px] border-[#293681] pb-[8px]">
          <div>
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">System Configuration</h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage CityCalls&apos; branding and contact information.</p>
          </div>
          <button
            onClick={saveConfiguration}
            disabled={saving}
            className="flex h-[30px] items-center justify-center gap-[5px] rounded-[6px] bg-[#4B1426] px-[14px] text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] transition hover:bg-[#3a0f1d] disabled:opacity-60"
          >
            {saving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-[12px] w-[12px]" strokeWidth={1.7} />}
            Save Configuration
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* LEFT COLUMN — BRANDING & CONTACT */}
          <div className="space-y-5 lg:col-span-1">
            {/* Brand Identity */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-1.5">
                <div className="bg-[#3e8914]/10 p-1">
                  <SettingsIcon className="h-3.5 w-3.5 text-[#3e8914]" />
                </div>
                <h2 className="text-xs font-bold uppercase text-gray-900">Brand Identity</h2>
              </div>

              <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-500">Studio Logo (PNG, SVG)</label>
              <div className="group relative flex min-h-[110px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50/30 p-3 text-center transition-colors hover:border-[#3e8914]">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                {logoPreview ? (
                  <div className="relative flex h-full w-full flex-col items-center justify-center">
                    <div className="mb-1.5 flex h-16 w-16 items-center justify-center rounded border border-gray-100 bg-white p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setLogoPreview(null); }}
                      className="absolute right-0 top-0 z-20 rounded-full border border-gray-200 bg-white p-1 text-gray-400 shadow-sm hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-gray-600 shadow-sm">Change Logo</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-2">
                    <ImageIcon className="mb-1 h-6 w-6 text-gray-300" />
                    <p className="text-[8px] font-semibold uppercase tracking-widest text-gray-400">Click to upload brand logo</p>
                  </div>
                )}
              </div>
              <p className="mt-1 text-[8px] text-gray-400">Recommended: 512x512px, Transparent Background</p>
            </div>

            {/* Contact Channels */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-1.5">
                <div className="bg-[#3e8914]/10 p-1">
                  <Mail className="h-3.5 w-3.5 text-[#3e8914]" />
                </div>
                <h2 className="text-xs font-bold uppercase text-gray-900">Contact Channels</h2>
              </div>

              {/* Emails */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Email Addresses</label>
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] text-gray-500">{emails.length} Active</span>
                </div>
                <p className="text-[8px] italic text-gray-400">Toggle: Topbar (Layout) / Contact Page.</p>

                <div className="space-y-1">
                  {emails.map((item) => (
                    <div key={item.id} className={`group flex items-center gap-1 rounded border p-1 transition-colors ${item.forTopbar || item.forContact ? 'border-[#3e8914]/50 bg-[#3e8914]/5' : 'border-gray-100 bg-gray-50/50 hover:border-gray-300'}`}>
                      <div className="flex gap-0.5">
                        <button type="button" onClick={() => setTopbarEmail(item.id)} title="Show in Topbar" className={`rounded-full p-0.5 transition-colors ${item.forTopbar ? 'bg-[#3e8914]/15 text-[#3e8914]' : 'text-gray-300 hover:text-[#3e8914]'}`}>
                          <ArrowUp className={`h-2.5 w-2.5 ${item.forTopbar ? 'stroke-[3px]' : ''}`} />
                        </button>
                        <button type="button" onClick={() => setContactEmail(item.id)} title="Show on Contact Page" className={`rounded-full p-0.5 transition-colors ${item.forContact ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:text-blue-400'}`}>
                          <Contact className={`h-2.5 w-2.5 ${item.forContact ? 'stroke-[3px]' : ''}`} />
                        </button>
                      </div>
                      <div className="rounded border border-gray-100 bg-white p-0.5 text-[#3e8914]"><Mail className="h-2.5 w-2.5" /></div>
                      <span className="flex-1 truncate text-[11px] font-medium text-gray-700">{item.email}</span>
                      <button type="button" onClick={() => removeEmail(item.id)} className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1 border-t border-gray-100 pt-1.5">
                  <input
                    type="text"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                    placeholder="Add new email..."
                    className="flex-1 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] outline-none focus:border-[#3e8914]"
                  />
                  <button type="button" onClick={addEmail} disabled={!newEmail} className="rounded bg-[#3e8914] p-1 text-white hover:bg-[#347311] disabled:opacity-50">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Phones */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Phone Numbers</label>
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] text-gray-500">{phones.length} Active</span>
                </div>
                <p className="text-[8px] italic text-gray-400">Toggle: Topbar (Layout) / Contact Page.</p>

                <div className="space-y-1">
                  {phones.map((item) => (
                    <div key={item.id} className={`group flex items-center gap-1 rounded border p-1 transition-colors ${item.forTopbar || item.forContact ? 'border-orange-400/60 bg-orange-50/50' : 'border-gray-100 bg-gray-50/50 hover:border-gray-300'}`}>
                      <div className="flex gap-0.5">
                        <button type="button" onClick={() => setTopbarPhone(item.id)} title="Show in Topbar" className={`rounded-full p-0.5 transition-colors ${item.forTopbar ? 'bg-orange-100 text-orange-600' : 'text-gray-300 hover:text-orange-400'}`}>
                          <ArrowUp className={`h-2.5 w-2.5 ${item.forTopbar ? 'stroke-[3px]' : ''}`} />
                        </button>
                        <button type="button" onClick={() => setContactPhone(item.id)} title="Show on Contact Page" className={`rounded-full p-0.5 transition-colors ${item.forContact ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:text-blue-400'}`}>
                          <Contact className={`h-2.5 w-2.5 ${item.forContact ? 'stroke-[3px]' : ''}`} />
                        </button>
                      </div>
                      <div className="rounded border border-gray-100 bg-white p-0.5 text-orange-600"><Phone className="h-2.5 w-2.5" /></div>
                      <span className="flex-1 truncate text-[11px] font-medium text-gray-700">{item.phone}</span>
                      <button type="button" onClick={() => removePhone(item.id)} className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1 border-t border-gray-100 pt-1.5">
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPhone()}
                    placeholder="Add new phone..."
                    className="flex-1 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] outline-none focus:border-[#3e8914]"
                  />
                  <button type="button" onClick={addPhone} disabled={!newPhone} className="rounded bg-[#3e8914] p-1 text-white hover:bg-[#347311] disabled:opacity-50">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Map Embed */}
              <div className="mt-4 space-y-1 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-[#3e8914]" />
                  <label className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Google Map Embed (Contact Page)</label>
                </div>
                <p className="text-[8px] italic text-gray-400">Paste the full Google Maps iframe embed code here.</p>
                <textarea
                  value={mapIframe}
                  onChange={(e) => setMapIframe(e.target.value)}
                  placeholder='<iframe src="https://www.google.com/maps/embed?..." width="100%" height="450"></iframe>'
                  rows={3}
                  className="w-full resize-y rounded border border-gray-200 px-2 py-1 font-mono text-[9px] outline-none focus:border-[#3e8914]"
                />
                {mapIframe.includes('<iframe') && (
                  <div className="overflow-hidden rounded border border-gray-200">
                    <p className="border-b bg-gray-50 px-2 py-0.5 text-[8px] text-gray-400">Preview:</p>
                    <div dangerouslySetInnerHTML={{ __html: mapIframe }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — ADDRESSES & QUICK LINKS */}
          <div className="space-y-5 lg:col-span-2">
            {/* Office Locations */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b bg-[#233D4D] px-4 py-2.5">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">Office Locations</h2>
                  <p className="mt-0.5 text-[9px] font-medium uppercase text-slate-200">{addresses.length} Locations Listed</p>
                </div>
                <button
                  type="button"
                  onClick={addNewAddress}
                  className="flex items-center gap-1 rounded bg-white px-2.5 py-1 text-[9px] font-semibold uppercase text-[#233D4D] shadow-sm transition-colors hover:bg-slate-100"
                >
                  <Plus className="h-3 w-3" /> Add New Location
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                {addresses.map((address) => (
                  <div key={address.id} className={`rounded-lg border transition-all ${address.isEditing ? 'border-[#3e8914] ring-1 ring-[#3e8914] bg-[#3e8914]/5' : 'border-gray-200 bg-white hover:border-[#3e8914]/40 hover:shadow-md'}`}>
                    {address.isEditing ? (
                      <div className="space-y-2 p-3">
                        <div>
                          <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-wide text-gray-500">Property Title</label>
                          <input
                            value={address.title}
                            onChange={(e) => saveAddressField(address.id, 'title', e.target.value)}
                            placeholder="Head Office"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-[#3e8914]"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-wide text-gray-500">Address Details</label>
                          <textarea
                            value={address.street}
                            onChange={(e) => saveAddressField(address.id, 'street', e.target.value)}
                            rows={3}
                            placeholder="Enter address details here..."
                            className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-[#3e8914]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            value={address.city}
                            onChange={(e) => saveAddressField(address.id, 'city', e.target.value)}
                            placeholder="City"
                            className="rounded border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-[#3e8914]"
                          />
                          <input
                            value={address.state}
                            onChange={(e) => saveAddressField(address.id, 'state', e.target.value)}
                            placeholder="State"
                            className="rounded border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-[#3e8914]"
                          />
                        </div>
                        <input
                          value={address.mapLink}
                          onChange={(e) => saveAddressField(address.id, 'mapLink', e.target.value)}
                          placeholder="Google Maps URL (optional)"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-[#3e8914]"
                        />
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => saveAddress(address.id)} className="flex-1 rounded bg-[#3e8914] py-1 text-[9px] font-bold uppercase text-white shadow-sm hover:bg-[#347311]">Save</button>
                          <button type="button" onClick={() => cancelAddressEdit(address.id)} className="rounded border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase text-gray-600">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col p-3">
                        <div className="mb-1 flex items-start justify-between">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#3e8914]" />
                            <h3 className="text-[11px] font-bold text-gray-800">{address.title || 'Untitled Location'}</h3>
                          </div>
                          <div className="flex gap-0.5">
                            <button type="button" onClick={() => startEditingAddress(address.id)} className="p-0.5 text-gray-400 hover:text-blue-600"><Edit2 className="h-3 w-3" /></button>
                            <button type="button" onClick={() => removeAddress(address.id)} className="p-0.5 text-gray-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                        <div className="flex-1 text-[10px] text-gray-600">
                          {address.street}
                          {(address.city || address.state || address.zipCode) && (
                            <div className="mt-1 text-[9px] opacity-60">
                              {[address.city, address.state, address.zipCode].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b bg-[#233D4D] px-4 py-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">Quick Links</h2>
                <p className="mt-0.5 text-[9px] font-medium uppercase text-slate-200">{quickLinks.length} Links Listed</p>
              </div>

              <div className="p-4">
                <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <h3 className="mb-2 text-[8px] font-bold uppercase tracking-widest text-gray-500">{editingLinkId ? 'Edit' : 'Add New'} Quick Link</h3>
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold uppercase text-gray-400">Label</label>
                      <input
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        placeholder="e.g. Refrigerator Service"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-[#3e8914]"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold uppercase text-gray-400">URL / Path</label>
                      <div className="flex gap-1">
                        <input
                          value={newLinkHref}
                          onChange={(e) => setNewLinkHref(e.target.value)}
                          placeholder="/services/..."
                          className="flex-1 rounded border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-[#3e8914]"
                        />
                        <button type="button" onClick={submitLink} disabled={!newLinkLabel || !newLinkHref} className="rounded bg-[#3e8914] px-2.5 text-white transition-colors hover:bg-[#347311] disabled:opacity-50">
                          {editingLinkId ? <Save className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        </button>
                        {editingLinkId && (
                          <button type="button" onClick={cancelLinkEdit} className="rounded border border-gray-200 bg-white px-2.5 text-gray-400 hover:bg-gray-50">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#233D4D] text-[9px] font-bold uppercase tracking-wider text-white">
                      <th className="px-2.5 py-1.5">S.No</th>
                      <th className="px-2.5 py-1.5">Link Label</th>
                      <th className="px-2.5 py-1.5">URL / Path</th>
                      <th className="px-2.5 py-1.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quickLinks.length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-[11px] text-gray-400">No quick links yet.</td></tr>
                    ) : (
                      quickLinks.map((link, index) => (
                        <tr key={link.id} className="transition hover:bg-slate-50/80">
                          <td className="px-2.5 py-1.5 text-[11px] font-semibold text-[#3e8914]">{index + 1}</td>
                          <td className="px-2.5 py-1.5 text-[11px] font-medium text-gray-800">{link.label}</td>
                          <td className="px-2.5 py-1.5 font-mono text-[10px] text-gray-500">{link.href}</td>
                          <td className="px-2.5 py-1.5 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEditingLink(link)}
                                title="Edit"
                                className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-blue-500/10 text-blue-600 backdrop-blur-md border border-blue-400/30 shadow-[0_2px_6px_rgba(37,99,235,0.12)] transition-all hover:bg-blue-500/20 hover:scale-105 active:scale-95"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeLink(link.id)}
                                title="Delete"
                                className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-red-500/10 text-red-600 backdrop-blur-md border border-red-400/30 shadow-[0_2px_6px_rgba(220,38,38,0.12)] transition-all hover:bg-red-500/20 hover:scale-105 active:scale-95"
                              >
                                <Trash2 className="h-3 w-3" />
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
  );
}
