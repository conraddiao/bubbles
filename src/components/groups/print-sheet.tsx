'use client'

import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

interface PrintSheetProps {
  groupName: string
  /** The URL the QR encodes — the group's join flow. */
  joinUrl: string
  /** Same URL, protocol stripped, for the human-readable fallback line. */
  displayUrl: string
  /** Where the on-screen back link points. */
  backHref: string
}

/**
 * A printable sign carrying the group's join QR.
 *
 * Hosts print this and set it on a table so guests can join unattended —
 * no phone to pass around, no explaining the flow to each person.
 *
 * Screen chrome (back link, print button) is marked `no-print` and drops
 * out of the printed sheet; see the `@media print` block in globals.css.
 */
export function PrintSheet({ groupName, joinUrl, displayUrl, backHref }: PrintSheetProps) {
  return (
    <div className="min-h-dvh bg-[#F6EFE5] px-4 py-6">
      {/* Screen-only chrome */}
      <div className="no-print mx-auto mb-6 flex w-full max-w-[816px] items-center justify-between gap-3">
        <Link
          href={backHref}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#7A6E63] transition-colors hover:bg-[#F0E8D9] font-label active-scale"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to group
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full bg-[#E8622A] px-5 py-2.5 text-sm font-semibold text-[#FEFAF4] transition-colors hover:bg-[#B84A1A] font-label active-scale"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print this sheet
        </button>
      </div>

      <p className="no-print mx-auto mb-6 w-full max-w-[816px] text-sm text-[#7A6E63]">
        Printing opens your browser&rsquo;s print dialog — choose a printer, or
        &ldquo;Save as PDF&rdquo; to send it somewhere.
      </p>

      {/* The sheet itself — US Letter proportions (816 x 1056 @ 96dpi) */}
      <div
        className="print-sheet mx-auto flex w-full max-w-[816px] flex-col items-center justify-between rounded-lg border border-[#E0D5C5] bg-[#F6EFE5] px-12 py-16 text-center shadow-sm"
        style={{ minHeight: 1056, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        {/* Eyebrow + headline */}
        <div className="flex flex-col items-center gap-5">
          <span className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-[#E8622A]">
            You&rsquo;re invited
          </span>
          <div className="h-px w-16 bg-[#E0D5C5]" aria-hidden="true" />
          <p className="font-label text-xl text-[#7A6E63]">Scan to join</p>
          <h1 className="font-display text-6xl font-semibold leading-[1.05] text-[#1C1713]">
            {groupName}
          </h1>
        </div>

        {/* QR — white card is the one deliberate white surface, for scanner contrast */}
        {joinUrl ? (
          <div
            className="rounded-2xl bg-white p-6"
            role="img"
            aria-label={`QR code to join ${groupName}`}
            style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
          >
            <QRCodeSVG
              value={joinUrl}
              size={340}
              bgColor="#FFFFFF"
              fgColor="#1C1713"
              /* H survives creases, smudges and coffee rings better than M */
              level="H"
            />
          </div>
        ) : (
          <div className="h-[388px] w-[388px] rounded-2xl bg-[#F0E8D9]" />
        )}

        {/* Instruction + typed fallback */}
        <div className="flex flex-col items-center gap-4">
          <p className="max-w-md text-lg leading-relaxed text-[#1C1713]">
            Add your contact — everyone shares, everyone gets the list.
          </p>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-label text-sm uppercase tracking-wider text-[#7A6E63]">
              Or type it in
            </span>
            <p className="font-mono text-base text-[#1C1713]">{displayUrl || '—'}</p>
          </div>
          <div className="h-px w-16 bg-[#E0D5C5]" aria-hidden="true" />
          <span className="font-label text-sm font-semibold tracking-wide text-[#7A6E63]">
            bubbles.fyi
          </span>
        </div>
      </div>
    </div>
  )
}
