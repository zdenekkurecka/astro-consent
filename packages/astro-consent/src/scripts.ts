import { readConsent } from './consent.js';

/**
 * Declarative third-party script blocking.
 *
 * Authors mark scripts / iframes as gated with consent categories:
 *
 *   <script type="text/plain" data-cc-category="analytics"
 *           data-cc-src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>
 *
 *   <script type="text/plain" data-cc-category="analytics">
 *     // inline tracker body
 *   </script>
 *
 *   <iframe data-cc-category="marketing" data-cc-src="https://www.youtube.com/embed/…"></iframe>
 *
 * The browser treats `type="text/plain"` scripts and src-less iframes as inert
 * data islands. When the matching consent category is granted we replace the
 * placeholder with a live `<script>` / copy `data-cc-src` into `src`, which
 * triggers execution. Activation is irreversible within the page lifecycle —
 * see README for the revocation caveat.
 */

const ACTIVATED_ATTR = 'data-cc-activated';
const SCRIPT_SELECTOR = 'script[type="text/plain"][data-cc-category]';
const IFRAME_SELECTOR = 'iframe[data-cc-category][data-cc-src]:not([src])';

/**
 * Attributes we deliberately drop when cloning a blocked script into a live
 * one. `type` would re-block it; `data-cc-src` is the source-of-truth we've
 * already copied into `src`. `nonce` is skipped here because the content
 * attribute is hidden post-parse (CSP L3) — we copy it via the `.nonce`
 * IDL property below instead.
 */
const SCRIPT_SKIP_ATTRS = new Set(['type', 'data-cc-src', 'nonce']);

function isActivated(el: Element): boolean {
  return el.getAttribute(ACTIVATED_ATTR) === 'true';
}

/**
 * Replace a blocked `<script type="text/plain">` with a live `<script>` so the
 * browser executes it. A fresh element is required — mutating `type` on an
 * existing script does not retroactively trigger execution.
 *
 * All other attributes (async, defer, integrity, crossorigin, …) are
 * preserved, so CSP nonces set on the placeholder flow through to the
 * injected script. `nonce` is special-cased: browsers hide the content
 * attribute post-parse for security (CSP L3), so `getAttribute('nonce')`
 * returns an empty string and only the `.nonce` IDL property holds the
 * real value. Copy via the property so the injected script still matches
 * the page CSP.
 */
function activateScript(oldScript: HTMLScriptElement): void {
  if (isActivated(oldScript)) return;

  const newScript = document.createElement('script');
  for (const attr of Array.from(oldScript.attributes)) {
    if (SCRIPT_SKIP_ATTRS.has(attr.name)) continue;
    newScript.setAttribute(attr.name, attr.value);
  }
  if (oldScript.nonce) newScript.nonce = oldScript.nonce;

  const src = oldScript.getAttribute('data-cc-src');
  if (src) {
    newScript.src = src;
  } else {
    // Inline body: re-inject verbatim. This is an inline script and therefore
    // requires `'unsafe-inline'` or a nonce under strict CSP — prefer the
    // `data-cc-src` external form when possible.
    newScript.text = oldScript.textContent ?? '';
  }
  newScript.setAttribute(ACTIVATED_ATTR, 'true');

  // Mark the old one before removing it — defensive in case replaceChild
  // fails and the element stays in the DOM for some reason.
  oldScript.setAttribute(ACTIVATED_ATTR, 'true');
  oldScript.parentNode?.replaceChild(newScript, oldScript);
}

function activateIframe(iframe: HTMLIFrameElement): void {
  if (isActivated(iframe)) return;
  const src = iframe.getAttribute('data-cc-src');
  if (!src) return;
  iframe.setAttribute(ACTIVATED_ATTR, 'true');
  iframe.setAttribute('src', src);
}

function isGranted(el: Element, categories: Record<string, boolean>): boolean {
  const cat = el.getAttribute('data-cc-category');
  return !!cat && categories[cat] === true;
}

/**
 * One-shot scan: activate every blocked script/iframe whose category is
 * currently granted. Safe to call repeatedly — already-activated scripts are
 * removed from the DOM and already-activated iframes are filtered via the
 * `data-cc-activated` marker.
 */
export function activateBlockedResources(categories: Record<string, boolean>): void {
  const scripts = document.querySelectorAll<HTMLScriptElement>(SCRIPT_SELECTOR);
  for (const s of scripts) {
    if (isGranted(s, categories)) activateScript(s);
  }

  const iframes = document.querySelectorAll<HTMLIFrameElement>(IFRAME_SELECTOR);
  for (const f of iframes) {
    if (!isActivated(f) && isGranted(f, categories)) activateIframe(f);
  }
}

let observer: MutationObserver | null = null;

/**
 * Observe the DOM for blocked elements inserted after initial consent (e.g.
 * via client-side routing or ad-hoc DOM manipulation) and activate them on
 * the fly if the relevant category is already granted. Idempotent — calling
 * more than once is a no-op.
 */
export function initScriptBlocker(): void {
  if (observer || typeof MutationObserver === 'undefined') return;

  observer = new MutationObserver((mutations) => {
    const state = readConsent();
    if (!state) return;
    const categories = state.categories;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;

        if (node.matches(SCRIPT_SELECTOR) && isGranted(node, categories)) {
          activateScript(node as HTMLScriptElement);
        } else if (node.matches(IFRAME_SELECTOR) && isGranted(node, categories)) {
          activateIframe(node as HTMLIFrameElement);
        }

        // Descendants of a newly-inserted subtree (e.g. a fragment attached
        // in one shot) don't generate their own mutation records — walk them
        // here so nested blocked elements still get picked up.
        const nestedScripts = node.querySelectorAll<HTMLScriptElement>(SCRIPT_SELECTOR);
        for (const s of nestedScripts) {
          if (isGranted(s, categories)) activateScript(s);
        }
        const nestedIframes = node.querySelectorAll<HTMLIFrameElement>(IFRAME_SELECTOR);
        for (const f of nestedIframes) {
          if (!isActivated(f) && isGranted(f, categories)) activateIframe(f);
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}
