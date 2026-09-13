// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
const retirementReview = JSON.parse(readFileSync(new URL('./src/data/editorial-retirements.json', import.meta.url), 'utf8'));
const promptRetirements = JSON.parse(readFileSync(new URL('./src/data/prompt-retirements.json', import.meta.url), 'utf8'));
const toolRetirements = JSON.parse(readFileSync(new URL('./src/data/tool-retirements.json', import.meta.url), 'utf8'));
const retiredPaths = new Set([...retirementReview.entries.map(entry => `/thoughts/${entry.id}`), ...promptRetirements.entries.map(entry => `/prompts/${entry.id}`), ...toolRetirements.entries.map(entry => `/tools/${entry.id}`)]);
const recoveryPaths = new Set(['/404', '/404.html', '/trace']);

export default defineConfig({
  site: 'https://softcat.ai',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [preact(), sitemap({ filter: page => {
    const path = new URL(page).pathname.replace(/\/+$/, '');
    return !retiredPaths.has(path) && !recoveryPaths.has(path);
  } })],
});
