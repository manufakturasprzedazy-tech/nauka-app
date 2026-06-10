// API keys encrypted at rest in IndexedDB (AES-GCM, non-extractable CryptoKey).
//
// Honest limits: this protects keys against casual inspection of exported/synced
// IndexedDB files and DevTools snooping over the shoulder. It does NOT protect
// against XSS or anyone with full control of the device/browser profile — without
// a backend that's the best a static GitHub Pages app can do.

import { db } from '@/db/database';

const KEY_ID = 'main';

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = await db.cryptoKeys.get(KEY_ID);
  if (existing) return existing.key;
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — raw bytes can never be read out, only used
    ['encrypt', 'decrypt'],
  );
  await db.cryptoKeys.put({ id: KEY_ID, key });
  return key;
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bytes = atob(b64);
  const buf = new Uint8Array(new ArrayBuffer(bytes.length));
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return buf;
}

async function encrypt(plain: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return JSON.stringify({ iv: toBase64(iv.buffer), ct: toBase64(ct) });
}

async function decrypt(payload: string): Promise<string> {
  const key = await getOrCreateKey();
  const { iv, ct } = JSON.parse(payload);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(ct),
  );
  return new TextDecoder().decode(plain);
}

async function readSetting(key: string): Promise<string | null> {
  const row = await db.userSettings.where('key').equals(key).first();
  return row?.value ?? null;
}

async function writeSetting(key: string, value: string): Promise<void> {
  const existing = await db.userSettings.where('key').equals(key).first();
  if (existing) await db.userSettings.update(existing.id!, { value });
  else await db.userSettings.add({ key, value });
}

async function deleteSetting(key: string): Promise<void> {
  const existing = await db.userSettings.where('key').equals(key).first();
  if (existing) await db.userSettings.delete(existing.id!);
}

/**
 * Read an API key ('claude_api_key' | 'openai_api_key').
 * Lazily migrates legacy plaintext values to encrypted storage.
 */
export async function getApiKey(name: string): Promise<string> {
  const enc = await readSetting(`${name}_enc`);
  if (enc) {
    try {
      return await decrypt(enc);
    } catch {
      // crypto key lost (e.g. partial DB wipe) — encrypted value is unrecoverable
      await deleteSetting(`${name}_enc`);
      return '';
    }
  }
  // Legacy plaintext → migrate
  const plain = await readSetting(name);
  if (plain) {
    await setApiKey(name, plain);
    return plain;
  }
  return '';
}

export async function setApiKey(name: string, value: string): Promise<void> {
  await deleteSetting(name); // never keep a plaintext copy
  if (!value) {
    await deleteSetting(`${name}_enc`);
    return;
  }
  await writeSetting(`${name}_enc`, await encrypt(value));
}
