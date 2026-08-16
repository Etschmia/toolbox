# Depot Design System

A warm, calm, data-clear system. Cream canvas with soft mint/peach light, white
cards, emerald accent, stone neutrals, generous rounded corners, one soft shadow.
Light + dark themes. Use it for dashboards, internal tools and web apps.

> **How to use with Claude Code:** keep `tokens.css` and this file in your repo
> (e.g. under `/design`). Import `tokens.css` once globally, then tell Claude to
> "follow the Depot Design System in `design/DESIGN.md` and use the CSS variables
> from `design/tokens.css` — never hard-code colors." Reference both files by path
> (e.g. `@design/tokens.css`) in your prompt.

---

## 1. Foundations

**Always use the CSS variables** from `tokens.css` — never raw hex/oklch values.
Both themes are defined there; toggle with `document.documentElement.dataset.theme = 'dark'`.

### Color roles
- `--background` page canvas · `--card` / `--popover` raised surfaces · `--muted` quiet fills
- `--foreground` text · `--muted-foreground` secondary text
- `--primary` emerald (main actions, active states) · `--secondary` mint · `--accent` peach
- `--success --warning --info --destructive` status
- `--link --link-hover --link-visited` — **use `--link`, not `--primary`, for text links** (readable on cream)
- `--border --input --ring` lines & focus
- `--chart-1…5` data viz · `--code-bg --code-border --syn-*` code & syntax

### Typography
- **Display** → `--font-display` (Bricolage Grotesque), 700–800, tight tracking. Headings only.
- **Body / UI** → `--font-sans` (Schibsted Grotesk), 400–600.
- **Mono** → `--font-mono` (Geist Mono). All numbers, IDs, code. Add `font-variant-numeric: tabular-nums`.
- Scale: display 56 · h1 34 · h2 24 · body 15 · small 13.

### Shape & space
- Radii: `--radius-sm 8` · `--radius 10` · `--radius-lg 16` · `--radius-xl 20` · `--radius-pill 999`.
- **One shadow only:** `--shadow-soft`. Don't invent others.
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32.
- Optional ambient page glow: `background-image: var(--canvas-gradient)`.

---

## 2. Component patterns

Compact, data-dense. Small type, calm surfaces, clear states.

- **Buttons** — height 32 (default), radius 10. Primary = `--primary` bg; also outline
  (`1px --border`), secondary (`--secondary`), ghost (transparent, `--muted` on hover),
  destructive (tinted `--destructive`), link. Sizes 22/26/32/38.
- **Cards** — `--card` bg, `1px --border`, radius 16–20, `--shadow-soft`, padding 22–26.
- **Inputs** — height 38, radius 10, `1px --input`; focus = `--ring` border + 3px ring
  (`color-mix(in oklab, var(--ring) 25%, transparent)`).
- **Toggles/switches** — 42×24 pill track, white knob; on = `--primary`.
- **Tabs** — pill group on `--muted`; active pill = `--card` + `--shadow-soft`.
  Segmented control same pattern.
- **Tables** — header row on `--muted`, uppercase 11px labels; rows split by `1px --border`;
  numeric cells `--font-mono` right-aligned.
- **Badges** — pill, tinted status bg via `color-mix(in oklab, var(--success) 14%, transparent)`
  with matching text color; 7px status dot.
- **Alerts** — tinted bg + matching border, icon left.
- **Dialogs** — overlay `oklch(0.2 0.02 60 / 0.45)` + blur; sheet = `--popover`, radius 20.
- **Tooltips** — `--popover` bg, `1px --border`, radius 9, small arrow.

## 3. Editor & code (for text tools)
- **Formatting toolbar** — 32×32 icon buttons, radius 8, ghost style.
- **Syntax highlighting** — use `--syn-*` tokens; `tokens.css` already maps highlight.js classes.
- **Code surfaces** — `--code-bg` block bg, `--code-border`, `--code-inline-bg` for inline code.
- **Rendered markdown** — apply the `.prose` class (styles in `tokens.css`).

## 4. Do / Don't
- ✅ Every color via `var(--…)`; both themes work automatically.
- ✅ Display font for headings, mono for all numbers, `tabular-nums` on data.
- ✅ One shadow, generous radii, 4-based spacing.
- ✅ Text links use `--link` (never light `--primary` on cream).
- ❌ No new hex colors, no gradients beyond `--canvas-gradient`, no extra shadows.
- ❌ No emoji as UI chrome, no tight/cramped layouts.
