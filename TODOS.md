# TODOS

## Auth / Testing

### P0: Fix pre-existing test failures in auth and member-list

**Priority:** P0
**Status:** Open
**Noticed on branch:** conraddiao/chicago (updated conraddiao/log-group-share-link-visits)
**Date noticed:** 2026-04-01 (updated 2026-04-04)

**What:** 48 pre-existing test failures across 5 test suites (down from 50 on 2026-04-02). Failures are independent of branch changes and include auth mocks, integration tests requiring a local DB, and component tests.

**Why:** These test failures exist in the codebase independent of feature work. They mask real regressions in auth and group member management flows.

**Failing suites (as of 2026-04-04):**
- `src/hooks/__tests__/use-auth.test.ts` (24 failures — AuthProvider wrapper issue)
- `src/lib/__tests__/database.integration.test.ts` (5 failures — requires local Supabase DB)
- `src/components/auth/__tests__/auth-form.test.tsx` (3 failures)
- `src/components/auth/__tests__/phone-verification.test.tsx` (5 failures — phone format mismatch)
- `src/components/auth/__tests__/two-factor-setup.test.tsx` (5 failures)
- `src/components/groups/__tests__/member-list.test.tsx` (5 failures)
- `src/components/auth/__tests__/two-factor-verification.test.tsx` (1 failure)
- `src/components/groups/__tests__/contact-form.test.tsx` (1 failure)

**Previously failing, now fixed (v0.2.4.0):**
- `src/components/groups/__tests__/single-group-dashboard.test.tsx` — 11 tests pass
- `src/components/groups/__tests__/contact-export.test.tsx` — 10 tests pass
- `src/components/groups/__tests__/group-settings.test.tsx` — 6 tests pass
- `src/components/__tests__/app-header.test.tsx` — 5 tests pass
- `src/app/__tests__/page.test.tsx` — 7 tests pass
- `src/app/(app)/dashboard/__tests__/page.test.tsx` — 8 tests pass

**Where to start:** Run `./node_modules/.bin/vitest run src/hooks/__tests__/use-auth.test.ts` and triage the first failure. Check whether these tests were written against a different interface than what's currently exported. Integration tests need `supabase start` running locally.

---

## Completed

