import type { SerializableConsentConfig } from './types.js';

interface VitePlugin {
  name: string;
  resolveId(id: string): string | undefined;
  load(id: string): string | undefined;
}

const VIRTUAL_CONFIG = 'virtual:astro-consent/config';
const VIRTUAL_INIT = 'virtual:astro-consent/init';
const RESOLVED_CONFIG = '\0' + VIRTUAL_CONFIG;
const RESOLVED_INIT = '\0' + VIRTUAL_INIT;

// Import the client via the package's own bare specifier so Vite resolves it
// through normal package resolution. This keeps the virtual module
// cross-platform (no absolute filesystem paths embedded as import strings)
// and decoupled from the on-disk dist/ layout. The CSS is injected
// separately by the integration via `injectScript('page-ssr', ...)`.
const CLIENT_SPECIFIER = '@zdenekkurecka/astro-consent/client';

export function vitePluginConsentConfig(config: SerializableConsentConfig): VitePlugin {
  return {
    name: 'vite-plugin-astro-consent',

    resolveId(id: string) {
      if (id === VIRTUAL_CONFIG) return RESOLVED_CONFIG;
      if (id === VIRTUAL_INIT) return RESOLVED_INIT;
    },

    load(id: string) {
      if (id === RESOLVED_CONFIG) {
        return `export default ${JSON.stringify(config)};`;
      }

      if (id === RESOLVED_INIT) {
        return [
          `import config from '${VIRTUAL_CONFIG}';`,
          `import { initConsentManager } from '${CLIENT_SPECIFIER}';`,
          ``,
          `function init() {`,
          `  initConsentManager(config);`,
          `}`,
          ``,
          `// Fires on every View Transitions navigation (and initial load when VT is enabled).`,
          `document.addEventListener('astro:page-load', init);`,
          ``,
          `// Fallback for sites without View Transitions: astro:page-load never fires there,`,
          `// so we also listen for DOMContentLoaded (or run immediately if the DOM is already`,
          `// ready). initConsentManager is idempotent (listenerAttached / consentFiredThisSession`,
          `// guards in client.ts), so double-firing on VT-enabled sites is safe.`,
          `if (document.readyState === 'loading') {`,
          `  document.addEventListener('DOMContentLoaded', init, { once: true });`,
          `} else {`,
          `  init();`,
          `}`,
        ].join('\n');
      }
    },
  };
}
