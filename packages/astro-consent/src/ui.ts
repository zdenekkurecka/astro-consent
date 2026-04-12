import type { SerializableConsentConfig } from './types.js';

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

function createBannerHTML(): string {
  return `
    <div class="cc-banner" id="${BANNER_ID}" role="region" aria-label="Cookie consent">
      <div class="cc-banner-inner">
        <p class="cc-banner-text">
          We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
          Please choose your cookie preferences.
        </p>
        <div class="cc-banner-actions">
          <button type="button" class="cc-btn cc-btn-primary" data-cc="accept-all">Accept all</button>
          <button type="button" class="cc-btn cc-btn-secondary" data-cc="reject-all">Reject all</button>
          <button type="button" class="cc-btn cc-btn-link" data-cc="manage">Manage preferences</button>
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

function createModalHTML(config: SerializableConsentConfig): string {
  const essentialToggle = createCategoryToggle(
    'essential',
    'Essential',
    'Required for the website to function. Cannot be disabled.',
    true,
    true,
  );

  const categoryToggles = Object.entries(config.categories)
    .map(([key, cat]) => createCategoryToggle(key, cat.label, cat.description, false, cat.default))
    .join('');

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
          <h2 class="cc-modal-title" id="${MODAL_TITLE_ID}">Cookie preferences</h2>
          <button type="button" class="cc-modal-close" data-cc="close-modal" aria-label="Close preferences">&times;</button>
        </div>
        <div class="cc-modal-body">
          ${essentialToggle}
          ${categoryToggles}
        </div>
        <div class="cc-modal-footer">
          <button type="button" class="cc-btn cc-btn-primary" data-cc="modal-accept-all">Accept all</button>
          <button type="button" class="cc-btn cc-btn-secondary" data-cc="modal-reject-all">Reject all</button>
          <button type="button" class="cc-btn cc-btn-primary" data-cc="save-preferences">Save preferences</button>
        </div>
      </div>
    </div>`;
}

export function injectUI(config: SerializableConsentConfig): void {
  if (document.getElementById(CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.innerHTML = createBannerHTML() + createModalHTML(config);
  document.body.appendChild(container);
}

export function showBanner(): void {
  document.getElementById(BANNER_ID)?.classList.add('cc-visible');
}

export function hideBanner(): void {
  document.getElementById(BANNER_ID)?.classList.remove('cc-visible');
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
