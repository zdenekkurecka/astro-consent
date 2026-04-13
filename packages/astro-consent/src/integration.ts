import type { AstroIntegration } from 'astro';
import type { ConsentConfig, SerializableConsentConfig } from './types.js';
import { vitePluginConsentConfig } from './virtual-config.js';

export default function cookieConsent(userConfig: ConsentConfig): AstroIntegration {
  const serializableConfig: SerializableConsentConfig = {
    version: userConfig.version,
    categories: userConfig.categories,
    cookiePolicy: userConfig.cookiePolicy,
    storageKey: userConfig.storageKey,
    maxAgeDays: userConfig.maxAgeDays,
    text: userConfig.text,
    localeText: userConfig.localeText,
  };

  return {
    name: '@zdenekkurecka/astro-consent',
    hooks: {
      'astro:config:setup': ({ updateConfig, injectScript, logger }) => {
        logger.info('Setting up cookie consent...');

        // Register the Vite plugin that backs the virtual init module.
        updateConfig({
          vite: {
            plugins: [vitePluginConsentConfig(serializableConfig)],
          },
        });

        // Inject the CSS via `page-ssr` so it flows through Astro's normal
        // CSS extraction pipeline and is emitted as a hashed
        // <link rel="stylesheet"> in <head>. No inline <style>, CSP-safe.
        injectScript(
          'page-ssr',
          'import "@zdenekkurecka/astro-consent/styles/base.css";',
        );

        // Inject the client runtime. `injectScript('page', ...)` compiles to
        // a hashed <script type="module" src="..."> — not inline — so the
        // integration also works under strict script-src CSP.
        injectScript('page', 'import "virtual:astro-consent/init";');
      },
    },
  };
}
