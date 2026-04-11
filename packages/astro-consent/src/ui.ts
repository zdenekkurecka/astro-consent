import type { SerializableConsentConfig } from './types.js';

const CONTAINER_ID = 'cc-container';

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
    <div class="cc-banner" id="cc-banner" role="dialog" aria-label="Cookie consent">
      <div class="cc-banner-inner">
        <p class="cc-banner-text">
          We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
          Please choose your cookie preferences.
        </p>
        <div class="cc-banner-actions">
          <button class="cc-btn cc-btn-primary" data-cc="accept-all">Accept all</button>
          <button class="cc-btn cc-btn-secondary" data-cc="reject-all">Reject all</button>
          <button class="cc-btn cc-btn-link" data-cc="manage">Manage preferences</button>
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

  return `
    <div class="cc-category">
      <div class="cc-category-header">
        <label class="cc-category-label" for="${id}">${escapeHtml(label)}</label>
        <label class="cc-toggle">
          <input type="checkbox" id="${id}" data-cc-category="${escapeHtml(key)}" ${checked} ${disabled} />
          <span class="cc-toggle-slider"></span>
        </label>
      </div>
      <p class="cc-category-description">${escapeHtml(description)}</p>
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
    <div class="cc-overlay" id="cc-overlay" aria-hidden="true"></div>
    <div class="cc-modal" id="cc-modal" role="dialog" aria-label="Cookie preferences" aria-hidden="true">
      <div class="cc-modal-inner">
        <div class="cc-modal-header">
          <h2 class="cc-modal-title">Cookie preferences</h2>
          <button class="cc-modal-close" data-cc="close-modal" aria-label="Close">&times;</button>
        </div>
        <div class="cc-modal-body">
          ${essentialToggle}
          ${categoryToggles}
        </div>
        <div class="cc-modal-footer">
          <button class="cc-btn cc-btn-primary" data-cc="modal-accept-all">Accept all</button>
          <button class="cc-btn cc-btn-secondary" data-cc="modal-reject-all">Reject all</button>
          <button class="cc-btn cc-btn-primary" data-cc="save-preferences">Save preferences</button>
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
  document.getElementById('cc-banner')?.classList.add('cc-visible');
}

export function hideBanner(): void {
  document.getElementById('cc-banner')?.classList.remove('cc-visible');
}

export function showModal(): void {
  const modal = document.getElementById('cc-modal');
  const overlay = document.getElementById('cc-overlay');
  if (modal) {
    modal.classList.add('cc-visible');
    modal.setAttribute('aria-hidden', 'false');
  }
  if (overlay) {
    overlay.classList.add('cc-visible');
    overlay.setAttribute('aria-hidden', 'false');
  }
}

export function hideModal(): void {
  const modal = document.getElementById('cc-modal');
  const overlay = document.getElementById('cc-overlay');
  if (modal) {
    modal.classList.remove('cc-visible');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (overlay) {
    overlay.classList.remove('cc-visible');
    overlay.setAttribute('aria-hidden', 'true');
  }
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
