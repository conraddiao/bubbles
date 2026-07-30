# Graph Report - .  (2026-07-29)

## Corpus Check
- 190 files · ~149,328 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 993 nodes · 1779 edges · 134 communities (82 shown, 52 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth & Onboarding Pages
- Dashboard & Group Detail UI
- Changelog & Feature Concepts
- Contact Export & Member List
- Dev Dependencies & Linting
- App Layout & Route Protection
- SMS/Email Notifications & Auth Callback
- TypeScript Config
- Package Scripts & Metadata
- Phone Input & Country Select
- UI Primitives (Alert/Avatar/Card)
- Command & Dialog Primitives
- shadcn Components Config
- Group Page Client & Feature Flags
- QR Hero & Squircle Background
- Root Layout & Fonts
- App Header & Auth Test Mocks
- SQL: Split-Name Migration Fns (008)
- Sheet Component
- Terms of Service (Legal, Pg 2)
- Group Detail Tests
- SQL: Auth Config & Triggers (004)
- UI Utility Dependencies
- Privacy Policy (Legal, Pg 2)
- Playwright MCP Server
- Auth Form Tests
- SQL: Initial Schema (001)
- DB Migration Script
- SQL: Manual Migration
- SQL: RLS Policies (002)
- Full-Name Cleanup Migration
- Dashboard Tests
- Contact Export Tests
- Group Settings Tests
- OTP Verify & Input
- Consent Onboarding Screen
- SQL: Disable All RLS
- SQL: Fix Missing Tables
- Twilio Event Stream Route
- Contact Form Tests
- SQL: Short Share Codes (017)
- Terms of Service Page (Legal)
- SQL: Apply RLS Production
- Auth Callback Route Tests
- Phone Verification Tests
- Member List Tests
- SQL: Re-enable RLS (005)
- SQL: Archive Group Fns (011)
- Next.js Config
- Privacy Policy Page (Legal)
- Simple Migration Script
- App Favicon & Branding
- SQL: Drop Full-Name Columns
- SQL: Temporarily Disable RLS
- Join Redirect Page
- Messaging Consent Page
- Messaging Disclosure Page
- Messaging Privacy Page
- Messaging Terms Page
- Privacy Page
- Terms Page
- SQL: Group Access Controls (006)
- SQL: SMS Opt-in Default False (012)
- SQL: Share Link Views (014)
- SQL: Phone-Only Signup (019)
- Image Compression Dep
- cmdk Dep
- date-fns Dep
- ESLint Config
- Feature Flags Dep
- Vercel Flags SDK
- Hookform Resolvers Dep
- OTP Input Dep
- lucide-react Dep
- Next.js Dep
- next-themes Dep
- QR Code React Dep
- Radix UI Dep
- Radix Avatar Dep
- Radix Checkbox Dep
- Radix Dialog Dep
- Radix Slot Dep
- Radix Switch Dep
- React Dep
- React DOM Dep
- React Easy Crop Dep
- React Hook Form Dep
- Phone Number Input Dep
- Resend Email Dep
- Sonner Toast Dep
- Supabase CLI Dep
- Supabase SSR Dep
- Supabase JS Dep
- React Query Dep
- React Query Devtools Dep
- Three.js Dep
- Vercel Toolbar Dep
- Zod Dep
- PostCSS Config
- RLS Enable Script
- Database Setup Script
- Embeddable Contact Form

## God Nodes (most connected - your core abstractions)
1. `cn()` - 85 edges
2. `useAuth()` - 37 edges
3. `Button()` - 24 edges
4. `handleDatabaseError()` - 23 edges
5. `scripts` - 21 edges
6. `rpc()` - 16 edges
7. `compilerOptions` - 16 edges
8. `supabase` - 15 edges
9. `customRender()` - 15 edges
10. `Card()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Database Migration Scripts` --semantically_similar_to--> `Full Name to First/Last Name Migration`  [INFERRED] [semantically similar]
  scripts/database-README.md → docs/migration-guide.md
- `Shop-Style Login (Shop Pay)` --semantically_similar_to--> `Hosted Stateful Importable Contact Lists`  [INFERRED] [semantically similar]
  .kiro/specs/shared-contact-groups/requirements.md → docs/prd.md
- `Playwright MCP Server` --conceptually_related_to--> `Shared Contact Groups Platform`  [INFERRED]
  docs/mcp-playwright.md → .kiro/specs/shared-contact-groups/design.md
- `Supabase Database Setup` --conceptually_related_to--> `Supabase Backend`  [INFERRED]
  supabase/README.md → .kiro/specs/shared-contact-groups/design.md
- `Organic Bubble Border-Radius` --conceptually_related_to--> `QrCodeHero Component`  [AMBIGUOUS]
  DESIGN.md → CHANGELOG.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Database Schema (5 Tables)** — kiro_specs_shared_contact_groups_design_profile, kiro_specs_shared_contact_groups_design_contactgroup, kiro_specs_shared_contact_groups_design_groupmembership, kiro_specs_shared_contact_groups_design_notificationevent, kiro_specs_shared_contact_groups_design_smsnotification [EXTRACTED 0.90]
- **Spec-Driven Development (Requirements/Design/Tasks)** — kiro_specs_shared_contact_groups_requirements_requirements, kiro_specs_shared_contact_groups_design_shared_contact_groups, kiro_specs_shared_contact_groups_tasks_implementationplan [EXTRACTED 0.90]
- **Full-Name to First/Last Migration Docs** — docs_migration_guide_migrationguide, docs_quick_fix_quickfix, scripts_database_readme_databasemigration, docs_migration_guide_nameutils [INFERRED 0.85]

## Communities (134 total, 52 thin omitted)

### Community 0 - "Auth & Onboarding Pages"
Cohesion: 0.07
Nodes (56): PasswordFormData, passwordSchema, CheckEmailPageProps, JoinPageProps, Step, OnboardingPhonePage(), AuthFormProps, AvatarCropDialog() (+48 more)

### Community 1 - "Dashboard & Group Detail UI"
Cohesion: 0.06
Nodes (61): DashboardGroup, DashboardPage(), GroupJoinPage(), ContactForm(), ContactGroupRow, GroupDetail(), GroupDetailProps, GroupMember (+53 more)

### Community 2 - "Changelog & Feature Concepts"
Cohesion: 0.05
Nodes (56): Archive Groups Feature, Bubbles Changelog, Sign in with Google (OAuth PKCE), Public /messaging SMS Disclosure Page, Phone Input E.164 Mask, QrCodeHero Component, Removed Optional 2FA (Phone OTP Only), Resend Email Failure Alerts (+48 more)

### Community 3 - "Contact Export & Member List"
Cohesion: 0.08
Nodes (39): GET(), POST(), ContactExport(), ContactExportProps, GroupMember, GroupMember, MemberList(), MemberListProps (+31 more)

### Community 4 - "Dev Dependencies & Linting"
Cohesion: 0.04
Nodes (47): baseline-browser-mapping, eslint, eslint-config-next, @eslint/eslintrc, jsdom, @modelcontextprotocol/sdk, @next/bundle-analyzer, devDependencies (+39 more)

### Community 5 - "App Layout & Route Protection"
Cohesion: 0.10
Nodes (30): AppLayout(), ProfileSettingsPage(), AuthContent(), OnboardingProfilePage(), VerifyContent(), AuthForm(), ProtectedRoute(), ProtectedRouteProps (+22 more)

### Community 6 - "SMS/Email Notifications & Auth Callback"
Cohesion: 0.10
Nodes (24): escapeHtml(), FAILED_STATUSES, FailedMessageParams, handleMessageFailed(), POST(), TRACKED_STATUSES, updateSmsNotificationStatus(), getResendClient() (+16 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+19 more)

### Community 8 - "Package Scripts & Metadata"
Cohesion: 0.08
Nodes (24): name, private, scripts, build, ci:build, ci:check, db:reset, db:start (+16 more)

### Community 9 - "Phone Input & Country Select"
Cohesion: 0.11
Nodes (14): CommandList(), CountryEntry, CountrySelect(), CountrySelectOptionProps, CountrySelectProps, InputComponent, interpretPhoneInput(), PhoneInputProps (+6 more)

### Community 10 - "UI Primitives (Alert/Avatar/Card)"
Cohesion: 0.18
Nodes (14): Alert(), AlertDescription(), AlertTitle(), alertVariants, Avatar(), AvatarFallback(), AvatarImage(), CardFooter() (+6 more)

### Community 11 - "Command & Dialog Primitives"
Cohesion: 0.13
Nodes (15): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandSeparator(), CommandShortcut() (+7 more)

### Community 12 - "shadcn Components Config"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 13 - "Group Page Client & Feature Flags"
Cohesion: 0.22
Nodes (10): GroupPageClient(), GroupPageClientProps, GroupPage(), GroupPageProps, Home(), GET, mmsOnboarding, showLandingPageCopy (+2 more)

### Community 14 - "QR Hero & Squircle Background"
Cohesion: 0.23
Nodes (11): qrcode, qrcode, QrCodeHeroProps, buildSquircle(), dominantAxisIndex(), easeIn(), easeInOut(), easeOut() (+3 more)

### Community 15 - "Root Layout & Fonts"
Cohesion: 0.18
Nodes (9): fraunces, gabarito, geistMono, metadata, Toaster(), VercelAnalytics(), VercelAnalyticsProps, QueryProvider() (+1 more)

### Community 16 - "App Header & Auth Test Mocks"
Cohesion: 0.20
Nodes (9): mockPush, mockUseAuth, AppHeader(), mockPush, mockSignOut, mockUseAuth, mockAuthActions, mockAuthState (+1 more)

### Community 17 - "SQL: Split-Name Migration Fns (008)"
Cohesion: 0.27
Nodes (9): public.create_contact_group(), public.get_group_members(), public.group_memberships, public.handle_user_delete(), public.join_contact_group(), public.join_contact_group_anonymous(), public.profiles, public.remove_group_member() (+1 more)

### Community 18 - "Sheet Component"
Cohesion: 0.18
Nodes (6): SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle()

### Community 19 - "Terms of Service (Legal, Pg 2)"
Cohesion: 0.22
Nodes (10): Bubbles (Service/Brand), Changes to Terms Section (12), Contact Section (14) - hello@bubbles.fyi, Contact Sharing Section (7), Disclaimers Section (9), Governing Law Section (13) - California, Intellectual Property Section (8), Limitation of Liability Section (10) (+2 more)

### Community 20 - "Group Detail Tests"
Cohesion: 0.20
Nodes (8): mockFrom, mockGetGroupMembers, mockGetUser, mockGroup, mockLeaveGroup, mockMembers, mockPush, mockSingle

### Community 21 - "SQL: Auth Config & Triggers (004)"
Cohesion: 0.24
Nodes (6): group_stats, handle_new_user(), handle_user_delete(), on_auth_user_created, on_auth_user_deleted, profiles

### Community 22 - "UI Utility Dependencies"
Cohesion: 0.22
Nodes (9): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, tailwind-merge, twilio, tailwind-merge (+1 more)

### Community 23 - "Privacy Policy (Legal, Pg 2)"
Cohesion: 0.22
Nodes (9): Section 9: Changes to This Policy, Section 8: Children's Privacy (under 13), Section 10: Contact Us (hello@bubbles.fyi), Section 6: Data Retention & Deletion (30 days), Parchment Design System (serif headings, sienna accent), Bubbles Privacy Policy Page 2 (Sections 5-10), Section 7: Security (TLS/HTTPS), Service Providers (Supabase, Twilio for SMS) (+1 more)

### Community 24 - "Playwright MCP Server"
Cohesion: 0.31
Nodes (7): activeBrowserOptions, browserMap, closeBrowser(), ensureBrowser(), ensurePage(), server, shutdown()

### Community 25 - "Auth Form Tests"
Cohesion: 0.33
Nodes (5): mockUseAuth, mockUseAuth, mockCreateContactGroup, AllTheProviders(), customRender()

### Community 26 - "SQL: Initial Schema (001)"
Cohesion: 0.42
Nodes (8): contact_groups, group_memberships, notification_events, profiles, sms_notifications, update_contact_groups_updated_at, update_profiles_updated_at, update_updated_at_column()

### Community 27 - "DB Migration Script"
Cohesion: 0.25
Nodes (5): args, { createClient }, fs, path, supabase

### Community 28 - "SQL: Manual Migration"
Cohesion: 0.46
Nodes (7): contact_groups, group_memberships, handle_new_user(), notification_events, on_auth_user_created, profiles, sms_notifications

### Community 29 - "SQL: RLS Policies (002)"
Cohesion: 0.32
Nodes (7): contact_groups, group_memberships, is_group_member(), is_group_owner(), notification_events, profiles, sms_notifications

### Community 31 - "Full-Name Cleanup Migration"
Cohesion: 0.38
Nodes (6): { createClient }, dropFullNameColumns(), main(), IMPORTANT: Only run this AFTER confirming:, supabase, verifyMigration()

### Community 32 - "Dashboard Tests"
Cohesion: 0.29
Nodes (6): mockCreateContactGroup, mockGetArchivedGroups, mockGetUserGroups, mockGroups, mockPush, mockUseAuth

### Community 34 - "Group Settings Tests"
Cohesion: 0.29
Nodes (5): mockActiveGroup, mockArchiveContactGroup, mockArchivedGroup, mockGetGroupMembers, mockUnarchiveContactGroup

### Community 35 - "OTP Verify & Input"
Cohesion: 0.48
Nodes (5): OTPVerifyFormProps, InputOTP(), InputOTPGroup(), InputOTPSeparator(), InputOTPSlot()

### Community 36 - "Consent Onboarding Screen"
Cohesion: 0.47
Nodes (6): Continue With Phone Button (Burnt Sienna CTA), Phone Number Input With Country Selector, Privacy Policy Link, Bubbles Phone Sign-Up / Consent Onboarding Screen, SMS/MMS Consent Disclosure Text, Terms of Service Link

### Community 37 - "SQL: Disable All RLS"
Cohesion: 0.33
Nodes (5): contact_groups, group_memberships, notification_events, profiles, sms_notifications

### Community 38 - "SQL: Fix Missing Tables"
Cohesion: 0.53
Nodes (4): contact_groups, group_memberships, notification_events, sms_notifications

### Community 39 - "Twilio Event Stream Route"
Cohesion: 0.47
Nodes (5): CloudEvent, fetchMessageBody(), handleEvent(), MessageStatusData, POST()

### Community 40 - "Contact Form Tests"
Cohesion: 0.33
Nodes (5): mockGetGroupByToken, mockGetUserProfile, mockJoinContactGroup, mockJoinContactGroupAnonymous, mockUseAuth

### Community 41 - "SQL: Short Share Codes (017)"
Cohesion: 0.40
Nodes (3): ensure_short_share_code(), public.contact_groups, trg_contact_groups_share_code

### Community 42 - "Terms of Service Page (Legal)"
Cohesion: 0.40
Nodes (5): Parchment/Fraunces/Sienna Design System Styling, Bubbles Service Description (QR Contact-Group Platform), SMS/MMS Consent & Messaging Terms Section, STOP/HELP Opt-Out Keywords & hello@bubbles.fyi Contact, Terms of Service Page (Bubbles Legal)

### Community 43 - "SQL: Apply RLS Production"
Cohesion: 0.40
Nodes (3): contact_groups, group_memberships, profiles

### Community 44 - "Auth Callback Route Tests"
Cohesion: 0.40
Nodes (4): mockExchangeCodeForSession, mockGetSession, mockOnAuthStateChange, mockRouterReplace

### Community 45 - "Phone Verification Tests"
Cohesion: 0.50
Nodes (4): PhoneVerification(), createMockAuthWithState(), mockUseAuth, createMockUseAuth()

### Community 46 - "Member List Tests"
Cohesion: 0.40
Nodes (3): mockGetGroupMembers, mockMembers, mockRemoveGroupMember

### Community 47 - "SQL: Re-enable RLS (005)"
Cohesion: 0.40
Nodes (3): contact_groups, group_memberships, profiles

### Community 48 - "SQL: Archive Group Fns (011)"
Cohesion: 0.60
Nodes (3): archive_contact_group(), contact_groups, unarchive_contact_group()

### Community 49 - "Next.js Config"
Cohesion: 0.50
Nodes (3): nextConfig, withBundleAnalyzer, withVercelToolbar

### Community 50 - "Privacy Policy Page (Legal)"
Cohesion: 0.50
Nodes (4): Information We Collect Section, Parchment Serif Legal Page Design, Bubbles Privacy Policy Page, SMS/MMS Messaging Consent Section

### Community 53 - "App Favicon & Branding"
Cohesion: 0.50
Nodes (4): Bubbles App Favicon (icon.svg), Fraunces Serif Typeface (inferred glyph source), Burnt Sienna Serif Letter 'b' Glyph (#E8622A), Rounded Parchment Background Tile (#F6EFE5, rx=14)

## Ambiguous Edges - Review These
- `QrCodeHero Component` → `Organic Bubble Border-Radius`  [AMBIGUOUS]
  DESIGN.md · relation: conceptually_related_to
- `Phone Input E.164 Mask` → `name-utils.ts Name Handling`  [AMBIGUOUS]
  CHANGELOG.md · relation: conceptually_related_to

## Knowledge Gaps
- **332 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+327 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `QrCodeHero Component` and `Organic Bubble Border-Radius`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Phone Input E.164 Mask` and `name-utils.ts Name Handling`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `UI Utility Dependencies` to `Package Scripts & Metadata`, `QR Hero & Squircle Background`, `Image Compression Dep`, `cmdk Dep`, `date-fns Dep`, `Feature Flags Dep`, `Vercel Flags SDK`, `Hookform Resolvers Dep`, `OTP Input Dep`, `lucide-react Dep`, `Next.js Dep`, `next-themes Dep`, `QR Code React Dep`, `Radix UI Dep`, `Radix Avatar Dep`, `Radix Checkbox Dep`, `Radix Dialog Dep`, `Radix Slot Dep`, `Radix Switch Dep`, `React Dep`, `React DOM Dep`, `React Easy Crop Dep`, `React Hook Form Dep`, `Phone Number Input Dep`, `Resend Email Dep`, `Sonner Toast Dep`, `Supabase CLI Dep`, `Supabase SSR Dep`, `Supabase JS Dep`, `React Query Dep`, `React Query Devtools Dep`, `Three.js Dep`, `Vercel Toolbar Dep`, `Zod Dep`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `InputOTPSlot()` connect `OTP Verify & Input` to `React Dep`, `UI Primitives (Alert/Avatar/Card)`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `react` connect `React Dep` to `OTP Verify & Input`, `UI Utility Dependencies`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useAuth()` (e.g. with `dashboard/__tests__/page.test.tsx` and `app/__tests__/page.test.tsx`) actually correct?**
  _`useAuth()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _332 weakly-connected nodes found - possible documentation gaps or missing edges._