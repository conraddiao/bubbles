'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'

import { MAX_BUG_DESCRIPTION_LENGTH } from '@/lib/bug-report'
import { useKeyboardInset } from '@/hooks/use-keyboard-inset'
import { supabase } from '@/lib/supabase'

const CLOSE_DELAY_MS = 1000

interface ReportBugSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportBugSheet({ open, onOpenChange }: ReportBugSheetProps) {
  const { keyboardInset, viewportHeight } = useKeyboardInset(open)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#1C1713]/40 data-[state=open]:animate-fade-up-in" />
        <Dialog.Content
          // Lift the sheet above the on-screen keyboard and cap it to what is
          // left of the viewport, so the textarea and CTA stay reachable.
          style={{
            bottom: keyboardInset,
            maxHeight: viewportHeight ? viewportHeight - 16 : undefined,
          }}
          className="fixed left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-[#FEFAF4] p-5 shadow-2xl focus:outline-none data-[state=open]:animate-fade-up-in"
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-center gap-3">
            <Dialog.Close
              aria-label="Close"
              className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#7A6E63] transition-colors hover:bg-[#F0E8D9] active-scale"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
            <Dialog.Title className="font-label text-lg font-semibold text-[#1C1713]">
              Report a bug
            </Dialog.Title>
          </div>

          {/* Mounted fresh on each open, so the form resets itself */}
          <ReportBugForm onDone={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ReportBugForm({ onDone }: { onDone: () => void }) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const handleSubmit = async () => {
    const trimmed = description.trim()
    if (!trimmed || submitting || submitted) return

    setSubmitting(true)
    setError(null)

    try {
      // The session lives in localStorage, so the server can't read it from
      // cookies — pass the access token explicitly.
      const { data } = await supabase.auth.getSession()
      const accessToken = data?.session?.access_token
      if (!accessToken) {
        throw new Error('You need to be signed in to report a bug.')
      }

      const response = await fetch('/api/bug-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          description: trimmed,
          path: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Something went wrong. Please try again.')
      }

      setSubmitted(true)
      closeTimer.current = setTimeout(onDone, CLOSE_DELAY_MS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-2xl font-bold text-[#1C1713]">Thank you!</p>
        <p className="text-sm text-[#7A6E63]">
          Your report is on its way. We appreciate the help.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <label htmlFor="bug-description" className="block text-sm font-medium text-[#1C1713]">
        What went wrong?
      </label>
      <textarea
        id="bug-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Tell us what happened, what you expected, and how to reproduce it."
        rows={6}
        maxLength={MAX_BUG_DESCRIPTION_LENGTH}
        disabled={submitting}
        autoFocus
        className="min-h-[104px] w-full flex-1 resize-none rounded-xl border border-[#E0D5C5] bg-[#F6EFE5] px-3 py-2.5 text-base text-[#1C1713] outline-none transition-colors placeholder:text-[#7A6E63] focus-visible:border-[#E8622A] disabled:opacity-50"
      />

      {error && (
        <p role="alert" className="text-sm text-[#C53030]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!description.trim() || submitting}
        className="w-full shrink-0 rounded-xl bg-[#E8622A] py-3 text-sm font-semibold text-[#FEFAF4] font-label transition-colors hover:bg-[#B84A1A] disabled:opacity-50 active-scale"
      >
        {submitting ? 'Sending...' : 'Submit'}
      </button>
    </div>
  )
}
