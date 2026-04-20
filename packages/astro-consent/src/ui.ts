import type {
  BannerLayout,
  BannerPosition,
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
  hidePreferences: 'Hide preferences',
  dismissAriaLabel: 'Dismiss',
  essentialLabel: 'Essential',
  essentialDescription: 'Required for the website to function. Cannot be disabled.',
  essentialBadge: 'Required',
  badgeRequired: 'Required',
  badgeOptional: 'Optional',
  toastAccepted: 'All cookies accepted',
  toastRejected: 'Only essential cookies',
  toastSaved: 'Preferences saved',
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
  if (layer.hidePreferences !== undefined) next.hidePreferences = layer.hidePreferences;
  if (layer.dismissAriaLabel !== undefined) next.dismissAriaLabel = layer.dismissAriaLabel;
  if (layer.essentialLabel !== undefined) next.essentialLabel = layer.essentialLabel;
  if (layer.essentialDescription !== undefined) {
    next.essentialDescription = layer.essentialDescription;
  }
  if (layer.essentialBadge !== undefined) {
    next.essentialBadge = layer.essentialBadge;
    // Back-compat: if the consumer set the old `essentialBadge` but not the
    // new `badgeRequired`, promote it so the rendered badge reflects their
    // intent without requiring a config migration.
    if (layer.badgeRequired === undefined) next.badgeRequired = layer.essentialBadge;
  }
  if (layer.badgeRequired !== undefined) next.badgeRequired = layer.badgeRequired;
  if (layer.badgeOptional !== undefined) next.badgeOptional = layer.badgeOptional;
  if (layer.toastAccepted !== undefined) next.toastAccepted = layer.toastAccepted;
  if (layer.toastRejected !== undefined) next.toastRejected = layer.toastRejected;
  if (layer.toastSaved !== undefined) next.toastSaved = layer.toastSaved;

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
const BANNER_SCRIM_ID = 'cc-banner-scrim';
const TOAST_TESTID = 'cc-toast';

/** What the user just did — drives the toast headline. */
export type DismissKind = 'accepted' | 'rejected' | 'saved';

/**
 * Delay from `cc-confirming` to `cc-confirmed` — matches the prototype's
 * 220ms lead-in so the scrim has time to start fading before the card
 * collapses. See `docs/design/consent-v0.4-prototype.html:904`.
 */
const CONFIRM_LEAD_IN_MS = 220;

/**
 * Fallback cap covering the longest collapse keyframe (500ms) + a small
 * buffer. Only consulted if `animationend` never fires (e.g. the surface is
 * removed mid-animation, or keyframes were overridden away). Keeps the
 * `isDismissing` guard from latching on.
 */
const DISMISS_FALLBACK_MS = 900;

const VALID_LAYOUTS: readonly BannerLayout[] = ['bar', 'box', 'cloud', 'popup'];
const VALID_POSITIONS_PER_LAYOUT: Record<BannerLayout, readonly BannerPosition[]> = {
  bar: ['bottom', 'top'],
  box: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
  cloud: ['bottom', 'top'],
  popup: ['center'],
};
const DEFAULT_POSITION_FOR: Record<BannerLayout, BannerPosition> = {
  bar: 'bottom',
  box: 'bottom-right',
  cloud: 'bottom',
  popup: 'center',
};

/**
 * Resolved banner placement after applying defaults, validating the layout /
 * position pairing, and normalizing the `scrim` flag (forced on for `popup`,
 * off for `bar` / `box`, passthrough for `cloud`).
 */
export interface ResolvedBannerOptions {
  layout: BannerLayout;
  position: BannerPosition;
  scrim: boolean;
  /** Render category toggles inline on the banner (single-layer flow). */
  categoriesOnBanner: boolean;
}

/**
 * Resolve banner layout / position / scrim from the merged config. Also
 * honors `<html data-cc-test-layout>` and `<html data-cc-test-position>` so
 * the playground harness (see `playground/e2e/helpers.ts`) can exercise
 * variants via URL params without a rebuild.
 *
 * Invalid layout/position pairings fall back to the layout's default and
 * emit a single `console.warn` so misconfiguration is loud in dev. Unknown
 * layouts fall back to `bar`.
 */
export function resolveBannerOptions(
  config: SerializableConsentConfig,
): ResolvedBannerOptions {
  const banner = config.ui?.banner ?? {};
  const html = typeof document !== 'undefined' ? document.documentElement : null;
  const harnessLayout = html?.getAttribute('data-cc-test-layout') as BannerLayout | null;
  const harnessPosition = html?.getAttribute('data-cc-test-position') as BannerPosition | null;

  let layout = (harnessLayout ?? banner.layout ?? 'bar') as BannerLayout;
  if (!VALID_LAYOUTS.includes(layout)) {
    console.warn(
      `[astro-consent] Unknown banner layout "${layout}". Falling back to "bar".`,
    );
    layout = 'bar';
  }

  const requestedPosition = (harnessPosition ?? banner.position) as BannerPosition | undefined;
  let position = requestedPosition ?? DEFAULT_POSITION_FOR[layout];
  if (requestedPosition && !VALID_POSITIONS_PER_LAYOUT[layout].includes(requestedPosition)) {
    console.warn(
      `[astro-consent] Position "${requestedPosition}" is invalid for layout "${layout}". ` +
        `Falling back to "${DEFAULT_POSITION_FOR[layout]}".`,
    );
    position = DEFAULT_POSITION_FOR[layout];
  }

  // Scrim: forced true for popup (the scrim is the layout's premise),
  // forced false for bar/box, passthrough for cloud.
  let scrim = banner.scrim ?? false;
  if (layout === 'popup') scrim = true;
  else if (layout === 'bar' || layout === 'box') scrim = false;

  const harnessCategoriesOnBanner = html?.getAttribute('data-cc-test-categories-on-banner');
  const categoriesOnBanner =
    harnessCategoriesOnBanner != null
      ? harnessCategoriesOnBanner === 'true'
      : banner.categoriesOnBanner === true;

  return { layout, position, scrim, categoriesOnBanner };
}

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

function createBannerHTML(
  config: SerializableConsentConfig,
  text: ResolvedConsentText,
  banner: ResolvedBannerOptions,
): string {
  const policyLink = createPolicyLinkHTML(config.cookiePolicy, 'cc-policy-link');
  // Popup gets role="dialog" + aria-modal so it's announced as modal UI; the
  // other variants stay as a polite region.
  const roleAttrs =
    banner.layout === 'popup'
      ? `role="dialog" aria-modal="true" aria-label="Cookie consent"`
      : `role="region" aria-label="Cookie consent"`;
  // Scrim element shares the banner's visibility class; positioned behind the
  // banner via z-index. Rendered only when scrim is active so the DOM stays
  // minimal for the default bar variant.
  const scrimHTML = banner.scrim
    ? `<div class="cc-banner-scrim" id="${BANNER_SCRIM_ID}" data-testid="cc-banner-scrim" aria-hidden="true"></div>`
    : '';

  // Single-layer mode swaps the action row for a label-morphing trio
  // (Customize ↔ Hide preferences, Accept all ↔ Save preferences) and
  // renders the inline categories + dismiss button below.
  const singleLayer = banner.categoriesOnBanner;
  const categoriesHTML = singleLayer ? createBannerCategoriesHTML(config, text) : '';
  const closeBtnHTML = singleLayer
    ? `<button type="button" class="cc-banner-close" data-cc="dismiss" aria-label="${escapeHtml(text.dismissAriaLabel)}"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg></button>`
    : '';
  const manageButtonHTML = singleLayer
    ? `<button type="button" class="cc-btn cc-btn-ghost" data-cc="manage"><span class="cc-btn-label" data-cc-label="collapsed">${escapeHtml(text.manage)}</span><span class="cc-btn-label" data-cc-label="expanded">${escapeHtml(text.hidePreferences)}</span></button>`
    : `<button type="button" class="cc-btn cc-btn-secondary" data-cc="manage">${escapeHtml(text.manage)}</button>`;
  const acceptButtonHTML = singleLayer
    ? `<button type="button" class="cc-btn cc-btn-primary" data-cc="accept-all"><span class="cc-btn-label" data-cc-label="collapsed">${escapeHtml(text.acceptAll)}</span><span class="cc-btn-label" data-cc-label="expanded">${escapeHtml(text.savePreferences)}</span></button>`
    : `<button type="button" class="cc-btn cc-btn-primary" data-cc="accept-all">${escapeHtml(text.acceptAll)}</button>`;

  const expandedAttr = singleLayer ? `data-cc-expanded="false"` : '';
  const singleLayerAttr = singleLayer ? `data-cc-categories-on-banner="true"` : '';

  return `
    ${scrimHTML}
    <div
      class="cc-banner"
      id="${BANNER_ID}"
      data-testid="cc-banner"
      data-cc-layout="${banner.layout}"
      data-cc-position="${banner.position}"
      data-cc-scrim="${banner.scrim ? 'true' : 'false'}"
      ${singleLayerAttr}
      ${expandedAttr}
      ${roleAttrs}
      aria-hidden="true"
    >
      ${closeBtnHTML}
      <div class="cc-banner-inner">
        <p class="cc-banner-text">
          ${escapeHtml(text.bannerText)}
          ${policyLink}
        </p>
        ${categoriesHTML}
        <div class="cc-banner-actions">
          ${acceptButtonHTML}
          <button type="button" class="cc-btn cc-btn-primary cc-banner-reject" data-cc="reject-all">${escapeHtml(text.rejectAll)}</button>
          ${manageButtonHTML}
        </div>
      </div>
    </div>`;
}

function createBannerCategoriesHTML(
  config: SerializableConsentConfig,
  text: ResolvedConsentText,
): string {
  const essentialToggle = createCategoryToggle(
    'essential',
    text.essentialLabel,
    text.essentialDescription,
    true,
    true,
    text.badgeRequired,
  );
  const categoryToggles = Object.entries(config.categories)
    .map(([key, cat]) => {
      const resolved = resolveCategoryText(key, cat, text);
      return createCategoryToggle(
        key,
        resolved.label,
        resolved.description,
        false,
        cat.default,
        text.badgeOptional,
      );
    })
    .join('');
  return `<div class="cc-categories" data-cc-banner-categories>${essentialToggle}${categoryToggles}</div>`;
}

function createCategoryToggle(
  key: string,
  label: string,
  description: string,
  isEssential: boolean,
  defaultValue: boolean,
  badgeText: string,
): string {
  const checked = isEssential || defaultValue;
  const labelId = `cc-toggle-${escapeHtml(key)}-label`;
  const descId = `cc-toggle-${escapeHtml(key)}-desc`;
  const badgeClass = isEssential ? 'cc-badge cc-badge--required' : 'cc-badge';
  const badgeHtml = `<span class="${badgeClass}">${escapeHtml(badgeText)}</span>`;
  // Essential stays focusable so keyboard users can still traverse past it,
  // but `aria-disabled` + `data-locked` signal that it can't be flipped.
  const lockedAttrs = isEssential
    ? `aria-disabled="true" data-locked="true" tabindex="0"`
    : `tabindex="0"`;

  return `
    <div class="cc-category">
      <div class="cc-category-header">
        <div class="cc-category-label-group">
          <span class="cc-category-label" id="${labelId}">${escapeHtml(label)}</span>${badgeHtml}
        </div>
        <div
          class="cc-switch"
          role="switch"
          aria-checked="${checked ? 'true' : 'false'}"
          aria-labelledby="${labelId}"
          aria-describedby="${descId}"
          data-cc-category="${escapeHtml(key)}"
          ${lockedAttrs}
        ></div>
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
    text.badgeRequired,
  );

  const categoryToggles = Object.entries(config.categories)
    .map(([key, cat]) => {
      const resolved = resolveCategoryText(key, cat, text);
      return createCategoryToggle(
        key,
        resolved.label,
        resolved.description,
        false,
        cat.default,
        text.badgeOptional,
      );
    })
    .join('');

  const policyLink = createPolicyLinkHTML(config.cookiePolicy, 'cc-policy-link cc-modal-policy-link');

  return `
    <div class="cc-overlay" id="${OVERLAY_ID}" data-testid="cc-overlay" aria-hidden="true"></div>
    <div
      class="cc-modal"
      id="${MODAL_ID}"
      data-testid="cc-modal"
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
        </div>
        <div class="cc-modal-footer">
          <button type="button" class="cc-btn cc-btn-primary" data-cc="modal-accept-all">${escapeHtml(text.acceptAll)}</button>
          <button type="button" class="cc-btn cc-btn-primary" data-cc="modal-reject-all">${escapeHtml(text.rejectAll)}</button>
          <button type="button" class="cc-btn cc-btn-secondary" data-cc="save-preferences">${escapeHtml(text.savePreferences)}</button>
        </div>
        ${policyLink ? `<div class="cc-modal-policy-bar">${policyLink}</div>` : ''}
      </div>
    </div>`;
}

export function injectUI(config: SerializableConsentConfig, text: ResolvedConsentText): void {
  if (document.getElementById(CONTAINER_ID)) return;

  const banner = resolveBannerOptions(config);
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  // Single-layer mode renders categories inline on the banner, so the modal
  // is never reachable — skip injecting it to keep the DOM minimal and avoid
  // a phantom dialog that `Tab` could land in.
  const modalHTML = banner.categoriesOnBanner ? '' : createModalHTML(config, text);
  container.innerHTML = createBannerHTML(config, text, banner) + modalHTML;
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
  const scrim = document.getElementById(BANNER_SCRIM_ID);
  scrim?.classList.add('cc-visible');
}

export function hideBanner(): void {
  const el = document.getElementById(BANNER_ID);
  el?.classList.remove('cc-visible');
  el?.setAttribute('aria-hidden', 'true');
  const scrim = document.getElementById(BANNER_SCRIM_ID);
  scrim?.classList.remove('cc-visible');
}

// Module-level latch that swallows repeat accept/reject/save clicks while a
// dismiss animation is mid-flight. Mirrors the prototype's `isConfirming`
// guard (`docs/design/consent-v0.4-prototype.html:863`).
let isDismissing = false;

/**
 * Build + inject the success toast. Idempotent: any in-flight toast is
 * removed first so a rapid re-show doesn't stack DOM nodes. The toast runs
 * its entry + auto-dismiss animations in CSS; the JS here only wires the
 * `animationend` cleanup so the node leaves the DOM once the out-animation
 * completes.
 */
function spawnToast(title: string): void {
  for (const stale of document.querySelectorAll(`[data-testid="${TOAST_TESTID}"]`)) {
    stale.remove();
  }
  const toast = document.createElement('div');
  toast.className = 'cc-toast cc-visible';
  toast.setAttribute('data-testid', TOAST_TESTID);
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML =
    `<span class="cc-toast-check" aria-hidden="true">` +
    `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5"/></svg>` +
    `</span>` +
    `<span class="cc-toast-title">${escapeHtml(title)}</span>`;
  document.body.appendChild(toast);

  // Remove on the out-animation's end. We listen for `cc-toast-out`
  // specifically because the element plays both `cc-toast-in` and
  // `cc-toast-out` in sequence — removing on the first `animationend` would
  // drop the node before the user sees it.
  const cleanup = (e: AnimationEvent): void => {
    if (e.animationName !== 'cc-toast-out') return;
    toast.removeEventListener('animationend', cleanup);
    toast.remove();
  };
  toast.addEventListener('animationend', cleanup);
}

/**
 * Shared dismiss state machine used by banner and modal. Stages:
 *   1. Immediately add `cc-confirming` → disables pointer events so a second
 *      click can't land. Drop scrim/overlay `cc-visible` so they fade out.
 *   2. After CONFIRM_LEAD_IN_MS, add `cc-confirmed` (plays collapse keyframe)
 *      and spawn the toast.
 *   3. On the collapse keyframe's `animationend`, strip `cc-visible` +
 *      `cc-confirming` + `cc-confirmed`, set `aria-hidden="true"`, release
 *      the `isDismissing` latch.
 *
 * A fallback timer releases the latch even if `animationend` never fires
 * (e.g. the element is removed mid-animation, or keyframes were overridden).
 */
function runDismiss(
  surface: HTMLElement,
  companion: HTMLElement | null,
  toastTitle: string,
): void {
  surface.classList.add('cc-confirming');
  companion?.classList.remove('cc-visible');
  companion?.setAttribute('aria-hidden', 'true');

  let settled = false;
  const settle = (): void => {
    if (settled) return;
    settled = true;
    surface.removeEventListener('animationend', onCollapseEnd);
    window.clearTimeout(fallback);
    surface.classList.remove('cc-visible', 'cc-confirming', 'cc-confirmed');
    surface.setAttribute('aria-hidden', 'true');
    isDismissing = false;
  };
  const onCollapseEnd = (e: AnimationEvent): void => {
    // Multiple animations may emit animationend (e.g. if the surface has a
    // keyframe chain, or a descendant — like the scrim — finishes its own
    // transition). Scope to the `cc-dismiss-*` family on the surface itself
    // so we don't settle early on unrelated animations.
    if (e.target !== surface) return;
    if (!e.animationName.startsWith('cc-dismiss-')) return;
    settle();
  };
  const fallback = window.setTimeout(settle, DISMISS_FALLBACK_MS);
  surface.addEventListener('animationend', onCollapseEnd);

  window.setTimeout(() => {
    surface.classList.add('cc-confirmed');
    spawnToast(toastTitle);
  }, CONFIRM_LEAD_IN_MS);
}

function toastTitleFor(text: ResolvedConsentText, kind: DismissKind): string {
  return kind === 'accepted'
    ? text.toastAccepted
    : kind === 'rejected'
      ? text.toastRejected
      : text.toastSaved;
}

/**
 * Animate the banner away and show the confirmation toast. Guarded so a
 * double-click during the animation is ignored. Returns `false` if the
 * banner isn't currently visible (caller should fall back to `hideBanner`)
 * or a dismiss is already in flight.
 */
export function dismissBannerWithConfirm(
  text: ResolvedConsentText,
  kind: DismissKind,
): boolean {
  if (isDismissing) return false;
  const banner = document.getElementById(BANNER_ID);
  if (!banner || !banner.classList.contains('cc-visible')) return false;
  isDismissing = true;
  const scrim = document.getElementById(BANNER_SCRIM_ID);
  runDismiss(banner, scrim, toastTitleFor(text, kind));
  return true;
}

/**
 * Animate the modal away and show the confirmation toast. See
 * `dismissBannerWithConfirm` for the state machine and guard semantics.
 */
export function dismissModalWithConfirm(
  text: ResolvedConsentText,
  kind: DismissKind,
): boolean {
  if (isDismissing) return false;
  const modal = document.getElementById(MODAL_ID);
  if (!modal || !modal.classList.contains('cc-visible')) return false;
  isDismissing = true;
  const overlay = document.getElementById(OVERLAY_ID);
  // Restore focus now (same contract as hideModal) so assistive tech lands
  // on the trigger while the collapse animation plays.
  const toFocus = previouslyFocused;
  previouslyFocused = null;
  if (toFocus && toFocus.isConnected) {
    try {
      toFocus.focus();
    } catch {
      /* ignore — e.g. element became non-focusable */
    }
  }
  runDismiss(modal, overlay, toastTitleFor(text, kind));
  return true;
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

// Scoped to `#cc-modal [role="switch"][data-cc-category]` so declarative
// script-blocking markup (which reuses `data-cc-category` on <script>/<iframe>
// elements) doesn't leak into modal state reads.
const MODAL_TOGGLE_SELECTOR = `#${MODAL_ID} [role="switch"][data-cc-category]`;
// Mirror selector for single-layer mode where toggles live on the banner
// rather than in the modal. Same scoping rationale as `MODAL_TOGGLE_SELECTOR`.
const BANNER_TOGGLE_SELECTOR = `#${BANNER_ID} [role="switch"][data-cc-category]`;

function readSelections(selector: string): Record<string, boolean> {
  const selections: Record<string, boolean> = {};
  const switches = document.querySelectorAll<HTMLElement>(selector);
  for (const sw of switches) {
    const key = sw.getAttribute('data-cc-category');
    if (key && key !== 'essential') {
      selections[key] = sw.getAttribute('aria-checked') === 'true';
    }
  }
  return selections;
}

function applyToggleState(selector: string, categories: Record<string, boolean>): void {
  const switches = document.querySelectorAll<HTMLElement>(selector);
  for (const sw of switches) {
    const key = sw.getAttribute('data-cc-category');
    if (key && sw.getAttribute('data-locked') !== 'true') {
      sw.setAttribute('aria-checked', categories[key] ? 'true' : 'false');
    }
  }
}

export function updateModalToggles(categories: Record<string, boolean>): void {
  applyToggleState(MODAL_TOGGLE_SELECTOR, categories);
}

export function getModalSelections(): Record<string, boolean> {
  return readSelections(MODAL_TOGGLE_SELECTOR);
}

export function updateBannerToggles(categories: Record<string, boolean>): void {
  applyToggleState(BANNER_TOGGLE_SELECTOR, categories);
}

export function getBannerSelections(): Record<string, boolean> {
  return readSelections(BANNER_TOGGLE_SELECTOR);
}

/**
 * Returns `true` when the rendered banner is in single-layer mode (categories
 * inline). Read off the live DOM rather than re-resolving config so
 * `setBannerExpanded` and the click handlers stay cheap.
 */
export function isCategoriesOnBanner(): boolean {
  const banner = document.getElementById(BANNER_ID);
  return banner?.getAttribute('data-cc-categories-on-banner') === 'true';
}

export function isBannerExpanded(): boolean {
  const banner = document.getElementById(BANNER_ID);
  return banner?.getAttribute('data-cc-expanded') === 'true';
}

/**
 * Flip the single-layer banner between collapsed and expanded. Sets
 * `data-cc-expanded` (read by CSS to drive the height/opacity transition and
 * the button-label morphing) and moves focus into the first interactive
 * switch when expanding so keyboard users land on the new controls.
 */
export function setBannerExpanded(expanded: boolean): void {
  const banner = document.getElementById(BANNER_ID);
  if (!banner) return;
  banner.setAttribute('data-cc-expanded', expanded ? 'true' : 'false');
  if (expanded) {
    requestAnimationFrame(() => {
      const firstSwitch = banner.querySelector<HTMLElement>(
        '[role="switch"][data-cc-category]:not([data-locked="true"])',
      );
      firstSwitch?.focus();
    });
  }
}
