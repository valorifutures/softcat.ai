// Read publication state with the same locked YAML parser as the content gate.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.resolve('astro/package.json'));
const yaml = require('js-yaml');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const records = [];
for (const collection of ['news-and-updates', 'thoughts', 'tools', 'prompts', 'glossary']) {
  const base = join(root, 'src/content', collection);
  function visit(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) { visit(path); continue; }
      if (!item.name.endsWith('.md')) continue;
      const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
      const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
      if (!match) throw new Error(`${path}: missing frontmatter`);
      const data = yaml.load(match[1]);
      if (!data || typeof data !== 'object' || (data.draft !== undefined && typeof data.draft !== 'boolean')) throw new Error(`${path}: invalid publication metadata`);
      records.push({ path: relative(root, path), route: '/' + collection + '/' + relative(base, path).replace(/\.md$/, ''), draft: data.draft === true, tags: data.tags || [] });
    }
  }
  visit(base);
}
process.stdout.write(JSON.stringify(records));
