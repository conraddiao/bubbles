# Design System — Bubbles

## Product Context
- **What this is:** A mobile-first web app for collecting and sharing contacts at small social gatherings — weddings, parties, park hangs. Quick workflow: create a group, flash a QR code, everyone joins and shares their contact.
- **Who it's for:** Individuals hosting or attending casual social events who want a frictionless way to exchange contact info as a group.
- **Space/industry:** Social / consumer / event tech. Peers: Partiful, Luma, Apple AirDrop, Linktree.
- **Project type:** Mobile-first web app

## Aesthetic Direction
- **Direction:** Organic Warmth / Social Artifact
- **Decoration level:** Intentional — warm textures and parchment tones do the work; no decorative blobs or gradients
- **Mood:** Like a beautiful party invitation or a polaroid that turned out better than expected. Personal and warm, not enterprise-clean. The app should feel like it was made by people, for people — not like a CRM.
- **Key rule:** No blue anywhere. Blue signals enterprise and cold utility. Bubbles signals warmth and human connection.

## Typography

- **Display/Hero:** [Fraunces](https://fonts.google.com/specimen/Fraunces) — Variable optical-size serif. High contrast, emotional, personal. Used for group names, page titles, hero headings.
- **Body/UI:** Geist Sans — Clean and readable. For all body text, descriptions, settings, contact metadata.
- **Labels/Names:** [Gabarito](https://fonts.google.com/specimen/Gabarito) — Rounded, friendly, like handwriting's cooler cousin. For names, badges, labels, small UI moments, uppercase eyebrow text.
- **Data/Tables:** Geist Sans with `font-variant-numeric: tabular-nums` for contact lists and counts.
- **Code/Metadata:** Geist Mono — For share tokens, phone numbers, timestamps.
- **Loading:** Google Fonts CDN for Fraunces and Gabarito. Geist loaded via `next/font/google` or local.
- **Scale:**
  - `xs`: 11px / 1.4
  - `sm`: 13px / 1.5
  - `base`: 15px / 1.6
  - `lg`: 18px / 1.5
  - `xl`: 22px / 1.3
  - `2xl`: 28px / 1.2
  - `3xl`: 36px / 1.1
  - `4xl`: 48px / 1.0
  - `hero`: clamp(48px, 10vw, 80px) / 0.95

## Color

- **Approach:** Restrained — one warm sienna accent plus warm neutrals. Color is rare and meaningful.
- **Background:** `#F6EFE5` — Warm parchment. Not white. Never pure white.
- **Surface:** `#FEFAF4` — Cream card/sheet layer. Slight warm lift above background.
- **Surface 2:** `#F0E8D9` — Deeper warm for hover states, sidebar, secondary surfaces.
- **Primary text:** `#1C1713` — Near-black with warmth baked in. Not neutral gray-black.
- **Muted text:** `#9C8E82` — Warm pencil gray. Reads like text in a notebook.
- **Accent:** `#E8622A` — Burnt sienna / persimmon. Confident, alive, zero enterprise. Primary interactive color.
- **Accent light:** `#F5C4AB` — For badge backgrounds, avatar fills, light accent areas.
- **Accent dark:** `#B84A1A` — Hover/pressed state for accent.
- **Border:** `#E0D5C5` — Warm tan. All borders, dividers, outlines.
- **Destructive:** `#C53030` — For delete actions, error states.
- **Semantic:**
  - Success: `#D1FAE5` bg / `#065F46` text
  - Warning: `#FEF3C7` bg / `#92400E` text
  - Error: `#FEE2E2` bg / `#991B1B` text
  - Info: `#F0E8D9` bg / `#1C1713` text (use warm surface, not blue)
- **Dark mode:** Invert surfaces (bg: `#1A1410`, surface: `#231C16`, surface-2: `#2E2319`, border: `#3A2E22`). Accent stays the same. Reduce text contrast slightly — warm near-white (`#F6EFE5`) on dark.

## CSS Custom Properties

```css
:root {
  --bg: #F6EFE5;
  --surface: #FEFAF4;
  --surface-2: #F0E8D9;
  --text-primary: #1C1713;
  --text-muted: #9C8E82;
  --accent: #E8622A;
  --accent-light: #F5C4AB;
  --accent-dark: #B84A1A;
  --destructive: #C53030;
  --border: #E0D5C5;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 9999px;
  /* Organic bubble shape for contact cards — matches the brand name */
  --radius-bubble: 60% 40% 55% 45% / 50% 60% 40% 55%;
}
```

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable (not compact, not airy — this is a mobile app used quickly)
- **Mobile max-width:** 480px centered, full-bleed backgrounds
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Page padding:** 16px horizontal on mobile, 24px on tablet+

## Layout

- **Approach:** Grid-disciplined, mobile-first
- **Grid:** 1 column mobile / 2 column tablet / max 3 column desktop (rarely needed)
- **Max content width:** 480px for app screens, 1100px for landing/marketing
- **Border radius:**
  - `sm`: 6px — inputs, small chips
  - `md`: 12px — cards, buttons, modals
  - `lg`: 16px — group cards, larger surfaces
  - `pill`: 9999px — badges, avatars, FABs, tag chips
  - `bubble`: organic `60% 40% 55% 45% / 50% 60% 40% 55%` — contact member cards (literal bubbles)
- **The QR sharing screen** is full-bleed accent color with the user's name large in Fraunces above the QR code. It's a moment, not a utility screen.

## Motion

- **Approach:** Intentional — animations aid comprehension and add personality without being decorative
- **Easing:** enter(`ease-out`) exit(`ease-in`) move(`ease-in-out`) spring(`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **Key moments:**
  - Contact joins group: spring entrance animation (bubble scale up + fade in)
  - QR screen open: slide up, radial pulse rings on the accent background
  - Group card tap: scale 0.97 on press, release
  - Page transitions: fade + slight upward translate (150ms ease-out)

## Anti-Patterns (never use)

- Purple or violet gradients as accent
- Cold blue (#3B82F6, #6366F1, etc.) anywhere — not for links, not for borders, not for anything
- 3-column feature grid with icons in colored circles
- Generic gradient hero sections
- Centered everything with uniform spacing
- Stock-photo-style imagery
- Plain white (`#FFFFFF`) backgrounds — always use warm parchment

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Initial design system created | Created by /design-consultation based on product context + Codex + Claude subagent outside voices |
| 2026-03-29 | Burnt sienna accent, no blue | Every contact app uses blue for "trust." Bubbles targets casual social gatherings — warm sienna reads as human and personal, not corporate. |
| 2026-03-29 | Fraunces for display | Both Codex and Claude subagent independently proposed Fraunces. Strong consensus. Emotional, high-contrast, used by cool indie products. |
| 2026-03-29 | Organic bubble border-radius for contact cards | Matches the brand name literally. Visual personality without complexity. |
| 2026-03-29 | Warm parchment (#F6EFE5) background, not white | Pure white reads clinical. Parchment is warm and personal — matches the party invitation aesthetic. |
