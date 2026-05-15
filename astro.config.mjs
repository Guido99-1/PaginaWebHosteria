// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://hosteriaagoyan.com',
  integrations: [
    sitemap({
      // Excluir rutas internas de Claude
      filter: (page) => !page.includes('/.claude/'),
      // Prioridades por sección
      customPages: [],
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
