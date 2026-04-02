# Changelog

All notable changes to Bubbles will be documented in this file.

## [0.1.2.1] - 2026-04-01

### Fixed
- iOS vCard export: tap "Share to Contacts" now opens the share sheet once and stops — dismissing it no longer triggers a second Safari contact preview popup
- AbortError from `navigator.share()` is now handled correctly: user dismissal is treated as intentional, not a failure

### Added
- Two iOS-specific export buttons per contact and for bulk export: "Add to Contacts" (direct Safari preview via data URI) and "Share to Contacts" (native share sheet → pick Contacts app)
- Full test suite for `ContactExport`: vCard generation, blob download, data URI path, share sheet path (including AbortError and canShare fallback), and iOS/desktop UI rendering

## [0.1.2.0] - 2026-04-01

### Added
- Sign in with Google: one-click OAuth via Supabase PKCE flow
- Server-side OAuth callback route using `@supabase/ssr` for secure token exchange
- "Continue with Google" button with Google logo on sign-in and sign-up pages
- Full test coverage for Google OAuth flow (callback route, hook, and UI tests)

## [0.1.1.0] - 2026-03-31

### Added
- Motion system: spring entrance animations for new members, fade-up page transitions, press feedback on group cards
- Real-time join notifications: toast with member name + spring animation when someone joins a group you're viewing
- Landing page brand copy: use-case descriptions, personality-rich tagline, Gabarito footer label
- Unit tests for AppHeader, Dashboard, Landing page, and SingleGroupDashboard (29 new tests)
- `prefers-reduced-motion` support for all new animations

### Changed
- Dashboard restructured: utility-first layout with inline join input, full groups list as primary content
- Route split: authenticated routes moved to `(app)/` group with shared AppHeader and auth guard
- All colors consolidated to DESIGN.md tokens — no more Tailwind blue/green/slate classes
- Muted text darkened from `#9C8E82` to `#7A6E63` for WCAG AA contrast compliance (4.6:1)
- Gradient backgrounds replaced with warm parchment `bg-background`

### Fixed
- Notification enabled indicators used off-palette `text-green-600` — now use semantic success color `#065F46`
- Icon-only buttons missing aria-labels (share link, remove member)
- Decorative icons missing `aria-hidden` (Mail, Phone icons in member list)
- Pre-existing build error: `fetchGroupByShareToken` undefined in `database.ts:543`

## [0.1.0.0] - 2026-03-30

### Added
- Design system (DESIGN.md): warm parchment aesthetic, Fraunces/Geist Sans/Gabarito typography, burnt sienna accent color, organic blob border-radius for contact cards
- Agent instructions (CLAUDE.md): design system rules for AI agents plus skill routing for gstack workflows
