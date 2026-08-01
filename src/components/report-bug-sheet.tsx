'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog } from 'radix-ui'

const BUG_REPORT_EMAIL = 'Conrad@bubbles.fyi'
const CLOSE_DELAY_MS = 1000

interface ReportBugSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportBugSheet({ open, onOpenChange }: ReportBugSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#1C1713]/40 data-[state=open]:animate-fade-up-in" />
        <Dialog.Content
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[#FEFAF4] p-5 shadow-2xl focus:outline-none data-[state=open]:animate-fade-up-in"
          aria-describedby={undefined}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#E0D5C5]" />

          <Dialog.Title className="font-label mb-4 text-lg font-semibold text-[#1C1713]">
            Report a bug
          </Dialog.Title>

          {/* Mounted fresh on each open, so the form resets itself */}
          <ReportBugForm onDone={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ReportBugForm({ onDone }: { onDone: () => void }) {
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const handleSubmit = () => {
    const trimmed = description.trim()
    if (!trimmed || submitted) return

    const context = [
      '',
      '---',
      `Page: ${window.location.href}`,
      `Browser: ${navigator.userAgent}`,
    ].join('\n')

    const mailto = `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(
      'Bubbles bug report'
    )}&body=${encodeURIComponent(`${trimmed}\n${context}`)}`

    window.location.assign(mailto)

    setSubmitted(true)
    closeTimer.current = setTimeout(onDone, CLOSE_DELAY_MS)
  }

  if (submitted) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-2xl font-bold text-[#1C1713]">Thank you!</p>
        <p className="text-sm text-[#7A6E63]">
          Your report is on its way. We appreciate the help.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <label htmlFor="bug-description" className="block text-sm font-medium text-[#1C1713]">
        What went wrong?
      </label>
      <textarea
        id="bug-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Tell us what happened, what you expected, and how to reproduce it."
        rows={8}
        autoFocus
        className="min-h-[180px] w-full resize-none rounded-xl border border-[#E0D5C5] bg-[#F6EFE5] px-3 py-2.5 text-base text-[#1C1713] outline-none transition-colors placeholder:text-[#7A6E63] focus-visible:border-[#E8622A]"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!description.trim()}
        className="w-full rounded-xl bg-[#E8622A] py-3 text-sm font-semibold text-[#FEFAF4] font-label transition-colors hover:bg-[#B84A1A] disabled:opacity-50 active-scale"
      >
        Submit
      </button>
    </div>
  )
}
