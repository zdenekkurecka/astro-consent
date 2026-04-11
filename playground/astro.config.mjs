import { defineConfig } from 'astro/config';
import cookieConsent from '@zdenekkurecka/astro-consent';

export default defineConfig({
  integrations: [
    cookieConsent({
      version: 1,
      categories: {
        analytics: {
          label: 'Analytics',
          description: 'Help us understand how visitors use the site.',
          default: false,
        },
        marketing: {
          label: 'Marketing',
          description: 'Used for targeted advertising.',
          default: false,
        },
      },
      onConsent: (state) => {
        console.log('[playground] Consent given:', state);
      },
      onChange: (state) => {
        console.log('[playground] Consent changed:', state);
      },
    }),
  ],
});
