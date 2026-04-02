# Changelog

All notable changes to Bubbles will be documented in this file.

## [0.2.0.1] - 2026-04-01

### Added
- Integration test infrastructure: `npm run test:integration` runs tests against a real local Supabase instance instead of mocks
- Supabase local dev scripts: `db:start`, `db:stop`, `db:status`, `db:reset` — one-command local DB management via the Supabase CLI
- `supabase/seed.sql` with real test data: 2 users (Alice + Bob), 2 groups (Book Club open, Hiking Crew closed), 4 memberships with fixed UUIDs for predictable assertions
- `.env.test.local.example` — template to copy for local test DB credentials
- Separate Vitest integration config (`vitest.integration.config.ts`) and setup (`src/test/setup-integration.ts`) that bypasses the Supabase mock
- Example integration test showing the connection pattern and seed data queries

## [0.2.0.0] - 2026-04-01

### Added
- Archive groups: group owners can now hide completed or retired groups from their dashboard without deleting them. Archives are fully reversible — unarchive at any time from the group settings page.
- Archived groups section: a collapsible "Archived" section on the dashboard shows all archived groups with a muted style and an "Archived" badge
- Archive/Unarchive buttons in group settings (owner-only — non-owners do not see these controls)
- "Archived" badge on the group detail page when a group has been archived
- `archived_at` column on `contact_groups` with partial indexes for efficient active-group queries
- `archive_contact_group` and `unarchive_contact_group` Supabase RPC functions (owner-only, SECURITY DEFINER)
- `getArchivedGroups` database function — returns only owned groups where `archived_at IS NOT NULL`
- Archived group join protection: share links for archived groups show "Group Not Available" instead of the join form

### Changed
- `getUserGroups` now excludes archived groups from the default dashboard query
- Group settings now resolves archived groups correctly (previously showed "Group not found" for archived groups)

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
