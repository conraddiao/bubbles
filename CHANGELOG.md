# Changelog

All notable changes to Bubbles will be documented in this file.

## [0.2.4.0] - 2026-04-04

### Changed
- Group pages now route by share_token instead of UUID, producing cleaner URLs (`/groups/abc...` instead of `/groups/550e8400-...`)
- New groups generate lowercase a-z share tokens (32 characters) instead of hex UUIDs
- Share link view logging now captures referrer URL and UTM parameters (source, medium, campaign)

### Added
- Share link analytics section on group page (owner-only): total views, member conversion rate, 30-day sparkline chart, and top traffic sources
- `get_share_link_analytics` database function for aggregated share link metrics

## [0.2.3.2] - 2026-04-03

### Fixed
- Horizontal rubber-band overscroll on iOS Safari is now blocked at all levels: `overscroll-behavior-x: none` added to `:root` and `html` (was previously only on `body`)
- Header converted from `position: sticky` to `position: fixed` so it is completely outside the scroll stack and immune to iOS bounce/movement during overscroll

## [0.2.3.1] - 2026-04-04

### Added
- Share link visits are now logged to the database when someone navigates to a group's `/join/[token]` page via a share link or QR code. Each view records the group, timestamp, and viewer ID (null for anonymous visitors). Group owners can query `share_link_views` for time-series analytics on their link traffic.

## [0.2.3.0] - 2026-04-03

### Changed
- Sticky header now has a background so it stays readable when scrolling over the orange QR hero
- Share button on the group QR hero now matches the Copy Link style (same border, no fill) and uses the iOS-style share icon
- Export Contacts section removed — redundant with the member list; Text Me button and export dropdown moved to the Group Members header
- Group member cards simplified: contact info shows as icons only (no email/phone text), joined timestamp and notification status removed
- Desktop member table: Notifications and Joined columns removed, contact column shows icons only
- `overscroll-behavior-x: none` on body to prevent horizontal overscroll bounce on mobile

## [0.2.2.0] - 2026-04-03

### Added
- Export options dropdown on the "Export Contacts" header — "Text Me" is the primary action; "Export All" (desktop) or "Add All / Share All" (iOS) are tucked into a split-button dropdown
- Pencil icon button in the top-right of the group QR hero for quick access to group settings (removes the need for a separate header bar)

### Changed
- App header is now sticky on all authenticated pages — stays visible while scrolling
- "Bubbles" wordmark is centered on mobile; a back arrow replaces it on the left for non-dashboard pages so you can always get home without hunting for a link
- Group page no longer shows a redundant subheader bar — the QR hero carries the group name and the pencil opens settings
- "New Group" on the dashboard instantly creates a group named "{First Name}'s Group" and drops you straight onto its QR page
- Dashboard is simplified: removed the "Shared Contact Groups" section label, the welcome greeting, and the join-by-invite-code form; "New Group" is now full-width and taller
- Export Contacts header no longer shows the vCard subtitle or the "About vCard Export" info block

## [0.2.1.4] - 2026-04-03

### Fixed
- Google OAuth callback now handled client-side, fixing sign-in loop where users were redirected to `/auth?error=auth` despite successful authentication

## [0.2.1.3] - 2026-04-03

### Changed
- Owners can no longer leave their own group — the Leave group button is hidden for group owners
- Archive group is now available to all members (not just owners) from the group settings drawer (kebab menu)

## [0.2.1.2] - 2026-04-03

### Fixed
- Google OAuth login now correctly captures first and last name from Google's `given_name`/`family_name` metadata fields (previously stored empty strings because the code looked for `first_name`/`last_name` which Google doesn't provide)
- Google OAuth login now correctly captures the user's avatar from Google's `picture` field
- New Google users with incomplete profiles are now redirected to profile setup instead of landing on the dashboard with empty names

## [0.2.1.1] - 2026-04-02

### Fixed
- Updated contact email on `/terms` and `/privacy` pages from `hello@usebubbles.app` to `hello@bubbles.fyi`

## [0.2.1.0] - 2026-04-02

### Added
- Privacy Policy page (`/privacy`) covering data collection, SMS/MMS consent, opt-out instructions (STOP/HELP), data sharing policy, and deletion rights — required for Toll Free number registration
- Terms of Service page (`/terms`) with SMS consent language, message frequency disclosure, acceptable use, and governing law — required for carrier compliance
- Legal page links (Privacy Policy, Terms of Service) in the landing page footer

## [0.2.0.2] - 2026-04-02

### Added
- A2P MMS vCard delivery: "Text Me" button sends group contacts to any phone number via Twilio MMS — on iOS, tapping the attachment opens the native "Add Contacts" UI
- Server-side `.vcf` endpoint (`/api/groups/[groupId]/contacts.vcf`) with proper `Content-Type: text/x-vcard` headers
- SMS send endpoint (`/api/sms/send-contacts`) for Twilio MMS integration
- Two iOS-specific export buttons per contact and for bulk export: "Add to Contacts" (direct Safari preview via data URI) and "Share to Contacts" (native share sheet → pick Contacts app)
- Full test suite for `ContactExport`: vCard generation, blob download, data URI path, share sheet path (including AbortError and canShare fallback), and iOS/desktop UI rendering

### Fixed
- iOS vCard export: tap "Share to Contacts" now opens the share sheet once and stops — dismissing it no longer triggers a second Safari contact preview popup
- AbortError from `navigator.share()` is now handled correctly: user dismissal is treated as intentional, not a failure

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

## [0.1.3.0] - 2026-04-02

### Changed
- Group page rebuilt around the 75/23/2 job-to-be-done split: QR code is now the dominant full-bleed hero, members are below the fold, admin is hidden behind a `···` overflow menu
- QR code shows the group's join link in real time — point your phone at it and scan; no hunting for a "Share" button
- Live member count in the QR hero ticks up as people scan and join
- Group settings (name, description, access control, close group, leave) moved into a bottom-sheet drawer; non-owners see only "Leave group"
- Removed duplicate Share/Copy buttons that competed for attention with the QR code

### Added
- `qrcode.react` for SVG-based QR rendering (retina-sharp, no canvas required)
- `QrCodeHero` component: full-bleed `#E8622A` hero, Fraunces group name, live count, pill action buttons
- `GroupSettingsDrawer` component: Radix Dialog bottom sheet with owner/non-owner adaptive content

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
