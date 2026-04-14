import { defineConfig } from 'astro/config';
import cookieConsent from '@zdenekkurecka/astro-consent';

export default defineConfig({
  integrations: [
    cookieConsent({
      version: 1,
      ui: {
        colorMode: 'auto',
      },
      cookiePolicy: {
        url: '/cookie-policy',
        label: 'Cookie Policy',
      },
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
    }),
  ],
});
