import type {
  ConsentCategory,
  ConsentCategoryText,
  ConsentText,
  SerializableConsentConfig,
} from './types.js';

/**
 * Fully-resolved UI text used internally after merging built-in defaults,
 * single-language `text` overrides, and the active locale entry.
 */
export type ResolvedConsentText = Required<Omit<ConsentText, 'categories'>> & {
  categories: Record<string, ConsentCategoryText>;
};

/** Built-in English defaults. Every non-category field is a complete string. */
const BUILT_IN_DEFAULTS: ResolvedConsentText = {
  bannerText:
    'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. Please choose your cookie preferences.',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  manage: 'Manage preferences',
  modalTitle: 'Cookie preferences',
  closeAriaLabel: 'Close preferences',
  savePreferences: 'Save preferences',
  essentialLabel: 'Essential',
  essentialDescription: 'Required for the website to function. Cannot be disabled.',
  categories: {},
};

/**
 * Merge a partial `ConsentText` layer onto an already-resolved base, returning
 * a new resolved text. Only keys explicitly present in `layer` override the
 * base; `undefined` values are ignored so partial layers compose correctly.
 * The nested `categories` map is merged per-key, with each per-category
 * override itself being a partial merge.
 */
function mergeText(base: ResolvedConsentText, layer: ConsentText | undefined): ResolvedConsentText {
  if (!layer) return base;
  const next: ResolvedConsentText = { ...base, categories: { ...base.categories } };

  if (layer.bannerText !== undefined) next.bannerText = layer.bannerText;
  if (layer.acceptAll !== undefined) next.acceptAll = layer.acceptAll;
  if (layer.rejectAll !== undefined) next.rejectAll = layer.rejectAll;
  if (layer.manage !== undefined) next.manage = layer.manage;
  if (layer.modalTitle !== undefined) next.modalTitle = layer.modalTitle;
  if (layer.closeAriaLabel !== undefined) next.closeAriaLabel = layer.closeAriaLabel;
  if (layer.savePreferences !== undefined) next.savePreferences = layer.savePreferences;
  if (layer.essentialLabel !== undefined) next.essentialLabel = layer.essentialLabel;
  if (layer.essentialDescription !== undefined) {
    next.essentialDescription = layer.essentialDescription;
  }

  if (layer.categories) {
    for (const [key, override] of Object.entries(layer.categories)) {
      if (!override) continue;
      const existing = next.categories[key];
      next.categories[key] = {
        label: override.label ?? existing?.label,
        description: override.description ?? existing?.description,
      };
    }
  }

  return next;
}

/**
 * Resolve which entry in `config.localeText` would apply for the current
 * `<html lang>`, returning the tag that matched (exact or primary subtag), or
 * `null` if there is no match / no localeText configured. Used by the debug
 * helper so developers can see why a particular string layer was picked.
 */
export function resolveLocale(config: SerializableConsentConfig): string | null {
  const localeText = config.localeText;
  if (!localeText) return null;
  const lang = (document.documentElement.lang || '').trim();
  if (!lang) return null;
  if (localeText[lang]) return lang;
  const primary = lang.split('-')[0];
  if (primary && primary !== lang && localeText[primary]) return primary;
  return null;
}

/**
 * Resolve the UI text layers for the current document.
 *
 * Reads `document.documentElement.lang`, picks the best match from
 * `config.localeText` (exact tag → primary subtag), and deep-merges the
 * layers: built-in defaults → `config.text` → resolved locale entry. Partial
 * overrides compose correctly — callers only need to supply the keys they
 * want to change.
 */
export function resolveText(config: SerializableConsentConfig): ResolvedConsentText {
  let resolved = mergeText(BUILT_IN_DEFAULTS, config.text);

  const localeText = config.localeText;
  if (localeText) {
    // `document.documentElement` exists whenever this runs (client-side only).
    const lang = (document.documentElement.lang || '').trim();
    if (lang) {
      const exact = localeText[lang];
      if (exact) {
        resolved = mergeText(resolved, exact);
      } else {
        const primary = lang.split('-')[0];
        if (primary && primary !== lang) {
          const sub = localeText[primary];
          if (sub) resolved = mergeText(resolved, sub);
        }
      }
    }
  }

  return resolved;
}

/**
 * Pick the label/description for a category, preferring any resolved text
 * override and falling back to the config-supplied category definition.
 */
function resolveCategoryText(
  key: string,
  fallback: Pick<ConsentCategory, 'label' | 'description'>,
  text: ResolvedConsentText,
): { label: string; description: string } {
  const override = text.categories[key];
  return {
    label: override?.label ?? fallback.label,
    description: override?.description ?? fallback.description,
  };
}

