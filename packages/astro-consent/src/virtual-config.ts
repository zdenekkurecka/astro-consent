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
// and decoupled from the on-disk dist/ layout.
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
          `const callbacks = typeof window !== 'undefined' ? (window.__astroConsentCallbacks || {}) : {};`,
          ``,
          `function init() {`,
          `  initConsentManager(config, callbacks);`,
          `}`,
          ``,
          `document.addEventListener('astro:page-load', init);`,
        ].join('\n');
      }
    },
  };
}
