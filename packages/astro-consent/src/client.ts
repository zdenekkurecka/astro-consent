import type { ConsentState, SerializableConsentConfig, ConsentAPI } from './types.js';
import { CONSENT_EVENT, CHANGE_EVENT } from './types.js';
import {
  readConsent,
  writeConsent,
  clearConsent,
  needsConsent,
  acceptAll,
  rejectAll,
  savePreferences,
} from './consent.js';
import {
  injectUI,
  showBanner,
  hideBanner,
  showModal,
  hideModal,
  isModalVisible,
  getModalSelections,
  updateModalToggles,
  handleModalTabTrap,
} from './ui.js';

let listenerAttached = false;
let consentFiredThisSession = false;

/**
 * Dispatches a consent event on `document`. Using events (instead of
 * functions serialized through the Astro config) avoids the closure problem:
 * subscribers in user-land `<script>` tags can import modules, call closures,
 * and reference outer scope — none of which works when a callback is
 * serialized with `Function.prototype.toString`.
 */
function emit(type: typeof CONSENT_EVENT | typeof CHANGE_EVENT, state: ConsentState): void {
  document.dispatchEvent(new CustomEvent(type, { detail: state }));
}

export function initConsentManager(config: SerializableConsentConfig): void {
  // Inject banner + modal DOM (idempotent).
  injectUI(config);

  // Check consent state.
  if (needsConsent(config.version)) {
    showBanner();
  } else if (!consentFiredThisSession) {
    // Fire the consent event once per session (not on every SPA navigation).
    consentFiredThisSession = true;
    const existing = readConsent();
    if (existing) {
      emit(CONSENT_EVENT, existing);
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
          const state = acceptAll(config);
          writeConsent(state);
          hideBanner();
          hideModal();
          consentFiredThisSession = true;
          emit(CONSENT_EVENT, state);
          break;
        }

        case 'reject-all':
        case 'modal-reject-all': {
          const state = rejectAll(config);
          writeConsent(state);
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
          const isUpdate = !needsConsent(config.version);
          const state = savePreferences(config, selections);
          writeConsent(state);
          hideModal();
          consentFiredThisSession = true;
          emit(isUpdate ? CHANGE_EVENT : CONSENT_EVENT, state);
          break;
        }

        case 'close-modal': {
          hideModal();
          // Re-show banner if consent hasn't been given yet.
          if (needsConsent(config.version)) {
            showBanner();
          }
          break;
        }
      }
    });

    // Close modal on overlay click.
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'cc-overlay') {
        hideModal();
        if (needsConsent(config.version)) {
          showBanner();
        }
      }
    });

    // Keyboard handling: Escape to close, Tab trapped inside modal.
    document.addEventListener('keydown', (e) => {
      if (!isModalVisible()) return;

      if (e.key === 'Escape') {
        hideModal();
        if (needsConsent(config.version)) {
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
      if (!current) return;
      const merged: Record<string, boolean> = { ...current.categories, essential: true };
      for (const [key, value] of Object.entries(categories)) {
        if (key !== 'essential' && value !== undefined) {
          merged[key] = value;
        }
      }
      const state: ConsentState = {
        version: current.version,
        timestamp: Date.now(),
        categories: merged,
      };
      writeConsent(state);
      emit(CHANGE_EVENT, state);
    },
    reset: () => {
      clearConsent();
      injectUI(config);
      showBanner();
    },
    show: () => {
      injectUI(config);
      showBanner();
    },
    showPreferences: () => {
      injectUI(config);
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

  window.zdenekkureckaConsent = api;
}