const CONTAINER_ID = 'cc-container';
const MODAL_ID = 'cc-modal';
const MODAL_TITLE_ID = 'cc-modal-title';
const OVERLAY_ID = 'cc-overlay';
const BANNER_ID = 'cc-banner';

let previouslyFocused: HTMLElement | null = null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only allow http(s) absolute URLs or same-origin paths — blocks
 * `javascript:` and other dangerous schemes that could execute on click.
 */
function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return trimmed;
  return null;
}

function createPolicyLinkHTML(
  cookiePolicy: SerializableConsentConfig['cookiePolicy'],
  className: string,
): string {
  if (!cookiePolicy) return '';
  const safeUrl = sanitizeUrl(cookiePolicy.url);
  if (!safeUrl) return '';
  const label = cookiePolicy.label ?? 'Cookie Policy';
  return `<a class="${className}" href="${escapeHtml(safeUrl)}" data-cc="policy-link">${escapeHtml(label)}</a>`;
}

function createBannerHTML(config: SerializableConsentConfig, text: ResolvedConsentText): string {
  const policyLink = createPolicyLinkHTML(config.cookiePolicy, 'cc-policy-link');
  return `
    <div class="cc-banner" id="${BANNER_ID}" role="region" aria-label="Cookie consent" aria-hidden="true">
      <div class="cc-banner-inner">
        <p class="cc-banner-text">
          ${escapeHtml(text.bannerText)}
          ${policyLink}
        </p>
        <div class="cc-banner-actions">
          <button type="button" class="cc-btn cc-btn-primary" data-cc="accept-all">${escapeHtml(text.acceptAll)}</button>
          <button type="button" class="cc-btn cc-btn-secondary" data-cc="reject-all">${escapeHtml(text.rejectAll)}</button>
          <button type="button" class="cc-btn cc-btn-link" data-cc="manage">${escapeHtml(text.manage)}</button>
        </div>
      </div>
    </div>`;
}

function createCategoryToggle(
  key: string,
  label: string,
  description: string,
  isEssential: boolean,
  defaultValue: boolean,
): string {
  const checked = isEssential || defaultValue ? 'checked' : '';
  const disabled = isEssential ? 'disabled' : '';
  const id = `cc-toggle-${escapeHtml(key)}`;
  const descId = `${id}-desc`;

  return `
    <div class="cc-category">
      <div class="cc-category-header">
        <label class="cc-category-label" for="${id}">${escapeHtml(label)}</label>
        <label class="cc-toggle">
          <input type="checkbox" id="${id}" data-cc-category="${escapeHtml(key)}" aria-describedby="${descId}" ${checked} ${disabled} />
          <span class="cc-toggle-slider" aria-hidden="true"></span>
        </label>
      </div>
      <p class="cc-category-description" id="${descId}">${escapeHtml(description)}</p>
    </div>`;
}

function createModalHTML(config: SerializableConsentConfig, text: ResolvedConsentText): string {
  const essentialToggle = createCategoryToggle(
    'essential',
    text.essentialLabel,
    text.essentialDescription,
    true,
    true,
  );

  const categoryToggles = Object.entries(config.categories)
    .map(([key, cat]) => {
      const resolved = resolveCategoryText(key, cat, text);
      return createCategoryToggle(key, resolved.label, resolved.description, false, cat.default);
    })
    .join('');

  const policyLink = createPolicyLinkHTML(config.cookiePolicy, 'cc-policy-link cc-modal-policy-link');

  return `
    <div class="cc-overlay" id="${OVERLAY_ID}" aria-hidden="true"></div>
    <div
      class="cc-modal"
      id="${MODAL_ID}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${MODAL_TITLE_ID}"
      aria-hidden="true"
      tabindex="-1"
    >
      <div class="cc-modal-inner">
        <div class="cc-modal-header">
          <h2 class="cc-modal-title" id="${MODAL_TITLE_ID}">${escapeHtml(text.modalTitle)}</h2>
          <button type="button" class="cc-modal-close" data-cc="close-modal" aria-label="${escapeHtml(text.closeAriaLabel)}"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg></button>
        </div>
        <div class="cc-modal-body">
          ${essentialToggle}
          ${categoryToggles}
          ${policyLink}
        </div>
        <div class="cc-modal-footer">
          <button type="button" class="cc-btn cc-btn-primary" data-cc="modal-accept-all">${escapeHtml(text.acceptAll)}</button>
          <button type="button" class="cc-btn cc-btn-secondary" data-cc="modal-reject-all">${escapeHtml(text.rejectAll)}</button>
          <button type="button" class="cc-btn cc-btn-primary" data-cc="save-preferences">${escapeHtml(text.savePreferences)}</button>
        </div>
      </div>
    </div>`;
}

