import type {
  GoogleConsentDefaults,
  GoogleConsentModeConfig,
  GoogleConsentSignal,
  GoogleConsentValue,
} from './types.js';

/**
 * Known Google Consent Mode v2 signals. Anything outside this set is rejected
 * by `validateGcmConfig` so typos in a user config fail at build time rather
 * than silently being forwarded to `gtag`.
 */
export const GCM_SIGNALS = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
] as const satisfies readonly GoogleConsentSignal[];

const GCM_SIGNAL_SET = new Set<string>(GCM_SIGNALS);

/**
 * Validate a `GoogleConsentModeConfig` against the declared category keys.
 * Throws a descriptive `Error` if:
 *
 *  - `mapping` is missing or empty
 *  - A mapping key isn't a declared category (or `essential`)
 *  - A mapped signal isn't a known GCM v2 signal
 *  - A `defaults` / `regions` entry references an unknown signal or value
 *  - `waitForUpdate` is negative / non-finite
 */
export function validateGcmConfig(
  gcm: GoogleConsentModeConfig<string>,
  categoryKeys: string[],
): void {
  const prefix = '[@zdenekkurecka/astro-consent] googleConsentMode';

  if (!gcm.mapping || typeof gcm.mapping !== 'object') {
    throw new Error(`${prefix}.mapping is required when googleConsentMode is enabled.`);
  }

  const mappingEntries = Object.entries(gcm.mapping);
  if (mappingEntries.length === 0) {
    throw new Error(
      `${prefix}.mapping must not be empty — map at least one category to one or more GCM signals.`,
    );
  }

  const allowedCats = new Set([...categoryKeys, 'essential']);
  for (const [cat, signals] of mappingEntries) {
    if (!allowedCats.has(cat)) {
      throw new Error(
        `${prefix}.mapping["${cat}"] references an unknown category. ` +
          `Known categories: ${[...allowedCats].join(', ')}.`,
      );
    }
    if (!Array.isArray(signals) || signals.length === 0) {
      throw new Error(
        `${prefix}.mapping["${cat}"] must be a non-empty array of GCM signals.`,
      );
    }
    for (const s of signals) {
      if (!GCM_SIGNAL_SET.has(s)) {
        throw new Error(
          `${prefix}.mapping["${cat}"] contains unknown signal "${s}". ` +
            `Allowed signals: ${GCM_SIGNALS.join(', ')}.`,
        );
      }
    }
  }

  if (gcm.defaults) {
    assertDefaults(gcm.defaults, `${prefix}.defaults`);
  }

  if (gcm.regions) {
    for (const [region, value] of Object.entries(gcm.regions)) {
      if (!region) {
        throw new Error(`${prefix}.regions contains an empty key.`);
      }
      if (typeof value === 'string') {
        assertValue(value, `${prefix}.regions["${region}"]`);
      } else if (value && typeof value === 'object') {
        assertDefaults(value, `${prefix}.regions["${region}"]`);
      } else {
        throw new Error(
          `${prefix}.regions["${region}"] must be a string ("granted"/"denied") or an object.`,
        );
      }
    }
  }

  if (gcm.waitForUpdate !== undefined) {
    if (
      typeof gcm.waitForUpdate !== 'number' ||
      !Number.isFinite(gcm.waitForUpdate) ||
      gcm.waitForUpdate < 0
    ) {
      throw new Error(`${prefix}.waitForUpdate must be a non-negative number (ms).`);
    }
  }
}

function assertDefaults(obj: GoogleConsentDefaults, path: string): void {
  for (const [signal, value] of Object.entries(obj)) {
    if (!GCM_SIGNAL_SET.has(signal)) {
      throw new Error(
        `${path}["${signal}"] is not a known GCM signal. ` +
          `Allowed signals: ${GCM_SIGNALS.join(', ')}.`,
      );
    }
    if (value === undefined) continue;
    assertValue(value, `${path}["${signal}"]`);
  }
}

