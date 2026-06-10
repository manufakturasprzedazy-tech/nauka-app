// Synthesized UI sounds via Web Audio — no audio files needed.
// AudioContext is created lazily on first user gesture (iOS requirement).

import { getSetting, setSetting } from '@/db/database';

let ctx: AudioContext | null = null;
let enabled = true;

getSetting('sound_enabled', '1').then(v => { enabled = v === '1'; });

export function isSoundEnabled(): boolean {
  return enabled;
}

export async function setSoundEnabled(value: boolean): Promise<void> {
  enabled = value;
  await setSetting('sound_enabled', value ? '1' : '0');
}

function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export const sounds = {
  success() {
    if (!enabled) return;
    tone(523.25, 0, 0.12); // C5
    tone(783.99, 0.08, 0.18); // G5
  },
  error() {
    if (!enabled) return;
    tone(196, 0, 0.2, 'triangle', 0.06); // G3
  },
  comboTick(combo: number) {
    if (!enabled) return;
    // Pitch rises with combo, capped
    const base = 523.25 * Math.pow(1.06, Math.min(combo, 12));
    tone(base, 0, 0.1, 'sine', 0.06);
  },
  flip() {
    if (!enabled) return;
    tone(440, 0, 0.06, 'sine', 0.04);
  },
  levelUp() {
    if (!enabled) return;
    tone(523.25, 0, 0.15);
    tone(659.25, 0.12, 0.15);
    tone(783.99, 0.24, 0.15);
    tone(1046.5, 0.36, 0.3);
  },
  questDone() {
    if (!enabled) return;
    tone(659.25, 0, 0.12);
    tone(987.77, 0.1, 0.25);
  },
};
