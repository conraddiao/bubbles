'use client'

import { useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import imageCompression from 'browser-image-compression'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface AvatarCropDialogProps {
  imageSrc: string | null
  open: boolean
  onClose: () => void
  onCropComplete: (blob: Blob) => void
}

export function AvatarCropDialog({ imageSrc, open, onClose, onCropComplete }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  // Upscaled version of imageSrc — guaranteed to be at least as wide as the viewport
  const [scaledSrc, setScaledSrc] = useState<string | null>(null)

  // Map Enter → Done when the sheet is open and not processing
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isProcessing && croppedAreaPixels) {
        e.preventDefault()
        handleConfirm()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, isProcessing, croppedAreaPixels]) // eslint-disable-line react-hooks/exhaustive-deps

  // Radix holds the body scroll lock for the duration of the exit animation.
  // Force-release it once the sheet is closed.
  useEffect(() => {
    if (!open) {
      const id = setTimeout(() => {
        document.body.style.overflow = ''
      }, 300)
      return () => clearTimeout(id)
    }
  }, [open])

  useEffect(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setScaledSrc(null)

    if (!imageSrc) return

    let blobUrl: string | null = null

    const img = new Image()
    img.onload = () => {
      const minDim = Math.max(window.innerWidth, window.innerHeight, 800)
      if (img.naturalWidth >= minDim && img.naturalHeight >= minDim) {
        // Already large enough — use as-is
        setScaledSrc(imageSrc)
        return
      }
      // Scale up so the shorter side meets minDim
      const scale = Math.max(minDim / img.naturalWidth, minDim / img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { setScaledSrc(imageSrc); return }
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((b) => {
        if (!b) { setScaledSrc(imageSrc); return }
        blobUrl = URL.createObjectURL(b)
        setScaledSrc(blobUrl)
      }, 'image/jpeg', 0.95)
    }
    img.onerror = () => setScaledSrc(imageSrc)
    img.src = imageSrc

    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [imageSrc])

  const handleCropComplete = (_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !scaledSrc) return
    setIsProcessing(true)
    try {
      const image = new Image()
      image.src = scaledSrc
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = reject
      })

      const canvas = document.createElement('canvas')
      const SIZE = 512
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        SIZE,
        SIZE,
      )

      const rawBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/jpeg',
          0.92,
        )
      )

      const compressed = await imageCompression(
        new File([rawBlob], 'avatar.jpg', { type: 'image/jpeg' }),
        { maxSizeMB: 1, maxWidthOrHeight: 512, useWebWorker: true, fileType: 'image/jpeg' },
      )

      onCropComplete(compressed)
    } catch {
      // let the caller handle — don't close
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v && !isProcessing) onClose() }}
    >
      <DialogContent
        showCloseButton={false}
        className="!fixed !bottom-0 !top-auto !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-full !h-dvh !rounded-t-2xl !rounded-b-none !border-0 !p-0 sm:!max-w-none !overflow-hidden !flex !flex-col !gap-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100"
        onInteractOutside={(e) => { if (isProcessing) e.preventDefault() }}
      >
        {/* Cropper fills the entire sheet; buttons float on top */}
        <div className="relative h-dvh w-full bg-black">
          {scaledSrc && (
            <Cropper
              image={scaledSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}

          {/* X button — top right, white, over the image */}
          {!isProcessing && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Done button — floating at the bottom over the image */}
          <div className="absolute bottom-8 left-6 right-6 z-10">
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={!croppedAreaPixels || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isProcessing ? 'Processing…' : 'Done'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
