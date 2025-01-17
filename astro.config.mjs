import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  server: {
      host: true,
      port: 8080
  },

  integrations: [react()]
});