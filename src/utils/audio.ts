type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (sharedCtx) {
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => undefined);
    }
    return sharedCtx;
  }
  const w = window as WebkitWindow;
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    sharedCtx = new Ctor();
    return sharedCtx;
  } catch {
    return null;
  }
}

function beep(ctx: AudioContext, frequency: number, when: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.1, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  osc.start(when);
  osc.stop(when + duration);
}

/**
 * Toca um bip duplo curto de confirmação ao registar um ponto.
 * Reutiliza um único `AudioContext` partilhado entre chamadas para evitar
 * o aviso "AudioContext was not allowed to start" e leak de contextos.
 */
export function playRegisterSound(enabled = true): void {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const start = ctx.currentTime;
    beep(ctx, 600, start, 0.1);
    beep(ctx, 880, start + 0.12, 0.15);
  } catch (e) {
    console.warn('Falha ao reproduzir som:', e);
  }
}
