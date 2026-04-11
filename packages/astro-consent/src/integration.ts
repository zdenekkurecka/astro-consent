import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { AstroIntegration } from 'astro';
import type { ConsentConfig, SerializableConsentConfig } from './types.js';
import { vitePluginConsentConfig } from './virtual-config.js';

export default function cookieConsent(userConfig: ConsentConfig): AstroIntegration {
  const serializableConfig: SerializableConsentConfig = {
    version: userConfig.version,
    categories: userConfig.categories,
  };

  return {
    name: '@zdenekkurecka/astro-consent',
    hooks: {
      'astro:config:setup': ({ updateConfig, injectScript, logger }) => {
        logger.info('Setting up cookie consent...');

        // 1. Register Vite plugin for virtual modules (config + init entry)
        updateConfig({
          vite: {
            plugins: [vitePluginConsentConfig(serializableConfig)],
          },
        });

        // 2. Inject compiled CSS as inline <style> in <head>
        const thisDir = dirname(fileURLToPath(import.meta.url));
        const cssPath = resolve(thisDir, 'styles', 'base.css');
        const css = readFileSync(cssPath, 'utf-8');
        injectScript('head-inline', `if(!document.getElementById('cc-styles')){const s=document.createElement('style');s.id='cc-styles';s.textContent=${JSON.stringify(css)};document.head.appendChild(s)}`);

        // 3. Inject client-side init module on every page
        injectScript('page', 'import "virtual:astro-consent/init";');

        // 4. Inject callbacks via head-inline (runs before modules)
        if (userConfig.onConsent || userConfig.onChange) {
          const parts: string[] = [];
          if (userConfig.onConsent) {
            parts.push(`onConsent: ${userConfig.onConsent.toString()}`);
          }
          if (userConfig.onChange) {
            parts.push(`onChange: ${userConfig.onChange.toString()}`);
          }
          injectScript(
            'head-inline',
            `window.__astroConsentCallbacks = { ${parts.join(', ')} };`,
          );
        }
      },
    },
  };
}
