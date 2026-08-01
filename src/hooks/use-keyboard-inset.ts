'use client'

import { useEffect, useState } from 'react'

export interface ViewportInsets {
  /** Height in px the on-screen keyboard covers at the bottom of the window. */
  keyboardInset: number
  /** Usable viewport height in px, excluding the keyboard. */
  viewportHeight: number
}

/**
 * iOS Safari does not shrink the layout viewport when the keyboard opens, so a
 * `position: fixed; bottom: 0` sheet ends up underneath it. The visual viewport
 * does track the keyboard, so measure the difference and let callers lift the
 * sheet by that much.
 */
export function useKeyboardInset(active: boolean): ViewportInsets {
  const [insets, setInsets] = useState<ViewportInsets>({
    keyboardInset: 0,
    viewportHeight: 0,
  })

  useEffect(() => {
    if (!active || typeof window === 'undefined') return

    const measure = () => {
      const viewport = window.visualViewport
      if (!viewport) {
        setInsets({ keyboardInset: 0, viewportHeight: window.innerHeight })
        return
      }
      const covered = window.innerHeight - viewport.height - viewport.offsetTop
      setInsets({
        // Sub-pixel noise and rubber-band scrolling can push this slightly
        // negative; clamp so the sheet never floats off the bottom edge.
        keyboardInset: Math.max(0, Math.round(covered)),
        viewportHeight: Math.round(viewport.height),
      })
    }

    measure()

    // No visualViewport (older browsers) — nothing to subscribe to.
    const viewport = window.visualViewport
    if (!viewport) return

    viewport.addEventListener('resize', measure)
    viewport.addEventListener('scroll', measure)
    return () => {
      viewport.removeEventListener('resize', measure)
      viewport.removeEventListener('scroll', measure)
    }
  }, [active])

  return insets
}
