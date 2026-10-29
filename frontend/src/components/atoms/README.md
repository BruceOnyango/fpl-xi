# Atoms

## Purpose

The smallest usable UI units: buttons, badges, pills and numbers. Every other tier is built from these.

## Scope / responsibilities

- Owns: pure, prop-driven primitives with token-only styling.
- Does NOT own: data fetching, routing or app state (never `useQuery` or `useNavigate` here), and formatting logic (that's `lib/format`).

## Structure

- `Button.tsx`: `variant` primary/secondary/ghost/danger, `size` sm/md/icon, and `asChild` (Radix Slot) for router links.
- `Badge.tsx`: small uppercase label in 7 tones.
- `Card.tsx`: `Card` surface plus `CardHeader` (title/description/actions slots, h2/h3) and `CardBody`.
- `PositionPill.tsx`: GK/DEF/MID/FWD as an `<abbr>` with the full name in `title`.
- `PriceTag.tsx`: "£7.5m" with an sr-only "Price" prefix.
- `FormDot.tsx`: form tier shown with a dot, a glyph (▲●▼) and the value. Also exports `formTier()`.
- `FdrBadge.tsx`: difficulty 1–5 square that always prints the number. Also exports `fdrFill` classes.
- `Delta.tsx`: signed change with an arrow icon; `invert` flips it for ranks, where lower is better.
- `Stat.tsx`: label + big value + hint, as `<dl>`.
- `Avatar.tsx`: decorative initials (`aria-hidden`).
- `Meter.tsx`: `role="meter"` bar.
- `Input.tsx`, `Spinner.tsx`, `Skeleton.tsx`.
- `index.ts`: the barrel.
- Every atom has `X.stories.tsx` and `X.test.tsx`.

## Data & dependencies

- `lib/format` (price, delta), `lib/fpl/fixtures` (`DIFFICULTY_LABEL`), `lib/utils/cn`.
- Types only from `lib/api/schemas` (`Position`).

## Key decisions & rationale

- **Colour is never the only signal.** FdrBadge prints the number, FormDot adds a glyph and value, Delta adds a sign and arrow (§7).
- `Card` defaults to `<section>`. Pass `aria-labelledby` and a `CardHeader id` so it becomes a named region.
- `Button` defaults to `type="button"`, so a button can't submit a form by accident.

## States

- `Skeleton` is the loading primitive. Size it like the content it replaces, to avoid layout shift.

## How to extend

- **New atom:** if it fetches or knows about routes, it's an organism. Add the component, its story (every variant), its test (behaviour plus `expectNoA11yViolations`), and an export from `index.ts`.
- **New variant:** extend the union type and its class map. Don't add another boolean prop.

## Open questions / TODO

- A `Tooltip` atom on Radix Tooltip. `title` attributes are used today and aren't touch-friendly.