export function injectUI(config: SerializableConsentConfig, text: ResolvedConsentText): void {
  if (document.getElementById(CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.innerHTML = createBannerHTML(config, text) + createModalHTML(config, text);
  document.body.appendChild(container);

  // Apply forced color mode (if any). "auto" / undefined leaves the
  // attribute unset so the CSS falls back to prefers-color-scheme.
  const mode = config.ui?.colorMode;
  if (mode === 'light' || mode === 'dark') {
    setContainerTheme(mode);
  }
}

/**
 * Set or clear `data-cc-theme` on the document root. Passing `"auto"`
 * removes the attribute so the UI follows `prefers-color-scheme`.
 *
 * The attribute lives on `:root` (not the consent container) so that
 * user `--cc-*` overrides on `:root` compete by source order rather
 * than losing to nearest-ancestor inheritance.
 */
export function setContainerTheme(mode: 'auto' | 'light' | 'dark'): void {
  const root = document.documentElement;
  if (!root) return;
  if (mode === 'auto') {
    root.removeAttribute('data-cc-theme');
  } else {
    root.setAttribute('data-cc-theme', mode);
  }
}

export function showBanner(): void {
  const el = document.getElementById(BANNER_ID);
  el?.classList.add('cc-visible');
  el?.setAttribute('aria-hidden', 'false');
}

export function hideBanner(): void {
  const el = document.getElementById(BANNER_ID);
  el?.classList.remove('cc-visible');
  el?.setAttribute('aria-hidden', 'true');
}

/**
 * Returns focusable descendants of `container` in tab order, skipping elements
 * that are disabled, hidden (`display: none` / `visibility: hidden`) or
 * explicitly removed from the tab order with `tabindex="-1"`.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return nodes.filter((el) => {
    if (el.hasAttribute('inert')) return false;
    // offsetParent is null for display:none; doesn't cover visibility:hidden,
    // but our modal doesn't use that so this is sufficient.
    if (el.offsetParent === null && el.tagName !== 'BODY') return false;
    return true;
  });
}

/**
 * Traps Tab/Shift+Tab inside the modal when it's visible. No-op otherwise, so
 * it's safe to attach once for the lifetime of the page.
 */
export function handleModalTabTrap(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  const modal = document.getElementById(MODAL_ID);
  if (!modal || !modal.classList.contains('cc-visible')) return;

  const focusable = getFocusableElements(modal);
  if (focusable.length === 0) {
    // Nothing focusable inside — keep focus on the modal container itself.
    e.preventDefault();
    modal.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  // If focus has escaped the modal entirely, pull it back.
  if (!active || !modal.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return;
  }

  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

export function showModal(): void {
  const modal = document.getElementById(MODAL_ID);
  const overlay = document.getElementById(OVERLAY_ID);
  if (!modal) return;

  // Remember who had focus so we can restore it on close.
  const active = document.activeElement;
  previouslyFocused = active instanceof HTMLElement ? active : null;

  modal.classList.add('cc-visible');
  modal.setAttribute('aria-hidden', 'false');
  if (overlay) {
    overlay.classList.add('cc-visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  // Move focus into the modal on the next frame so CSS transitions don't
  // steal the initial focus.
  requestAnimationFrame(() => {
    const focusable = getFocusableElements(modal);
    // Prefer the first interactive control (close button is first in DOM);
    // fall back to the modal container, which is tabindex="-1".
    (focusable[0] ?? modal).focus();
  });
}

export function hideModal(): void {
  const modal = document.getElementById(MODAL_ID);
  const overlay = document.getElementById(OVERLAY_ID);
  if (modal) {
    modal.classList.remove('cc-visible');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (overlay) {
    overlay.classList.remove('cc-visible');
    overlay.setAttribute('aria-hidden', 'true');
  }

  // Restore focus to the element that triggered the modal, if it's still
  // connected to the DOM and focusable.
  const toFocus = previouslyFocused;
  previouslyFocused = null;
  if (toFocus && toFocus.isConnected) {
    try {
      toFocus.focus();
    } catch {
      /* ignore — e.g. element became non-focusable */
    }
  }
}

export function isModalVisible(): boolean {
  return document.getElementById(MODAL_ID)?.classList.contains('cc-visible') ?? false;
}

export function updateModalToggles(categories: Record<string, boolean>): void {
  const inputs = document.querySelectorAll<HTMLInputElement>('[data-cc-category]');
  for (const input of inputs) {
    const key = input.getAttribute('data-cc-category');
    if (key && !input.disabled) {
      input.checked = categories[key] ?? false;
    }
  }
}

export function getModalSelections(): Record<string, boolean> {
  const selections: Record<string, boolean> = {};
  const inputs = document.querySelectorAll<HTMLInputElement>('[data-cc-category]');
  for (const input of inputs) {
    const key = input.getAttribute('data-cc-category');
    if (key && key !== 'essential') {
      selections[key] = input.checked;
    }
  }
  return selections;
}
