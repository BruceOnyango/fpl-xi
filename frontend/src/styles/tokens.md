# Design tokens

## Purpose

The single vocabulary for colour, space, type, radius, elevation and layering. Components never contain raw values; they use these tokens (PROMPT.md §5).

## Scope / responsibilities

- Owns: `tokens.css` (CSS custom properties, light + dark) and the Tailwind mapping in `index.css` (`@theme inline`).
- Does NOT own: component styling decisions (those live in each component), and chart series colours (they reference these tokens via `var()`).

## Structure

- `tokens.css`: every token. `:root` holds the light values, and dark values are redefined twice: under `@media (prefers-color-scheme: dark)` (guarded by `:not([data-theme='light'])`) and under `[data-theme='dark']`.
- `index.css`: imports Tailwind, maps tokens to utilities (`bg-surface`, `text-muted`, `bg-fdr-4`…), and holds base styles (focus ring, reduced motion).
- `tokens.md`: this guide.

## Data & dependencies

- `SettingsProvider` (`lib/settings`) sets `<html data-theme>` from the user's choice (System / Light / Dark).

## Key decisions & rationale

- **`@theme inline`** keeps `var()` references in utilities, so switching themes is a single attribute change with no rebuild.
- **Dark mode is fully specified, not inverted.** Every semantic colour has an explicit dark value.
- **The light accent is `#117a44`.** The brighter `#19a35b` failed AA with white button text (3.1:1), and Playwright's axe sweep caught it.
- **FDR steps carry their own foreground** (`--fdr-N-fg`), so the printed difficulty number always passes 4.5:1.
- **Position colours share one foreground** (`--pos-fg`, near-black). All four position hues are light enough for it.

### Colour tokens — when to use which

| Token                                    | Use for                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `--bg`                                   | page background only                                                         |
| `--surface` / `-2` / `-3`                | card / inset or hover / skeleton, track, avatar                              |
| `--border`                               | all hairlines and dividers                                                   |
| `--text` / `--muted` / `--subtle`        | primary text / secondary text (≥4.5:1) / placeholders and decorative only    |
| `--accent` (+`-strong`, `-contrast`)     | primary action fill / hover / text on accent                                 |
| `--accent-text`                          | accent used as text on a surface (passes AA where `--accent` might not)      |
| `--accent-soft`                          | active nav, highlighted rows, accent badges                                  |
| `--secondary` (+`-soft`, `-text`)        | prediction ranges, "mock" labels, focus-adjacent emphasis                    |
| `--positive` / `--negative` (+`-soft`)   | good/bad deltas, legality, injuries. **Always paired with an icon or sign.** |
| `--warning` / `--info` (+`-soft`)        | aging data, doubtful players / the injury-news nudge                         |
| `--focus-ring`                           | `:focus-visible` outline (global)                                            |
| `--pitch-1`, `--pitch-2`, `--pitch-line` | the SquadPitch stripes and markings                                          |
| `--fdr-1 … --fdr-5` (+`-fg`)             | fixture difficulty: dark green, green, grey, red, dark red                   |
| `--pos-gk/def/mid/fwd`, `--pos-fg`       | position pills and pitch shirts                                              |

### Non-colour tokens

- `--space-*`: 4px grid (Tailwind spacing is used in practice; both resolve to the same scale).
- `--radius-sm/md/lg/xl/full`: inputs and badges / buttons / small cards / cards / pills.
- `--font-sans` (Inter, body), `--font-display` (Barlow Condensed, headings and big numbers), `--font-size-2xs…3xl`.
- `--shadow-sm/md/lg`: card / floating / modal.
- `--z-*`: `sticky 10`, `nav 20`, `overlay 40`, `modal 50`, `toast 60`.

## States

Not applicable.

## How to extend

- **New semantic colour:** add it to `:root` and to _both_ dark blocks, map it in `index.css`, document it here, then check contrast in both themes (`npm run e2e` runs axe colour-contrast).
- **Retheming:** change values here only. No component should need to change.

## Open questions / TODO

- The two dark blocks are duplicated by necessity (pure CSS has no mixins). Keep them in sync, or generate them from one source later.
