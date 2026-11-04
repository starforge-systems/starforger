// Loads src/tokens.json (the Quasar InclusiveColors export, dropped in unchanged) and fills every
// family out to the full 50–950 scale. Steps the export defines are kept exactly; unset steps
// (exported as #000000) are generated in OKLCH from the lightness/chroma curve of the families the
// export defines completely (card, promo, notice).
import { readFileSync } from 'node:fs';

export const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const EMPTY = '#000000';

// Families that step through hue, not lightness: kept as-is and named, never extended.
// Mirrors `named` in starforge-quasar's src/palette/aliases.cjs.
const NAMED = {
  deco: { 100: 'neon', 200: 'sodium', 300: 'oxygen', 400: 'argon', 500: 'xenon', 600: 'hydrogen' },
};

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995525 * g + 0.1073969493 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787895 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function oklchToRgb([L, C, H]) {
  const A = C * Math.cos(H), B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

// Lowers chroma until the color fits sRGB, keeping lightness and hue.
function oklchToHex([L, C, H]) {
  let lo = 0, hi = C;
  if (!inGamut(oklchToRgb([L, C, H]))) {
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgb([L, mid, H]))) lo = mid; else hi = mid;
    }
    C = lo;
  }
  return '#' + oklchToRgb([L, C, H]).map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, '0')).join('');
}

export function loadPalette(url) {
  const tokens = JSON.parse(readFileSync(url, 'utf8'));
  const defined = {}; // family → { step: hex }
  for (const [family, scale] of Object.entries(tokens)) {
    defined[family] = {};
    for (const [step, token] of Object.entries(scale)) {
      const hex = String(token.$value).toLowerCase();
      if (!/^#[0-9a-f]{6}$/.test(hex)) throw new Error(`tokens.json: ${family}.${step} is not a hex color`);
      if (hex !== EMPTY) defined[family][step] = hex;
    }
  }

  const complete = Object.keys(defined).filter((f) => !NAMED[f] && STEPS.every((s) => defined[f][s]));
  if (!complete.length) throw new Error('tokens.json: no fully defined family to take the lightness curve from');
  const ref = STEPS.map((s) => {
    const lch = complete.map((f) => hexToOklch(defined[f][s]));
    return { L: avg(lch.map((c) => c[0])), shape: 0 };
  });
  // Chroma shape: each complete family's chroma normalized to its peak, then averaged.
  for (const f of complete) {
    const cs = STEPS.map((s) => hexToOklch(defined[f][s])[1]);
    const peak = Math.max(...cs);
    cs.forEach((c, i) => (ref[i].shape += c / peak / complete.length));
  }

  const colors = new Map(); // token name → hex
  for (const [family, steps] of Object.entries(defined)) {
    if (NAMED[family]) {
      for (const [step, hex] of Object.entries(steps)) {
        const name = NAMED[family][step];
        if (!name) throw new Error(`tokens.json: ${family}.${step} is set but has no name in NAMED`);
        colors.set(`${family}-${name}`, hex);
      }
      continue;
    }
    const known = STEPS.map((s, i) => steps[s] && { i, lch: hexToOklch(steps[s]) }).filter(Boolean);
    if (!known.length) continue;
    const offset = (k) => k.lch[0] - ref[k.i].L;
    const maxC = Math.max(...known.map((k) => k.lch[1]));
    STEPS.forEach((step, i) => {
      if (steps[step]) return colors.set(`${family}-${step}`, steps[step]);
      const below = known.filter((k) => k.i < i).at(-1);
      const above = known.find((k) => k.i > i);
      // Lightness follows the reference curve, shifted by the family's own offset from it; past the
      // last defined step the offset fades out, so every family meets at the same 50 and 950.
      let off;
      if (below && above) off = offset(below) + ((offset(above) - offset(below)) * (i - below.i)) / (above.i - below.i);
      else if (above) off = (offset(above) * i) / above.i;
      else off = (offset(below) * (STEPS.length - 1 - i)) / (STEPS.length - 1 - below.i);
      const anchor = [below, above].filter(Boolean).sort((a, b) => Math.abs(a.i - i) - Math.abs(b.i - i))[0];
      const chroma = Math.min(maxC, (anchor.lch[1] * ref[i].shape) / Math.max(ref[anchor.i].shape, 0.05));
      colors.set(`${family}-${step}`, oklchToHex([ref[i].L + off, chroma, anchor.lch[2]]));
    });
  }
  return colors;
}

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
