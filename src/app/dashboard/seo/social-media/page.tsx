'use client';

import { useState } from 'react';
import { Contact, Link2, MessageCircle, Phone, Save, Share2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface SocialMediaForm {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  whatsappNumber: string;
  whatsappMessage: string;
  callNumber: string;
}

const emptyForm: SocialMediaForm = {
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  youtube: '',
  whatsappNumber: '',
  whatsappMessage: '',
  callNumber: '',
};

const FIELD_LABEL = 'mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500';
const FIELD_INPUT = 'w-full border-2 border-gray-300 px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#3e8914]';

export default function SocialMediaPage() {
  const [form, setForm] = useState<SocialMediaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof SocialMediaForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      void Swal.fire({ icon: 'success', title: 'Social media links updated', timer: 1500, showConfirmButton: false });
    }, 400);
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        <div className="mb-[20px] border-b-[2px] border-[#293681] pb-[8px]">
          <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">Social Media</h1>
          <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">Manage your social media links and website contact information.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="border-2 border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#3e8914]">
                <Contact className="h-4 w-4" /> Contact Info
              </h2>

              <div className="space-y-3">
                <div>
                  <label className={FIELD_LABEL}><MessageCircle className="h-3 w-3 text-[#25D366]" /> WhatsApp Number</label>
                  <input
                    value={form.whatsappNumber}
                    onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                    placeholder="e.g. 919876543210"
                    className={FIELD_INPUT}
                  />
                  <p className="mt-1 text-[9px] font-medium text-gray-400">No + symbol</p>
                </div>

                <div>
                  <label className={FIELD_LABEL}><Phone className="h-3 w-3 text-blue-600" /> Call Float Number</label>
                  <input
                    value={form.callNumber}
                    onChange={(e) => handleChange('callNumber', e.target.value)}
                    placeholder="e.g. +919876543210"
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}>WhatsApp Message</label>
                  <textarea
                    value={form.whatsappMessage}
                    onChange={(e) => handleChange('whatsappMessage', e.target.value)}
                    rows={3}
                    placeholder="Default message..."
                    className={FIELD_INPUT}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-1.5 rounded-[6px] bg-[#4B1426] py-2 text-xs font-bold text-white shadow-[0_5px_12px_rgba(75,20,38,0.25)] transition-colors hover:bg-[#3a0f1d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="border-2 border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#3e8914]">
                <Share2 className="h-4 w-4" /> Social Networks
              </h2>

              <div className="space-y-3">
                <div>
                  <label className={FIELD_LABEL}><Link2 className="h-3 w-3 text-[#1877F2]" /> Facebook URL</label>
                  <input
                    type="url"
                    value={form.facebook}
                    onChange={(e) => handleChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}><Link2 className="h-3 w-3 text-[#E4405F]" /> Instagram URL</label>
                  <input
                    type="url"
                    value={form.instagram}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/yourpage"
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}><Link2 className="h-3 w-3 text-black" /> Twitter URL</label>
                  <input
                    type="url"
                    value={form.twitter}
                    onChange={(e) => handleChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/yourpage"
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}><Link2 className="h-3 w-3 text-[#0A66C2]" /> LinkedIn URL</label>
                  <input
                    type="url"
                    value={form.linkedin}
                    onChange={(e) => handleChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/yourcompany"
                    className={FIELD_INPUT}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}><Link2 className="h-3 w-3 text-[#FF0000]" /> YouTube URL</label>
                  <input
                    type="url"
                    value={form.youtube}
                    onChange={(e) => handleChange('youtube', e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                    className={FIELD_INPUT}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
