// Haptic feedback via navigator.vibrate — Android only (no-op on iOS Safari).

import { getSetting, setSetting } from '@/db/database';

let enabled = true;

getSetting('haptics_enabled', '1').then(v => { enabled = v === '1'; });

export function isHapticsEnabled(): boolean {
  return enabled;
}

export async function setHapticsEnabled(value: boolean): Promise<void> {
  enabled = value;
  await setSetting('haptics_enabled', value ? '1' : '0');
}

function vibrate(pattern: number | number[]) {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  tap: () => vibrate(10),
  success: () => vibrate([15, 30, 25]),
  error: () => vibrate([40, 40, 40]),
  celebrate: () => vibrate([20, 30, 20, 30, 60]),
};
