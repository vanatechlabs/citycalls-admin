// A short two-note chime made with the Web Audio API — no audio file needed.
//
// Browsers block audio until the user has interacted with the page, so the
// AudioContext is created/resumed on the first click or key press
// (unlockNotificationTone) and the chime plays silently-safe before that.

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

export function unlockNotificationTone() {
  const ctx = getContext();
  if (ctx?.state === 'suspended') void ctx.resume();
}

function note(ctx: AudioContext, frequency: number, start: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// "Ding-dong" (E6 → B5), played twice.
export function playNotificationTone() {
  const ctx = getContext();
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  note(ctx, 1318.5, t, 0.35);
  note(ctx, 987.8, t + 0.18, 0.55);
  note(ctx, 1318.5, t + 0.9, 0.35);
  note(ctx, 987.8, t + 1.08, 0.55);
}
