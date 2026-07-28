export type SoundType =
  | 'arrival'             // Accueil confirme l'arrivée d'un patient
  | 'prescription-sent'   // Prescription envoyée avec succès
  | 'prescription-incoming'    // Prescription reçue — urgence NORMALE
  | 'prescription-urgent'      // Prescription reçue — urgence URGENTE
  | 'prescription-stat';       // Prescription reçue — urgence STAT (vie en danger)

type OscType = OscillatorType;

function tone(
  ctx: AudioContext,
  freq: number,
  startSec: number,
  durationSec: number,
  volume = 0.5,
  shape: OscType = 'sine',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = shape;
  osc.frequency.value = freq;
  const t = ctx.currentTime + startSec;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);
  osc.start(t);
  osc.stop(t + durationSec + 0.05);
}

export function playSound(type: SoundType): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    switch (type) {
      // C5 → E5 → G5 : arpège ascendant chaleureux — "bienvenue"
      case 'arrival':
        tone(ctx, 523, 0.00, 0.30, 0.40);
        tone(ctx, 659, 0.22, 0.30, 0.40);
        tone(ctx, 784, 0.44, 0.45, 0.50);
        break;

      // Double ping discret — confirmation d'envoi
      case 'prescription-sent':
        tone(ctx, 660, 0.00, 0.18, 0.28);
        tone(ctx, 880, 0.22, 0.22, 0.22);
        break;

      // Double bong — prescription reçue, urgence normale
      case 'prescription-incoming':
        tone(ctx, 440, 0.00, 0.35, 0.50);
        tone(ctx, 440, 0.45, 0.35, 0.50);
        break;

      // Triple bip aigu — urgence URGENTE (attire l'attention)
      case 'prescription-urgent':
        tone(ctx, 880, 0.00, 0.18, 0.55, 'square');
        tone(ctx, 880, 0.25, 0.18, 0.55, 'square');
        tone(ctx, 880, 0.50, 0.18, 0.55, 'square');
        break;

      // Alarme alternée 880/1200 Hz × 4 — STAT, critique
      case 'prescription-stat':
        for (let i = 0; i < 4; i++) {
          tone(ctx, i % 2 === 0 ? 880 : 1200, i * 0.22, 0.18, 0.70, 'sawtooth');
        }
        break;
    }
  } catch {
    // Ignore si AudioContext non disponible (ex. SSR)
  }
}
