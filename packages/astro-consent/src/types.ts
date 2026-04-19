export interface ConsentCategory {
  label: string;
  description: string;
  default: boolean;
}

/**
 * Google Consent Mode v2 signals.
 *
 * @see https://developers.google.com/tag-platform/security/concepts/consent-mode
 */
export type GoogleConsentSignal =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';

/** A Google Consent Mode v2 signal value. */
export type GoogleConsentValue = 'granted' | 'denied';

/**
 * Per-signal default overrides, used both for the global default snippet and
 * for regional overrides.
 */
export type GoogleConsentDefaults = Partial<
  Record<GoogleConsentSignal, GoogleConsentValue>
>;

/**
 * Regional default: either a single value applied to every mapped signal, or
 * a per-signal map.
 */
export type GoogleConsentRegionValue = GoogleConsentValue | GoogleConsentDefaults;

/**
 * Google Consent Mode v2 configuration.
 *
 * When set, the integration injects an inline snippet at the top of `<head>`
 * that bootstraps `window.dataLayer` + `gtag` and calls
 * `gtag('consent', 'default', {...})` before any downstream GTM / gtag.js
 * loads. Subsequent `astro-consent:consent` and `astro-consent:change` events
 * automatically fire `gtag('consent', 'update', {...})` with the signals
 * derived from `mapping`.
 *
 * The default snippet is inline and therefore requires `'unsafe-inline'` or a
 * matching hash under strict CSP. This is opt-in — if you don't configure
 * `googleConsentMode`, the integration stays strict-CSP-safe.
 */
export interface GoogleConsentModeConfig<K extends string = string> {
  /**
   * Set to `false` to temporarily disable the integration without deleting
   * config. Treated the same as omitting `googleConsentMode`.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * Map each consent category key to one or more Google Consent Mode v2
   * signals. A signal is granted only when **every** category that maps to it
   * is granted, and denied otherwise. Signals that aren't mentioned in any
   * mapping are never updated by the integration.
   *
   * @example
   *   mapping: {
   *     analytics: ['analytics_storage'],
   *     marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
   *   }
   */
  mapping: Partial<Record<K | 'essential', GoogleConsentSignal[]>>;

  /**
   * Millisecond hint passed to GTM via `wait_for_update` in the default
   * snippet. Tells GTM how long to delay firing tags while it waits for the
   * first `gtag('consent', 'update', …)` call.
   *
   * @default 500
   */
  waitForUpdate?: number;

  /**
   * Override the initial signal values. Signals not listed here default to
   * `"denied"` to stay compliant with GDPR/ePrivacy.
   */
  defaults?: GoogleConsentDefaults;

  /**
   * Regional overrides of `defaults`, keyed by ISO 3166-1 alpha-2 region
   * codes (e.g. `"US"`) or subdivisions (e.g. `"US-CA"`). Each entry can be
   * either a single value applied to every mapped signal, or a per-signal
   * object. Emitted as additional `gtag('consent', 'default', { ..., region:
   * ['XX'] })` calls after the global defaults.
   *
   * @example
   *   regions: { US: 'granted', BR: { ad_storage: 'denied' } }
   */
  regions?: Record<string, GoogleConsentRegionValue>;

  /** Forwarded as `gtag('set', 'ads_data_redaction', <bool>)`. */
  adsDataRedaction?: boolean;

  /** Forwarded as `gtag('set', 'url_passthrough', <bool>)`. */
  urlPassthrough?: boolean;
}

export interface CookiePolicyLink {
  url: string;
  label?: string;
}

/** Color mode for the consent UI. */
export type ConsentColorMode = 'auto' | 'light' | 'dark';

/** Visual/UI-level configuration for the consent banner and modal. */
export interface ConsentUIConfig {
  /**
   * Controls the color scheme of the consent UI.
   *
   * - `"auto"` (default): follows the user's `prefers-color-scheme`.
   * - `"light"` / `"dark"`: forces the palette via a `data-cc-theme`
   *   attribute on the document root. Use this to sync the consent
   *   UI with a site that has its own theme toggle.
   *
   * @default "auto"
   */
  colorMode?: ConsentColorMode;
}

