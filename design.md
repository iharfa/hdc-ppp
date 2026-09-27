# Design — HDC Public Participation Portal

A locked design system for this app. Every page reads `src/styles/tokens.css`
and `src/styles/global.css`; extend or amend those (and this file) rather than
adding one-off values in components.

## Genre
modern-minimal. Civic instrument panel: white paper, one green accent, sans throughout.

## Macrostructure family
- App pages: Map/Diagram (map home), Workbench (admin), Stat-Led (results dashboard)
- Catalogue pages: Catalogue (participation records, result cards)
- Content pages: Long Document (about, record detail, survey)

## Theme
- `--color-paper`   oklch(99.2% 0.003 150)
- `--color-paper-2` oklch(97.4% 0.005 150)
- `--color-ink`     oklch(21% 0.012 160)
- `--color-ink-2`   oklch(46% 0.015 160)
- `--color-rule`    oklch(90% 0.007 150)
- `--color-accent`  oklch(57% 0.16 152)  (HDC green, ≈ #0f8f46)
- `--color-focus`   oklch(52% 0.16 152)

Status colours (ongoing amber, completed green, planned blue, review orange,
closed grey) are semantic tokens and always ship with a text label.

## Typography
- Display: Geist 600, roman, tracking -0.025em
- Body: Geist 400
- Mono: Geist Mono 400, used only for IDs (`.alias-tag`)
- Scale anchor: `--text-display` = clamp(1.75rem, 1.2rem + 1.6vw, 2.5rem)

## Spacing
4-point named scale in `tokens.css`. Use `var(--space-*)`, never raw values.

## Motion
- `--ease-out` cubic-bezier(0.16, 1, 0.3, 1), `--dur-short` 160ms
- Colour/border transitions only. No scroll reveals, no hover lifts.
- Reduced-motion: transitions collapse to ~0.

## Microinteractions stance
- Silent success (survey confirmation is a page state, not a toast).
- Focus ring 2px accent, instant.
- Selected list rows use the accent tint, no side stripe.

## CTA voice
- Primary: pill, accent fill, white text (`.btn-primary`).
- Secondary: pill, hairline border, paper fill (`.btn`).
- Tertiary/dark: pill, ink fill (`.btn-blue`, kept for "view results").

## What pages MUST share
- Header N9 (wordmark left, edge-aligned links with drawn active underline).
- Footer Ft2 inline single line.
- Accent used only for CTA fill, active underline, focus, selected tint, completed status.
- No eyebrows, no gradients, no card shadows, no side-stripe cards, no emoji icons.

## What pages MAY differ on
- Macrostructure within the family above.
- Full-bleed map layout on the home route (`.shell-fixed`).
