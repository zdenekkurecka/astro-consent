export interface ConsentCategory {
  label: string;
  description: string;
  default: boolean;
}

export interface ConsentConfig {
  version: number;
  categories: Record<string, ConsentCategory>;
}

export interface ConsentState {
  version: number;
  timestamp: number;
  categories: Record<string, boolean>;
}

export interface SerializableConsentConfig {
  version: number;
  categories: Record<string, ConsentCategory>;
}

export interface ConsentAPI {
  get(): ConsentState | null;
  set(categories: Partial<Record<string, boolean>>): void;
  reset(): void;
  show(): void;
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
