import type { ConsentState, SerializableConsentConfig, ConsentAPI } from './types.js';
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
  getModalSelections,
  updateModalToggles,
} from './ui.js';

interface ConsentCallbacks {
  onConsent?: (state: ConsentState) => void;
  onChange?: (state: ConsentState) => void;
}

let listenerAttached = false;
let consentFiredThisSession = false;

function fireCallback(
  callbacks: ConsentCallbacks,
  type: 'onConsent' | 'onChange',
  state: ConsentState,
): void {
  const cb = callbacks[type];
  if (cb) {
    try {
      cb(state);
    } catch (e) {
      console.error(`[astro-consent] ${type} callback error:`, e);
    }
  }
}

export function initConsentManager(
  config: SerializableConsentConfig,
  callbacks: ConsentCallbacks,
): void {
  // Inject banner + modal DOM (idempotent)
  injectUI(config);

  // Check consent state
  if (needsConsent(config.version)) {
    showBanner();
  } else if (!consentFiredThisSession) {
    // Fire onConsent once per session (not on every SPA navigation)
    consentFiredThisSession = true;
    const existing = readConsent();
    if (existing) {
      fireCallback(callbacks, 'onConsent', existing);
    }
  }

  // Attach event delegation (once per page lifecycle)
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
          fireCallback(callbacks, 'onConsent', state);
          break;
        }

        case 'reject-all':
        case 'modal-reject-all': {
          const state = rejectAll(config);
          writeConsent(state);
          hideBanner();
          hideModal();
          consentFiredThisSession = true;
          fireCallback(callbacks, 'onConsent', state);
          break;
        }

        case 'manage': {
          hideBanner();
          // Sync toggles with current state or defaults
          const current = readConsent();
          if (current) {
            updateModalToggles(current.categories);
          } else {
            // After reset: show defaults from config
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
          fireCallback(callbacks, isUpdate ? 'onChange' : 'onConsent', state);
          break;
        }

        case 'close-modal': {
          hideModal();
          // Re-show banner if consent hasn't been given yet
          if (needsConsent(config.version)) {
            showBanner();
          }
          break;
        }
      }
    });

    // Close modal on overlay click
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'cc-overlay') {
        hideModal();
        if (needsConsent(config.version)) {
          showBanner();
        }
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('cc-modal');
        if (modal?.classList.contains('cc-visible')) {
          hideModal();
          if (needsConsent(config.version)) {
            showBanner();
          }
        }
      }
    });
  }

  // Expose runtime API
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
      fireCallback(callbacks, 'onChange', state);
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

  (window as unknown as Record<string, unknown>).zdenekkureckaConsent = api;
}
