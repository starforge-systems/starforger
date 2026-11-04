// Compiles src/quasar-color-theme.jsonc (palette tokens) into themes/quasar-color-theme.json (hex).
// A color is written as "<family>-<step>" ("highlight-200", "deco-argon"), with an optional
// opacity percent: "accent-400/30". Run: npm run build
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadPalette } from './palette.mjs';

const root = new URL('../', import.meta.url);
const palette = loadPalette(new URL('src/tokens.json', root));
const source = readFileSync(new URL('src/quasar-color-theme.jsonc', root), 'utf8');
const families = new Set([...palette.keys()].map((name) => name.split('-')[0]));

const errors = [];
const used = new Map();
const lineOf = (offset) => source.slice(0, offset).split('\n').length;

const compiled = source.replace(/"([a-z]+)-([a-z0-9]+)(?:\/(\d{1,3}))?"/g, (match, family, step, pct, offset) => {
  if (!families.has(family)) return match;
  const name = `${family}-${step}`;
  const hex = palette.get(name);
  if (!hex) return errors.push(`line ${lineOf(offset)}: unknown palette step "${name}"`), match;
  if (pct !== undefined && +pct > 100) return errors.push(`line ${lineOf(offset)}: opacity ${pct}% is over 100`), match;
  used.set(name, (used.get(name) || 0) + 1);
  const alpha = pct === undefined || +pct === 100 ? '' : Math.round((+pct / 100) * 255).toString(16).padStart(2, '0');
  return `"${hex}${alpha}"`;
});

// The source stays palette-only: a hex literal there is a color the palette doesn't own.
for (const m of source.matchAll(/"#[0-9a-fA-F]{3,8}"/g)) errors.push(`line ${lineOf(m.index)}: raw hex ${m[0]}; use a palette token`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

mkdirSync(new URL('themes/', root), { recursive: true });
writeFileSync(new URL('themes/quasar-color-theme.json', root), compiled);

const byFamily = {};
for (const [name, n] of used) byFamily[name.split('-')[0]] = (byFamily[name.split('-')[0]] || 0) + n;
console.log(`themes/quasar-color-theme.json: ${[...used.values()].reduce((a, b) => a + b, 0)} colors from ${used.size} steps`);
console.log(Object.entries(byFamily).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} ${n}`).join(' · '));
