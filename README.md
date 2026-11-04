# Quasar

A dark VS Code theme in the Starforge Quasar palette, built on
[carlos18mz/Cyberpunk-2077-rebuild](https://github.com/carlos18mz/Cyberpunk-2077-rebuild) (MIT).

## Layout

| File | What it is |
|---|---|
| `src/quasar-color-theme.jsonc` | **The theme source. Edit this.** Every color is a palette token, never a hex code. |
| `src/tokens.json` | The Quasar InclusiveColors export, dropped in unchanged from starforge-quasar's `src/palette/tokens.json`. |
| `scripts/palette.mjs` | Loads `tokens.json` and extends every family to all 11 steps (see below). |
| `scripts/build.mjs` | Compiles the source into `themes/quasar-color-theme.json`. |
| `themes/quasar-color-theme.json` | Generated output that VS Code loads. Don't edit it. Rebuild instead. |

## Color tokens

A color is `"<family>-<step>"`. Add `/<percent>` for opacity:

```jsonc
"editor.foreground": "highlight-50",
"editor.selectionBackground": "accent-500/63",
"terminal.ansiCyan": "deco-argon"
```

- **Families:** `card`, `promo`, `notice`, `accent`, `highlight`, `alert`, `error` and `debug` take the steps `50`–`950`.
- **`deco`** steps through hue, not lightness, so it uses names: `neon`, `sodium`, `oxygen`, `argon`, `xenon`, `hydrogen`.
- **The build fails** on an unknown step, an opacity over 100, or a raw hex code in the source.

## Roles

Steps follow how often the Quasar Shopify theme uses them. Prefer the steps below; the extended
steps exist, but the Shopify theme rarely reaches for them.

| Step | Used for |
|---|---|
| `highlight-100` | Idle UI text and icons, strings, focus rings (`focusBorder`, hover borders) |
| `accent-200` | Hover, active and selected text, active-tab and activity-bar borders, the cursor, match highlights, keywords |
| `accent-300` | Buttons and badges; selections at reduced opacity |
| `alert-100` | Secondary text: descriptions, the status bar, the active line number, functions |
| `notice-100` | Code body text and the terminal foreground (the Shopify theme's body-copy color) |
| `card-700` | Borders, and hover/selected row backgrounds |
| `card-600` | Borders on nested surfaces: widgets, inputs, dropdowns, notifications |
| `card-500` / `card-300` | Muted text: line numbers, placeholders, comments and punctuation |
| `card-950` / `card-900` / `card-800` | Surfaces: sidebar and panels / editor / widgets, inactive tabs, the current line |
| `error-300` / `error-400` | Errors and deletions |
| `deco-*`, `debug-200`/`300`, `promo-400` | Syntax variety (numbers, attributes, types, tags, regexes) and the terminal's ANSI colors |

## Extended steps

The export defines only some steps for most families. For example, `highlight` defines `50`–`200`
and `accent` defines `200`–`400`. Every other step comes through as `#000000`. `scripts/palette.mjs`
fills those gaps in OKLCH:

- **Steps the export defines** are kept exactly.
- **Lightness** follows the average curve of the fully defined families (`card`, `promo`, `notice`).
  It's shifted by however far the family's own defined steps sit from that curve, and the shift
  fades out toward `50` and `950`.
- **Hue** comes from the nearest defined step.
- **Chroma** follows the same families' chroma curve, scaled from the nearest defined step and capped
  at the family's highest defined chroma. Where a color falls outside sRGB, its chroma is reduced
  until it fits.

## Updating

- **New palette export:** copy starforge-quasar's `src/palette/tokens.json` over `src/tokens.json`,
  then run `npm run build`.
- **Theme change:** edit `src/quasar-color-theme.jsonc`, then run `npm run build`.
- **Commit `themes/` too:** VS Code reads the compiled file, not the source.

## Try it locally

1. Open this folder in VS Code and press F5.
2. In the window that opens, pick **Preferences: Color Theme → Quasar**.

To install it permanently, run `npx @vscode/vsce package`, then use **Extensions: Install from VSIX…**.
