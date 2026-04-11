import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
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

export function vitePluginConsentConfig(config: SerializableConsentConfig): VitePlugin {
  // Resolve paths relative to this file's location in dist/
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const clientPath = resolve(thisDir, 'client.js');
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
          `import { initConsentManager } from '${clientPath}';`,
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