/** Per-category label/description override used in `ConsentText.categories`. */
export interface ConsentCategoryText {
  label?: string;
  description?: string;
}

/**
 * UI text overrides for the consent banner and preferences modal.
 *
 * All fields are optional. Unspecified fields fall back to the built-in
 * English defaults, so you only need to provide the strings you want to
 * change.
 *
 * When the parent `ConsentConfig` is given a literal category-key union,
 * `categories` autocompletes and typo-checks against that union.
 */
export interface ConsentText<K extends string = string> {
  // Banner
  bannerText?: string;
  acceptAll?: string;
  rejectAll?: string;
  manage?: string;

  // Modal
  modalTitle?: string;
  closeAriaLabel?: string;
  savePreferences?: string;

  // Essential category
  essentialLabel?: string;
  essentialDescription?: string;
  /**
   * @deprecated Use `badgeRequired` instead. When both are provided,
   * `badgeRequired` wins. Kept as a fallback so existing configs keep working.
   */
  essentialBadge?: string;

  // Category badges
  /** Badge text on the required (essential) category. Default `"Required"`. */
  badgeRequired?: string;
  /** Badge text on optional categories. Default `"Optional"`. */
  badgeOptional?: string;

  /** Per-category label/description overrides, keyed by category key. */
  categories?: Partial<Record<K, ConsentCategoryText>>;
}

export interface ConsentConfig<K extends string = string> {
  version: number;
  categories: Record<K, ConsentCategory>;
  cookiePolicy?: CookiePolicyLink;

  /**
   * localStorage key used to persist the consent record. Override this when
   * multiple Astro apps share a single origin (e.g. `example.com/docs` and
   * `example.com/app`) to prevent them from clobbering each other's state.
   *
   * @default "astro-consent"
   */
  storageKey?: string;

  /**
   * Maximum age of a stored consent record, in days. When set, consent older
   * than this is treated as missing and the banner is re-shown. Useful for
   * aligning with GDPR/DPA guidance that recommends re-prompting every 6–12
   * months.
   *
   * @default undefined (no expiry)
   */
  maxAgeDays?: number;

  /**
   * Enables verbose `console.debug` logging of runtime events (init, banner
   * show, accept/reject/save, event dispatch, storage writes) and exposes
   * `window.astroConsent.debug()` for an on-demand state dump. Intended for
   * local development; gate behind `import.meta.env.DEV` so it never ships
   * to production.
   *
   * @default false
   */
  debug?: boolean;

  /** Visual/UI configuration (color mode, etc.). */
  ui?: ConsentUIConfig;

  /** Single-language text overrides, or shared fallback for `localeText`. */
  text?: ConsentText<K>;

  /**
   * Per-locale text overrides. Keys are BCP 47 language tags that match the
   * `<html lang>` attribute (e.g. `"en"`, `"cs"`, `"en-US"`).
   *
   * Resolution order at runtime: exact match → primary subtag → `text` →
   * built-in defaults.
   */
  localeText?: Record<string, ConsentText<K>>;

  /**
   * Google Consent Mode v2 integration. When configured, an inline snippet
   * is injected at the top of `<head>` to pre-declare denied defaults before
   * any GTM/gtag.js loads, and consent events automatically translate into
   * `gtag('consent', 'update', …)` calls.
   *
   * Opt-in — omit this to keep the integration strict-CSP safe.
   */
  googleConsentMode?: GoogleConsentModeConfig<K>;
}

export interface ConsentState<K extends string = string> {
  version: number;
  timestamp: number;
  categories: Record<K, boolean>;
}

export interface SerializableConsentConfig<K extends string = string> {
  version: number;
  categories: Record<K, ConsentCategory>;
  cookiePolicy?: CookiePolicyLink;
  storageKey?: string;
  maxAgeDays?: number;
  debug?: boolean;
  ui?: ConsentUIConfig;
  text?: ConsentText<K>;
  localeText?: Record<string, ConsentText<K>>;
  googleConsentMode?: GoogleConsentModeConfig<K>;
}

