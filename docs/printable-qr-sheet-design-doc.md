# Printable QR Sheet Design Doc

## Problem

- Hosts must verbally explain the join flow to every Guest; the QR lives only on the Host's phone screen.
- Today: Host opens the group → holds up phone → Guest scans → Host repeats for the next person. One phone, one QR, a line forms.
- A phone screen dims, locks, can't sit on a table, and can't be handed around a wedding, party, or park hang.
- Evidence: product core loop — "create a group, flash a QR code, everyone joins" (DESIGN.md). `[inferred: no in-repo ticket/support refs available to cite]`
- Cost of inaction: friction at the exact moment of virality (group formation); Guests who wander off never join.

## Bet

If we give Hosts a self-explanatory printable sheet with the group's join QR, Hosts will set it on a table instead of explaining the flow to each Guest, because a printed sign scans the same for everyone without the Host present.

## Scope

**In**
- Scope 1 — Printable join sheet (P0, unblocks unattended joining)
  - Host-only "Print sign" action on the group page, beside the existing Copy link / Share actions
  - Dedicated print-optimized route `/group/[token]/print`
  - Renders: group name (Fraunces), the flat join QR (reuse `qrcode.react`), one-line instruction, and the join URL as text fallback (Geist Mono)
  - Print stylesheet (`@page` + `@media print`) → browser Print / Save-as-PDF; no server-side PDF library
- Scope 2 — Sheet formats (P1, unblocks table placement)
  - Full-page sign (default) and a fold-in-half table tent

**Out**
- Server-side PDF rendering / a pre-baked downloadable PDF — browser print covers MVP
- Mailing or fulfilling physical prints
- Custom branding / logo upload on the sheet

**Cut**
- Batch-print multiple groups on one run — deferred, single-group first
- Editable instruction copy — deferred, ship one good default
- Print-origin scan analytics beyond a single source tag — deferred to metrics work

## Recommendation

- Wireframes: [Figma — TBD]
- Host sees: a "Print sign" button beside the existing Copy link / Share actions (`qr-code-hero.tsx`). Tapping opens `/group/[token]/print` in a print-ready layout that can invoke `window.print()`.
- Guest sees: the unchanged join flow — the printed QR points to the same `/group/{token}/join` (optionally `?src=print`, see OQ-1.1).
- Layout: a mostly-light sheet for ink economy, accent `#E8622A` restrained to title / rule / border; the QR stays `#1C1713` on white for scanner contrast (the one deliberate white surface, per DESIGN.md). Copy: "Scan to join {Group Name}" + "Add your contact — everyone shares, everyone gets the list."
- QR: reuse `QRCodeSVG`; raise error correction to `level="H"` for print robustness at distance. `[inferred: live value is level="M" in qr-code-hero.tsx]`
- Print CSS: `@media print` hides app chrome; `print-color-adjust: exact` so the accent survives; `@page` sets sheet size per format.
- Data model: none new for MVP.
- Permissions: Host-only entry point; the print route is readable by share token. `[inferred: Bubbles has no roles sheet — ownership is owner_id === currentUserId]`
- Notifications: none.

## Success Metrics

`[inferred: PRO-429 tiers are OneCrew-specific and do not apply to Bubbles; the tier column is omitted. committed/provisional status retained.]`

| ID | Metric | Target | Status | Owner | Window |
|----|--------|--------|--------|-------|--------|
| SM-1 | % of active groups whose Host opened the print sheet | baseline first | provisional | Conrad | l30d |
| SM-2 | Joins attributed to a printed QR (via `?src=print` bucket) | baseline first | provisional | Conrad | l30d |
| SM-3 | Median members per group, print-sheet groups vs. rest | +uplift | provisional | Conrad | l30d |

## Open Questions

1. Is there an elegant solution to the parchment-vs-printer-ink tension? — Conrad / Design
   On screen Bubbles is warm parchment + full-bleed accent; on paper a full-bleed orange sheet burns ink and `#F6EFE5` renders muddy. A mostly-white sheet with accent on title and border prints clean — does that still read as Bubbles to a Host, or off-brand?
   1. Should the printed QR carry its own `?src=print` tag so scans bucket separately from digital shares (ties into `formatReferrer`'s "Direct / QR"), or reuse the plain join URL? Do these feel distinct to a Host reading analytics? — Eng
   2. Where should the action live — inline next to Copy / Share, or in group settings? — Design
2. Which formats at MVP — full-page sign only, or also the table tent? MVP posture: ship the sign, fast-follow the tent. — Conrad
3. QR error-correction level and minimum module size for reliable scanning at table distance (`M` vs `H`)? — Eng
4. Is the print route public-by-token or Host-only? MVP posture: public-by-token, mirroring the join URL's own reachability. — Eng

## Rollout

- Flag: `showPrintSheet` · Gating: self-serve, shown to Hosts (matches `showQRCard` / `showQRCube` in `src/flags.ts`)
- Pilot: internal + a few active Hosts · GA criteria: prints generated with zero scanner-failure reports over 2 weeks
- Precedent for flag-gated surfaces: the existing QR variants `showQRCard`, `showQRCube`

## Appendix

- Shipped state `[inferred: no in-repo issue tracker; file refs stand in for a Linear cluster]`:
  - QR renderers: `src/components/groups/qr-code-hero.tsx` (flat `qrcode.react`), `src/components/groups/squircle-background.tsx` (3D cube)
  - `shareUrl` construction: `src/components/groups/group-detail.tsx:97`
  - Group page + flag resolution: `src/app/(app)/group/[token]/page.tsx`, `src/flags.ts`
  - Join flow the QR points to: `src/app/group/[token]/join/page.tsx`
  - Analytics source bucketing ("Direct / QR"): `src/components/groups/share-link-analytics.tsx:135`
- Demo-vs-reality gap: no print / PDF functionality exists anywhere in app code — this feature is greenfield.
- Known gap: brand colors are largely hardcoded hex (`bg-[#E8622A]`) rather than the `--accent` / `--bg` CSS variables; the print stylesheet must reuse those literals or introduce the tokens.

## For Agents

Build only what Scope > In lists. Do not build server-side PDF, mailing, or custom branding. Stop and ask on OQ-1 (ink/brand), OQ-1.1 (source tag), and OQ-4 (route visibility) rather than inferring a behavior. Cite AC ids in the PR.

Acceptance Criteria — observable, testable, one line each:
- AC-1: A Host on the group page sees a "Print sign" action; non-owners do not `[pending OQ-4]`.
- AC-2: `/group/[token]/print` renders the group name, the join QR, an instruction line, and the join URL as text; unknown / closed / archived tokens 404 like the join page.
- AC-3: Printing (browser Print / Save-as-PDF) produces a sheet with no app chrome, the QR at scannable size, and the accent color preserved (`print-color-adjust: exact`).
- AC-4: The printed QR resolves to the group's join flow and completes a join.
- AC-5: No pure-white page background except the QR's own contrast card; no blue anywhere (DESIGN.md).
- AC-6: No new DB fields or migrations.

Scope note: covers Scope 1 (printable join sheet) only; formats (Scope 2) fast-follow.
