import type {
  ConsentState,
  SerializableConsentConfig,
  ConsentAPI,
  ConsentDebugSnapshot,
} from './types.js';
import { CONSENT_EVENT, CHANGE_EVENT } from './types.js';
import {
  readConsent,
  writeConsent,
  clearConsent,
  needsConsent,
  acceptAll,
  rejectAll,
  savePreferences,
  setStorageKey,
  getStorageKey,
} from './consent.js';
import {
  injectUI,
  resolveText,
  resolveLocale,
  setContainerTheme,
  showBanner,
  hideBanner,
  showModal,
  hideModal,
  isModalVisible,
  getModalSelections,
  updateModalToggles,
  handleModalTabTrap,
} from './ui.js';
import { activateBlockedResources, initScriptBlocker } from './scripts.js';
import { buildGcmUpdatePayload } from './gcm.js';

const LOG_PREFIX = '[astro-consent]';

let debugEnabled = false;

function log(...args: unknown[]): void {
  if (!debugEnabled) return;
  // console.debug is filterable separately from .log in DevTools and is
  // stripped by default in Chrome's standard log level.
  console.debug(LOG_PREFIX, ...args);
}

let listenerAttached = false;
let scriptBlockerAttached = false;
let gcmListenerAttached = false;
let consentFiredThisSession = false;

/**
 * Dispatches a consent event on `document`. Using events (instead of
 * functions serialized through the Astro config) avoids the closure problem:
 * subscribers in user-land `<script>` tags can import modules, call closures,
 * and reference outer scope — none of which works when a callback is
 * serialized with `Function.prototype.toString`.
 */
function emit(
  type: typeof CONSENT_EVENT | typeof CHANGE_EVENT,
  state: ConsentState,
): void {
  log(`emit ${type}`, state);
  document.dispatchEvent(new CustomEvent(type, { detail: state }));
}

function persist(state: ConsentState): void {
  log(`localStorage write (${getStorageKey()})`, state);
  writeConsent(state);
}

