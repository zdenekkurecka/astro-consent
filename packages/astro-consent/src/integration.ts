import type { AstroIntegration } from 'astro';
import type { ConsentConfig, SerializableConsentConfig } from './types.js';
import { buildGcmDefaultSnippet, validateGcmConfig } from './gcm.js';
import { vitePluginConsentConfig } from './virtual-config.js';

export default function cookieConsent<K extends string = string>(
  userConfig?: ConsentConfig<K>,
): AstroIntegration {
  if (
    !userConfig ||
    typeof userConfig.version !== 'number' ||
    !userConfig.categories ||
    typeof userConfig.categories !== 'object' ||
    Object.keys(userConfig.categories).length === 0
  ) {
    throw new Error(
      '[@zdenekkurecka/astro-consent] Missing required config. ' +
        '`cookieConsent()` requires a `version` (number) and a non-empty `categories` map. ' +
        'If you used `astro add`, open astro.config.* and replace `cookieConsent()` with a call that passes at least ' +
        '`{ version: 1, categories: { analytics: { label: "Analytics", description: "…", default: false } } }`. ' +
        'See https://github.com/zdenekkurecka/astro-consent#quick-start',
    );
  }

  const gcm = userConfig.googleConsentMode;
  if (gcm && gcm.enabled !== false) {
    validateGcmConfig(gcm, Object.keys(userConfig.categories));
  }

  const serializableConfig: SerializableConsentConfig<K> = {
    version: userConfig.version,
    categories: userConfig.categories,
    cookiePolicy: userConfig.cookiePolicy,
    storageKey: userConfig.storageKey,
    maxAgeDays: userConfig.maxAgeDays,
    debug: userConfig.debug,
    ui: userConfig.ui,
    text: userConfig.text,
    localeText: userConfig.localeText,
    googleConsentMode: userConfig.googleConsentMode,
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

        // Google Consent Mode v2: inject the default-denied snippet inline
        // at the top of <head> so `gtag('consent', 'default', …)` runs before
        // any downstream GTM/gtag.js. This is the one case where we emit an
        // inline <script> — opt-in and documented as a CSP caveat.
        if (gcm && gcm.enabled !== false) {
          injectScript('head-inline', buildGcmDefaultSnippet(gcm));
        }
      },
    },
  };
}
