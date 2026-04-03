'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface QrCodeHeroProps {
  groupName: string
  shareUrl: string
  memberCount: number
}

export function QrCodeHero({ groupName, shareUrl, memberCount }: QrCodeHeroProps) {
  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleShare = async () => {
    if (!shareUrl) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: groupName, text: `Join my group on Bubbles`, url: shareUrl })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
    await handleCopyLink()
  }

  return (
    <div className="flex flex-col items-center gap-5 bg-[#E8622A] px-6 py-10">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-3xl font-semibold leading-tight text-[#FEFAF4]">
          {groupName}
        </h1>
        <p className="text-sm text-[#FEFAF4]/75">
          {memberCount === 0
            ? 'No one has joined yet'
            : `${memberCount} joined so far`}
        </p>
      </div>

      {shareUrl ? (
        <div
          className="animate-fade-up-in rounded-2xl bg-white p-4 shadow-lg"
          role="img"
          aria-label={`QR code to join ${groupName}`}
        >
          <QRCodeSVG
            value={shareUrl}
            size={200}
            bgColor="#FFFFFF"
            fgColor="#1C1713"
            level="M"
          />
        </div>
      ) : (
        <div className="h-[232px] w-[232px] animate-pulse rounded-2xl bg-[#FEFAF4]/20" />
      )}

      <div className="flex w-full max-w-xs gap-3">
        <button
          onClick={handleCopyLink}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#FEFAF4]/60 py-2.5 text-sm font-semibold text-[#FEFAF4] transition-colors hover:bg-[#FEFAF4]/10 font-label"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy link
        </button>
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#FEFAF4] bg-[#FEFAF4]/20 py-2.5 text-sm font-semibold text-[#FEFAF4] transition-colors hover:bg-[#FEFAF4]/30 font-label"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>
      </div>
    </div>
  )
}
