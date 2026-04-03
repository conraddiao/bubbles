# TODOS

## Auth / Testing

### P0: Fix pre-existing test failures in auth and member-list

**Priority:** P0
**Status:** Open
**Noticed on branch:** conraddiao/chicago
**Date noticed:** 2026-04-01

**What:** 33 pre-existing test failures across use-auth, two-factor-setup, member-list, and auth-form test suites — all failing before the vCard iOS changes were introduced.

**Why:** These test failures exist in the codebase independent of the vCard work. They may mask real regressions in auth and group member management flows.

**Failing suites:**
- `src/hooks/__tests__/use-auth.test.tsx`
- `src/components/auth/__tests__/two-factor-setup.test.tsx`
- `src/components/groups/__tests__/member-list.test.tsx`
- `src/components/auth/__tests__/auth-form.test.tsx`

**Where to start:** Run `./node_modules/.bin/vitest run src/hooks/__tests__/use-auth.test.tsx` and triage the first failure. Check whether these tests were written against a different interface than what's currently exported.

---

## Completed