function assertValue(value: unknown, path: string): void {
  if (value !== 'granted' && value !== 'denied') {
    throw new Error(`${path} must be "granted" or "denied" (got ${JSON.stringify(value)}).`);
  }
}

/**
 * Build the inline snippet that pre-declares GCM defaults at the top of
 * `<head>`. The snippet:
 *
 *  1. Initializes `window.dataLayer` and a global `gtag(…)` helper.
 *  2. Calls `gtag('consent', 'default', { …denied…, wait_for_update })` with
 *     every mapped signal set to `"denied"` (or the user-provided default).
 *  3. Emits one additional `gtag('consent', 'default', { …, region: ['XX'] })`
 *     per `regions` entry so CCPA-style opt-out regions can start granted.
 *  4. Forwards `ads_data_redaction` / `url_passthrough` via `gtag('set', …)`.
 */
export function buildGcmDefaultSnippet(gcm: GoogleConsentModeConfig<string>): string {
  const mappedSignals = collectMappedSignals(gcm);
  const waitForUpdate = gcm.waitForUpdate ?? 500;

  const baseDefaults: Record<string, GoogleConsentValue> = {};
  for (const signal of mappedSignals) {
    baseDefaults[signal] = 'denied';
  }
  if (gcm.defaults) {
    for (const [signal, value] of Object.entries(gcm.defaults)) {
      if (value !== undefined) baseDefaults[signal] = value;
    }
  }

  const lines: string[] = [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    `gtag('consent','default',${JSON.stringify({ ...baseDefaults, wait_for_update: waitForUpdate })});`,
  ];

  if (gcm.regions) {
    for (const [region, value] of Object.entries(gcm.regions)) {
      const regionDefaults: Record<string, GoogleConsentValue> = {};
      if (typeof value === 'string') {
        for (const signal of mappedSignals) {
          regionDefaults[signal] = value;
        }
      } else {
        for (const [signal, v] of Object.entries(value)) {
          if (v !== undefined) regionDefaults[signal] = v;
        }
      }
      lines.push(
        `gtag('consent','default',${JSON.stringify({ ...regionDefaults, region: [region] })});`,
      );
    }
  }

  if (gcm.adsDataRedaction !== undefined) {
    lines.push(`gtag('set','ads_data_redaction',${gcm.adsDataRedaction ? 'true' : 'false'});`);
  }
  if (gcm.urlPassthrough !== undefined) {
    lines.push(`gtag('set','url_passthrough',${gcm.urlPassthrough ? 'true' : 'false'});`);
  }

  return lines.join('\n');
}

/**
 * Return every GCM signal mentioned in any mapping entry. Used by the default
 * snippet (to decide which signals to pre-declare) and by the runtime update
 * path (to decide which signals to recompute on each consent event).
 */
export function collectMappedSignals(
  gcm: GoogleConsentModeConfig<string>,
): GoogleConsentSignal[] {
  const out = new Set<GoogleConsentSignal>();
  for (const signals of Object.values(gcm.mapping)) {
    if (!signals) continue;
    for (const s of signals) out.add(s);
  }
  return [...out];
}

/**
 * Compute the `gtag('consent', 'update', …)` payload for a given set of
 * granted categories. AND semantics: a signal is granted only when every
 * category that maps to it is granted. Signals absent from `mapping` are
 * omitted — the caller must never overwrite them.
 */
export function buildGcmUpdatePayload(
  gcm: GoogleConsentModeConfig<string>,
  categories: Record<string, boolean>,
): Record<string, GoogleConsentValue> {
  const result: Record<string, GoogleConsentValue> = {};
  for (const signal of collectMappedSignals(gcm)) {
    result[signal] = 'granted';
  }
  for (const [cat, signals] of Object.entries(gcm.mapping)) {
    if (!signals) continue;
    if (!categories[cat]) {
      for (const s of signals) result[s] = 'denied';
    }
  }
  return result;
}