/**
 * Snapshot returned by `ConsentAPI.debug()` when `debug: true`. Captures the
 * fully-resolved runtime state so developers can inspect what the integration
 * sees without digging through localStorage or reading source.
 */
export interface ConsentDebugSnapshot {
  config: SerializableConsentConfig;
  resolvedLocale: string | null;
  resolvedText: Record<string, unknown>;
  storageKey: string;
  state: ConsentState | null;
  versionMatch: boolean;
  needsConsent: boolean;
}

export interface ConsentAPI<K extends string = string> {
  /** Returns the currently stored consent state, or `null` if none. */
  get(): ConsentState<K> | null;
  /**
   * Merge a partial category map into the current state and persist it.
   *
   * If no consent has been recorded yet, this seeds an initial consent
   * record from the config defaults, hides the banner, and dispatches
   * `astro-consent:consent`. Subsequent calls merge into the existing
   * state and dispatch `astro-consent:change` instead. The `essential`
   * category is always forced to `true`.
   */
  set(categories: Partial<Record<K, boolean>>): void;
  /** Clear the stored consent and re-show the banner. */
  reset(): void;
  /** Show the consent banner. */
  show(): void;
  /** Open the preferences modal. */
  showPreferences(): void;
  /**
   * Sync the consent UI color scheme with the host site. Sets a
   * `data-cc-theme` attribute on the document root so the CSS
   * variables resolve to the forced palette.
   *
   * Pass `"auto"` to clear the attribute and fall back to the
   * `prefers-color-scheme` defaults.
   */
  setTheme(mode: ConsentColorMode): void;
  /**
   * Dumps a `console.group` with the current config, resolved locale/text,
   * storage key, and stored state, and returns the same snapshot. Only
   * attached when the integration is configured with `debug: true`.
   */
  debug?(): ConsentDebugSnapshot;
}

/**
 * Name of the CustomEvent dispatched on `document` once per session after the
 * user has given consent (or after the integration detects an existing valid
 * consent record on page load).
 *
 * @example
 *   document.addEventListener('astro-consent:consent', (e) => {
 *     if (e.detail.categories.analytics) loadAnalytics();
 *   });
 */
export const CONSENT_EVENT = 'astro-consent:consent';

/**
 * Name of the CustomEvent dispatched on `document` whenever the user updates
 * their preferences after an initial consent has been given.
 */
export const CHANGE_EVENT = 'astro-consent:change';

export type ConsentEvent<K extends string = string> = CustomEvent<ConsentState<K>>;

/**
 * Marker interface for consumers to opt into typed category keys across
 * `window.astroConsent` and the `astro-consent:consent` / `astro-consent:change`
 * event listeners.
 *
 * Augment it in a project-level `.d.ts` file with the category keys you
 * declared in `cookieConsent({ categories: … })`:
 *
 * ```ts
 * // src/astro-consent.d.ts
 * declare module '@zdenekkurecka/astro-consent' {
 *   interface ConsentKeys {
 *     analytics: true;
 *     marketing: true;
 *   }
 * }
 * export {};
 * ```
 *
 * With the augmentation in place, `e.detail.categories.*` and
 * `window.astroConsent?.get()?.categories.*` narrow to the declared keys and
 * typos error at compile time. Without it, both fall back to
 * `Record<string, boolean>` — same as before.
 */
export interface ConsentKeys {}

/**
 * Resolves to the consumer-declared key union when `ConsentKeys` has been
 * augmented, otherwise falls back to `string` so the default behaviour is
 * non-breaking.
 */
export type ResolvedConsentKeys = [keyof ConsentKeys] extends [never]
  ? string
  : Extract<keyof ConsentKeys, string>;

declare global {
  interface DocumentEventMap {
    'astro-consent:consent': ConsentEvent<ResolvedConsentKeys>;
    'astro-consent:change': ConsentEvent<ResolvedConsentKeys>;
  }

  interface Window {
    astroConsent?: ConsentAPI<ResolvedConsentKeys>;
    /** @deprecated Use `astroConsent` instead. */
    zdenekkureckaConsent?: ConsentAPI<ResolvedConsentKeys>;
  }
}
