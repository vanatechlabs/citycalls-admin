import type { AxiosError } from 'axios';
import Swal from 'sweetalert2';
import type { ApiErrorEnvelope } from '@/lib/api/client';
import { useTransitionRegistration, Registration } from '@/lib/hooks/useRegistrations';
import { STATUS_META } from '@/lib/registrations/constants';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Asks for a note in a popup, then moves the registration to its next stage
// (Pending → Active → Completed). Resolves to the updated registration, or
// null if the user cancelled or the move failed.
export function useStageTransition() {
  const transition = useTransitionRegistration();

  async function moveToNextStage(registration: Registration): Promise<Registration | null> {
    const next = STATUS_META[registration.status].next;
    if (!next) return null;

    // Moving to Completed shows the note written when it was activated.
    const previousNote = registration.status === 'ACTIVE' && registration.activationNote
      ? `<div style="text-align:left;margin:0 0 10px;padding:8px 10px;background:#f6f9f4;border:1px solid #d9e7d3;font-size:12px">
           <b>Active note</b> <span style="color:#6b7280">— ${escapeHtml(registration.activationNote.by.name)}</span><br/>${escapeHtml(registration.activationNote.note)}
         </div>`
      : '';

    const { value: note, isConfirmed } = await Swal.fire<string>({
      title: next.noteTitle,
      html: `<div style="font-size:13px;margin-bottom:8px"><b>${escapeHtml(registration.registrationNo)}</b> — ${escapeHtml(registration.fullName)}<br/>
               <span style="color:#6b7280">${escapeHtml(registration.serviceName)}</span></div>${previousNote}`,
      input: 'textarea',
      inputLabel: 'Notes',
      inputPlaceholder: next.notePlaceholder,
      inputAttributes: { maxlength: '1000' },
      showCancelButton: true,
      confirmButtonText: next.action,
      confirmButtonColor: '#3e8914',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => (!value?.trim() ? 'Please write a note' : undefined),
    });
    if (!isConfirmed || !note) return null;

    try {
      const updated = await transition.mutateAsync({ id: registration._id, status: next.status, note: note.trim() });
      void Swal.fire({
        icon: 'success',
        title: `Moved to ${STATUS_META[next.status].listTitle}`,
        timer: 1500,
        showConfirmButton: false,
      });
      return updated;
    } catch (error) {
      const envelope = (error as AxiosError<ApiErrorEnvelope>)?.response?.data;
      void Swal.fire({ icon: 'error', title: 'Could not move registration', text: envelope?.message });
      return null;
    }
  }

  return { moveToNextStage, isPending: transition.isPending };
}
