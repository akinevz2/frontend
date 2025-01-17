import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
    server: {
        port: 8080,
        host: true
    },
    vite: {
        server: {
            watch: {
                usePolling: true
            }
        }
    },
    integrations: [react()]
});