export function initConsentManager(config: SerializableConsentConfig): void {
  debugEnabled = config.debug === true;

  // Apply the configured localStorage key before any read/write so multiple
  // Astro apps on the same origin don't clobber each other's consent state.
  setStorageKey(config.storageKey);

  // Declarative script blocking. Attach listeners + start the MutationObserver
  // once per page lifecycle, BEFORE the initial CONSENT_EVENT emit below —
  // otherwise pages with pre-existing consent would miss the first activation.
  if (!scriptBlockerAttached) {
    scriptBlockerAttached = true;
    initScriptBlocker();
    const onConsent = (e: CustomEvent<ConsentState>): void => {
      activateBlockedResources(e.detail.categories);
    };
    document.addEventListener(CONSENT_EVENT, onConsent);
    document.addEventListener(CHANGE_EVENT, onConsent);
  }

  // Google Consent Mode v2: translate every consent event into
  // `gtag('consent', 'update', …)`. Must be attached before the initial
  // emit below so pages with pre-existing consent fire an update on load.
  const gcmConfig = config.googleConsentMode;
  if (gcmConfig && gcmConfig.enabled !== false && !gcmListenerAttached) {
    gcmListenerAttached = true;
    const onGcm = (e: CustomEvent<ConsentState>): void => {
      const payload = buildGcmUpdatePayload(gcmConfig, e.detail.categories);
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag === 'function') {
        gtag('consent', 'update', payload);
        log('gcm update', payload);
      } else {
        // The head-inline snippet installs `gtag` globally. If it's missing,
        // the snippet was stripped (CSP? custom head template?) — fall back to
        // a raw dataLayer push so the update still lands once GTM loads.
        const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
        if (Array.isArray(dl)) {
          dl.push(['consent', 'update', payload]);
          log('gcm update (dataLayer fallback)', payload);
        }
      }
    };
    document.addEventListener(CONSENT_EVENT, onGcm);
    document.addEventListener(CHANGE_EVENT, onGcm);
  }

  // Resolve UI text once per init: reads <html lang>, merges built-in
  // defaults → config.text → localeText[lang]. Passed to every injectUI call
  // below so reset/show/showPreferences use the same resolved strings.
  const text = resolveText(config);

  // Inject banner + modal DOM (idempotent).
  injectUI(config, text);

  const initialState = readConsent();
  const initialNeeds = needsConsent(config.version, config.maxAgeDays);
  log(
    `init — version: ${config.version}, locale: ${JSON.stringify(resolveLocale(config))}, consent: ${initialState ? 'stored' : 'null'}${initialNeeds ? ' (needs consent)' : ''}`,
    { state: initialState },
  );

  // Check consent state.
  if (initialNeeds) {
    log('banner shown');
    showBanner();
  } else if (!consentFiredThisSession) {
    // Fire the consent event once per session (not on every SPA navigation).
    consentFiredThisSession = true;
    if (initialState) {
      emit(CONSENT_EVENT, initialState);
    }
  }

  // Attach event delegation (once per page lifecycle).
  if (!listenerAttached) {
    listenerAttached = true;

    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cc]');
      if (!target) return;

      const action = target.getAttribute('data-cc');

      switch (action) {
        case 'accept-all':
        case 'modal-accept-all': {
          log(`${action} →`, 'all categories: true');
          const state = acceptAll(config);
          persist(state);
          hideBanner();
          hideModal();
          consentFiredThisSession = true;
          emit(CONSENT_EVENT, state);
          break;
        }

        case 'reject-all':
        case 'modal-reject-all': {
          log(`${action} →`, 'non-essential categories: false');
          const state = rejectAll(config);
          persist(state);
          hideBanner();
          hideModal();
          consentFiredThisSession = true;
          emit(CONSENT_EVENT, state);
          break;
        }

        case 'manage': {
          hideBanner();
          // Sync toggles with current state or defaults.
          const current = readConsent();
          if (current) {
            updateModalToggles(current.categories);
          } else {
            // After reset: show defaults from config.
            const defaults: Record<string, boolean> = {};
            for (const [key, cat] of Object.entries(config.categories)) {
              defaults[key] = cat.default;
            }
            updateModalToggles(defaults);
          }
          showModal();
          break;
        }

        case 'save-preferences': {
          const selections = getModalSelections();
          const isUpdate = !needsConsent(config.version, config.maxAgeDays);
          log(`save-preferences →`, selections, isUpdate ? '(update)' : '(initial)');
          const state = savePreferences(config, selections);
          persist(state);
          hideModal();
          consentFiredThisSession = true;
          emit(isUpdate ? CHANGE_EVENT : CONSENT_EVENT, state);
          break;
        }

        case 'close-modal': {
          hideModal();
          // Re-show banner if consent hasn't been given yet.
          if (needsConsent(config.version, config.maxAgeDays)) {
            showBanner();
          }
          break;
        }

        case 'policy-link': {
          // The policy link is tagged with data-cc so it's discoverable as a
          // consent-related element, but navigation is handled by the
          // browser — nothing to do here. Explicitly listed so a future
          // default case (e.g. logging unknown actions with preventDefault)
          // doesn't accidentally break the link.
          break;
        }
      }
    });

    // Close modal on backdrop click. The `.cc-modal` wrapper spans the full
    // viewport and sits above `.cc-overlay`, so a click on the dimmed area
    // lands on `#cc-modal` itself rather than `#cc-overlay`. Clicks inside
    // `.cc-modal-inner` bubble up with a different target and are ignored.
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'cc-modal') {
        hideModal();
        if (needsConsent(config.version, config.maxAgeDays)) {
          showBanner();
        }
      }
    });

    // Keyboard handling: Escape to close, Tab trapped inside modal.
    document.addEventListener('keydown', (e) => {
      if (!isModalVisible()) return;

      if (e.key === 'Escape') {
        hideModal();
        if (needsConsent(config.version, config.maxAgeDays)) {
          showBanner();
        }
        return;
      }

      handleModalTabTrap(e);
    });
  }

  // Expose runtime API.
  const api: ConsentAPI = {
    get: () => readConsent(),
    set: (categories) => {
      const current = readConsent();
      // If no consent has been recorded yet, seed it with the config defaults
      // so callers can set categories programmatically before the banner has
      // been interacted with.
      const baseCategories: Record<string, boolean> = { essential: true };
      if (current) {
        Object.assign(baseCategories, current.categories, { essential: true });
      } else {
        for (const [key, cat] of Object.entries(config.categories)) {
          baseCategories[key] = cat.default;
        }
      }
      for (const [key, value] of Object.entries(categories)) {
        if (key !== 'essential' && value !== undefined) {
          baseCategories[key] = value;
        }
      }
      const state: ConsentState = {
        version: current ? current.version : config.version,
        timestamp: Date.now(),
        categories: baseCategories,
      };
      log('api.set →', categories);
      persist(state);
      // If this is the first consent record, the banner should disappear and
      // a CONSENT_EVENT should fire (not CHANGE_EVENT).
      if (!current) {
        hideBanner();
        consentFiredThisSession = true;
        emit(CONSENT_EVENT, state);
      } else {
        emit(CHANGE_EVENT, state);
      }
    },
    reset: () => {
      log('api.reset — clearing stored consent');
      clearConsent();
      injectUI(config, text);
      showBanner();
    },
    show: () => {
      injectUI(config, text);
      showBanner();
    },
    setTheme: (mode) => {
      // Make sure the container exists so the attribute has somewhere to
      // live on first call (e.g. before the banner has ever been shown).
      injectUI(config, text);
      log(`api.setTheme →`, mode);
      setContainerTheme(mode);
    },
    showPreferences: () => {
      injectUI(config, text);
      hideBanner();
      const current = readConsent();
      if (current) {
        updateModalToggles(current.categories);
      } else {
        const defaults: Record<string, boolean> = {};
        for (const [key, cat] of Object.entries(config.categories)) {
          defaults[key] = cat.default;
        }
        updateModalToggles(defaults);
      }
      showModal();
    },
  };

  if (config.debug) {
    api.debug = (): ConsentDebugSnapshot => {
      const state = readConsent();
      const snapshot: ConsentDebugSnapshot = {
        config,
        resolvedLocale: resolveLocale(config),
        resolvedText: text as unknown as Record<string, unknown>,
        storageKey: getStorageKey(),
        state,
        versionMatch: state ? state.version === config.version : false,
        needsConsent: needsConsent(config.version, config.maxAgeDays),
      };
      // eslint-disable-next-line no-console
      console.group(`${LOG_PREFIX} debug snapshot`);
      console.log('config', snapshot.config);
      console.log('resolvedLocale', snapshot.resolvedLocale);
      console.log('resolvedText', snapshot.resolvedText);
      console.log('storageKey', snapshot.storageKey);
      console.log('state', snapshot.state);
      console.log('versionMatch', snapshot.versionMatch);
      console.log('needsConsent', snapshot.needsConsent);
      console.groupEnd();
      return snapshot;
    };
  }

  window.astroConsent = api;
  window.zdenekkureckaConsent = api;
}
