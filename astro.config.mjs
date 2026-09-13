// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
const retirementReview = JSON.parse(readFileSync(new URL('./src/data/editorial-retirements.json', import.meta.url), 'utf8'));
const retiredPaths = new Set(retirementReview.entries.map(entry => `/thoughts/${entry.id}`));

export default defineConfig({
  site: 'https://softcat.ai',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [preact(), sitemap({ filter: page => !retiredPaths.has(new URL(page).pathname.replace(/\/+$/, '')) })],
});
