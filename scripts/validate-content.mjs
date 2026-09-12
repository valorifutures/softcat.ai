#!/usr/bin/env node
// Use the same locked YAML parser as Astro. No additional dependency required.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.resolve('astro/package.json'));
const yaml = require('js-yaml');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(root, 'src/content');
const errors = [];
let count = 0;

function visit(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { visit(path); continue; }
    if (!item.name.endsWith('.md')) continue;
    count++;
    const label = relative(root, path);
    const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!match) { errors.push(`${label}: missing or unclosed frontmatter`); continue; }
    try {
      const data = yaml.load(match[1]);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('frontmatter must be a mapping');
      if (typeof data.title !== 'string' || !data.title.trim()) throw new Error('title is required');
      if (label.includes('content/prompts/')) {
        for (const key of ['description', 'category', 'prompt']) {
          if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`${key} is required`);
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.category)) throw new Error('category must be lowercase and hyphenated');
      }
      if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some(t => typeof t !== 'string'))) throw new Error('tags must be an array of strings');
      if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error('draft must be a boolean');
    } catch (error) {
      errors.push(`${label}: ${error.reason ?? error.message}`);
    }
  }
}
visit(base);
for (const error of errors) console.error(`ERROR ${error}`);
console.log(`validate-content: ${count} Markdown files, ${errors.length} error(s)`);
process.exitCode = errors.length ? 1 : 0;
