'use client';

import type { AxiosError } from 'axios';
import { PanelTop } from 'lucide-react';
import Swal from 'sweetalert2';

import type { ApiErrorEnvelope } from '@/lib/api/client';
import { usePermission } from '@/lib/hooks/useAuth';
import { useSiteSettings, useUpdateSiteSettings } from '@/lib/hooks/useSiteSettings';

// Settings → Website Navbar. One switch, saved as soon as it's flipped:
// ON  = the solid black navbar on every page,
// OFF = see-through navbar over the photo banner (glass once you scroll).

function errorMessage(error: unknown) {
  const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
  return envelope?.errors?.[0]?.message || envelope?.message || 'Could not save the setting.';
}

const MENU = ['Home Appliance', 'Pest Control', 'Cleaning', 'Blogs'];

// Small picture of the website's top: navbar over the banner photo.
function Preview({ solid, active, label }: { solid: boolean; active: boolean; label: string }) {
  return (
    <div className={`overflow-hidden rounded-lg border-2 transition-colors ${active ? 'border-[#3e8914]' : 'border-gray-200 opacity-60'}`}>
      <div className="relative h-[86px] bg-gradient-to-br from-[#5b7a8c] via-[#8aa3ad] to-[#c9b48a]">
        <div className={`flex h-[26px] items-center gap-2 px-2 ${solid ? 'bg-[#14181c]' : 'bg-gradient-to-b from-black/40 to-transparent'}`}>
          <span className="text-[8px] font-black text-white">City<span className="text-[#a3e635]">Calls</span></span>
          <div className="flex gap-1.5 rounded-full border border-white/20 bg-white/10 px-2 py-0.5">
            {MENU.map((m) => <span key={m} className="text-[5.5px] font-semibold text-white/90">{m}</span>)}
          </div>
        </div>
        <div className="px-2 pt-2">
          <div className="h-1.5 w-20 rounded bg-white/90" />
          <div className="mt-1 h-1.5 w-14 rounded bg-[#a3e635]" />
        </div>
      </div>
      <p className={`px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wide ${active ? 'bg-[#3e8914]/10 text-[#2f6b0f]' : 'bg-gray-50 text-gray-500'}`}>
        {active ? '✓ ' : ''}{label}
      </p>
    </div>
  );
}

export function NavbarStyleCard() {
  const { data, isLoading } = useSiteSettings();
  const update = useUpdateSiteSettings();
  const canEdit = usePermission('config', 'manageSettings');
  const solid = !!data?.solidNavbar;

  const flip = () => {
    if (!data || !canEdit || update.isPending) return;
    const next = !solid;
    update.mutate(
      { solidNavbar: next },
      {
        onSuccess: () =>
          void Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: next ? 'Black navbar turned ON' : 'Black navbar turned OFF — transparent navbar is live',
            timer: 2600,
            showConfirmButton: false,
          }),
        onError: (err) => void Swal.fire({ icon: 'error', title: 'Not saved', text: errorMessage(err), confirmButtonColor: '#3e8914' }),
      }
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-[#233D4D] px-4 py-2.5">
        <div>
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
            <PanelTop className="h-3.5 w-3.5" /> Website Navbar
          </h2>
          <p className="mt-0.5 text-[9px] font-medium uppercase text-slate-200">
            Now showing: <span className="font-bold text-[#a3e635]">{isLoading ? '…' : solid ? 'Black navbar' : 'Transparent navbar'}</span>
          </p>
        </div>

        {/* The switch */}
        <button
          type="button"
          role="switch"
          aria-checked={solid}
          aria-label="Black navbar"
          disabled={!data || !canEdit || update.isPending}
          onClick={flip}
          className="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-white">Black Navbar</span>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${solid ? 'bg-[#a3e635]' : 'bg-white/25'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${solid ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
          <span className={`w-7 text-left text-[10px] font-black uppercase ${solid ? 'text-[#a3e635]' : 'text-white/70'}`}>{solid ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Preview solid active={solid} label="On — Black navbar" />
          <Preview solid={false} active={!solid} label="Off — Transparent navbar" />
        </div>
        <ul className="space-y-1 text-[11px] leading-relaxed text-gray-600">
          <li><b className="text-[#18233b]">On:</b> the black navbar on every page of the website.</li>
          <li>
            <b className="text-[#18233b]">Off:</b> the navbar is see-through on pages that open with a photo banner (Home, Services, Blogs) so the
            photo shows behind it — it turns into dark glass when the page is scrolled. Other pages keep the black navbar.
          </li>
        </ul>
        <p className="text-[10px] text-gray-400">
          Saved as soon as you flip the switch. The website picks it up within a minute.
          {data?.updatedBy && <> Last changed by <b className="text-gray-500">{data.updatedBy.name}</b>.</>}
          {!canEdit && ' You can view this setting but not change it.'}
        </p>
      </div>
    </div>
  );
}
