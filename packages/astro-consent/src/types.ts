export interface ConsentCategory {
  label: string;
  description: string;
  default: boolean;
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
  essentialBadge?: string;

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

export interface ConsentAPI {
  /** Returns the currently stored consent state, or `null` if none. */
  get(): ConsentState | null;
  /**
   * Merge a partial category map into the current state and persist it.
   *
   * If no consent has been recorded yet, this seeds an initial consent
   * record from the config defaults, hides the banner, and dispatches
   * `astro-consent:consent`. Subsequent calls merge into the existing
   * state and dispatch `astro-consent:change` instead. The `essential`
   * category is always forced to `true`.
   */
  set(categories: Partial<Record<string, boolean>>): void;
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

declare global {
  interface DocumentEventMap {
    'astro-consent:consent': ConsentEvent;
    'astro-consent:change': ConsentEvent;
  }

  interface Window {
    astroConsent?: ConsentAPI;
    /** @deprecated Use `astroConsent` instead. */
    zdenekkureckaConsent?: ConsentAPI;
  }
}
