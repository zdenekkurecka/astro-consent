export interface ConsentCategory {
  label: string;
  description: string;
  default: boolean;
}

export interface CookiePolicyLink {
  url: string;
  label?: string;
}

export interface ConsentConfig {
  version: number;
  categories: Record<string, ConsentCategory>;
  cookiePolicy?: CookiePolicyLink;
}

export interface ConsentState {
  version: number;
  timestamp: number;
  categories: Record<string, boolean>;
}

export interface SerializableConsentConfig {
  version: number;
  categories: Record<string, ConsentCategory>;
  cookiePolicy?: CookiePolicyLink;
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

export type ConsentEvent = CustomEvent<ConsentState>;

declare global {
  interface DocumentEventMap {
    'astro-consent:consent': ConsentEvent;
    'astro-consent:change': ConsentEvent;
  }

  interface Window {
    zdenekkureckaConsent?: ConsentAPI;
  }
}
