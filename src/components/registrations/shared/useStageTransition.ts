import type { AxiosError } from 'axios';
import Swal from 'sweetalert2';
import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useTransitionRegistration, MoveStatus, Registration } from '@/lib/hooks/useRegistrations';
import { STATUS_META, STATUS_TRANSITIONS } from '@/lib/registrations/constants';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Brand-ish colour per target status for the choice buttons in the popup.
const CHOICE_COLOR: Record<MoveStatus, string> = {
  ACTIVE: '#4f46e5',
  PENDING: '#f97316',
  REOPENED: '#9333ea',
  CLOSED: '#3e8914',
  CANCELLED: '#dc2626',
};

// Opens a popup to move a call to another status with a note. With `target`
// the status is fixed (e.g. an "Move to Active" button); without it the popup
// lists every status the call can move to. Resolves to the updated
// registration, or null if cancelled / failed.
export function useStageTransition() {
  const transition = useTransitionRegistration();

  async function changeStatus(registration: Registration, target?: MoveStatus): Promise<Registration | null> {
    const options = target ? [target] : STATUS_TRANSITIONS[registration.status];
    if (options.length === 0) return null;

    const lastNote = registration.lastNote
      ? `<div style="text-align:left;margin:0 0 10px;padding:8px 10px;background:#f6f9f4;border:1px solid #d9e7d3;font-size:12px">
           <b>Last note</b> <span style="color:#6b7280">— ${escapeHtml(registration.lastNote.by.name)}</span><br/>${escapeHtml(registration.lastNote.note)}
         </div>`
      : '';

    // One radio "pill" per allowed status (pre-selected when there's only one).
    const choices = options.map((status, i) => `
      <label style="flex:1 1 auto;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;border:2px solid ${CHOICE_COLOR[status]}33;padding:7px 10px;font-size:12px;font-weight:700;color:${CHOICE_COLOR[status]};background:${CHOICE_COLOR[status]}0d">
        <input type="radio" name="cc-status" value="${status}" ${i === 0 && options.length === 1 ? 'checked' : ''} style="accent-color:${CHOICE_COLOR[status]}" />
        ${escapeHtml(STATUS_META[status].action)}
      </label>`).join('');

    const { value, isConfirmed } = await Swal.fire<{ status: MoveStatus; note: string }>({
      title: target ? STATUS_META[target].action : 'Change Call Status',
      html: `<div style="font-size:13px;margin-bottom:10px"><b>${escapeHtml(registration.registrationNo)}</b> — ${escapeHtml(registration.fullName)}<br/>
               <span style="color:#6b7280">${escapeHtml(registration.serviceName)} · now <b>${STATUS_META[registration.status].label}</b></span></div>
             ${lastNote}
             <div style="text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:6px 0 4px">Move to</div>
             <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${choices}</div>
             <div style="text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">Notes</div>
             <textarea id="cc-note" maxlength="1000" rows="4" style="width:100%;border:2px solid #d1d5db;padding:8px;font-size:13px;outline:none;resize:vertical"
               placeholder="${escapeHtml(STATUS_META[options[0]].notePlaceholder)}"></textarea>`,
      showCancelButton: true,
      confirmButtonText: 'Update Status',
      confirmButtonColor: '#3e8914',
      cancelButtonColor: '#6b7280',
      focusConfirm: false,
      didOpen: (popup) => {
        // The note placeholder follows the chosen status.
        const note = popup.querySelector<HTMLTextAreaElement>('#cc-note');
        popup.querySelectorAll<HTMLInputElement>('input[name="cc-status"]').forEach((radio) => {
          radio.addEventListener('change', () => {
            if (note) note.placeholder = STATUS_META[radio.value as MoveStatus].notePlaceholder;
          });
        });
        note?.focus();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const status = popup?.querySelector<HTMLInputElement>('input[name="cc-status"]:checked')?.value as MoveStatus | undefined;
        const note = popup?.querySelector<HTMLTextAreaElement>('#cc-note')?.value.trim() ?? '';
        if (!status) {
          Swal.showValidationMessage('Please choose the new status');
          return false;
        }
        if (!note) {
          Swal.showValidationMessage('Please write a note');
          return false;
        }
        return { status, note };
      },
    });
    if (!isConfirmed || !value) return null;

    try {
      const updated = await transition.mutateAsync({ id: registration._id, status: value.status, note: value.note });
      void Swal.fire({
        icon: 'success',
        title: `Moved to ${STATUS_META[value.status].listTitle}`,
        timer: 1500,
        showConfirmButton: false,
      });
      return updated;
    } catch (error) {
      const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
      void Swal.fire({ icon: 'error', title: 'Could not change status', text: envelope?.message });
      return null;
    }
  }

  return { changeStatus, isPending: transition.isPending };
}
