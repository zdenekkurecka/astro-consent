import type { ConsentState, SerializableConsentConfig } from './types.js';

const DEFAULT_STORAGE_KEY = 'astro-consent';
let STORAGE_KEY: string = DEFAULT_STORAGE_KEY;

export function setStorageKey(key: string | undefined): void {
  STORAGE_KEY = key || DEFAULT_STORAGE_KEY;
}

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function writeConsent(state: ConsentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function needsConsent(configVersion: number, maxAgeDays?: number): boolean {
  const state = readConsent();
  if (!state || state.version < configVersion) return true;
  if (maxAgeDays !== undefined) {
    const ageMs = Date.now() - state.timestamp;
    if (ageMs > maxAgeDays * 86_400_000) return true;
  }
  return false;
}

export function acceptAll(config: SerializableConsentConfig): ConsentState {
  const categories: Record<string, boolean> = { essential: true };
  for (const key of Object.keys(config.categories)) {
    categories[key] = true;
  }
  return {
    version: config.version,
    timestamp: Date.now(),
    categories,
  };
}

export function rejectAll(config: SerializableConsentConfig): ConsentState {
  const categories: Record<string, boolean> = { essential: true };
  for (const key of Object.keys(config.categories)) {
    categories[key] = false;
  }
  return {
    version: config.version,
    timestamp: Date.now(),
    categories,
  };
}

export function savePreferences(
  config: SerializableConsentConfig,
  selections: Record<string, boolean>,
): ConsentState {
  const categories: Record<string, boolean> = { essential: true };
  for (const key of Object.keys(config.categories)) {
    categories[key] = selections[key] ?? config.categories[key].default;
  }
  return {
    version: config.version,
    timestamp: Date.now(),
    categories,
  };
}
