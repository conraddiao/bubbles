'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, QrCode } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getGroupByToken } from '@/lib/database'

type BarcodeDetectorResult = { rawValue: string }
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

const getBarcodeDetector = (): BarcodeDetectorConstructor | null => {
  if (typeof window === 'undefined') return null
  const detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector
  return detector ?? null
}

const extractShareToken = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsedUrl = new URL(trimmed)
    const joinMatch = parsedUrl.pathname.match(/\/join\/([^/]+)/)
    if (joinMatch?.[1]) return joinMatch[1]
  } catch {
    // Not a URL, fall through to token parsing
  }

  const maybeToken = trimmed.split('/').filter(Boolean).pop()
  return maybeToken ?? null
}

export function JoinGroupCard() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [isScanOpen, setIsScanOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [codeValue, setCodeValue] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [isCheckingCode, setIsCheckingCode] = useState(false)
  const [isScannerReady, setIsScannerReady] = useState(false)

  const isBarcodeSupported = useMemo(() => Boolean(getBarcodeDetector()), [])

  const stopScanner = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const handleDetectedValue = useCallback(
    (value: string) => {
      const token = extractShareToken(value)
      if (!token) {
        setScanError('That QR code is missing a join link.')
        return
      }

      setScanError(null)
      stopScanner()
      setIsScanOpen(false)
      router.push(`/join/${token}`)
    },
    [router, stopScanner],
  )

  const detectFrame = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current) return

    try {
      const results = await detectorRef.current.detect(videoRef.current)
      if (results.length > 0) {
        handleDetectedValue(results[0].rawValue)
        return
      }
    } catch {
      setScanError('We ran into a problem reading that code. Try again.')
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame)
  }, [handleDetectedValue])

  const startScanner = useCallback(async () => {
    setScanError(null)
    setIsScannerReady(false)

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError('Camera access is not available on this device.')
      return
    }

    const Detector = getBarcodeDetector()
    if (!Detector) {
      setScanError('QR scanning is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      detectorRef.current = new Detector({ formats: ['qr_code'] })
      setIsScannerReady(true)
      animationFrameRef.current = requestAnimationFrame(detectFrame)
    } catch (error) {
      console.error('Camera start error:', error)
      setScanError('Unable to access the camera. Check permissions and try again.')
    }
  }, [detectFrame])

  useEffect(() => {
    if (isScanOpen) {
      void startScanner()
    } else {
      stopScanner()
      setScanError(null)
    }

    return () => {
      stopScanner()
    }
  }, [isScanOpen, startScanner, stopScanner])

  const handleCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCodeError(null)

    const normalizedCode = codeValue.trim()
    if (!normalizedCode) {
      setCodeError('Enter a group code to continue.')
      return
    }

    setIsCheckingCode(true)
    try {
      const { data, error } = await getGroupByToken(normalizedCode)
      if (error || !data) {
        setCodeError('We couldn’t find a group with that code.')
        return
      }

      router.push(`/join/${normalizedCode}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check that code right now.'
      setCodeError(message)
    } finally {
      setIsCheckingCode(false)
    }
  }

  return (
    <>
      <Card className="h-full rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
            <QrCode className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Join Group
          </CardTitle>
          <CardDescription className="text-slate-600">
            Join an existing group with a code or by scanning an invite QR code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-2" onSubmit={handleCodeSubmit}>
            <label className="text-sm font-medium text-slate-800" htmlFor="join-code">
              Enter invite code
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="join-code"
                value={codeValue}
                onChange={(event) => setCodeValue(event.target.value)}
                placeholder="e.g. 9XYZ12"
                className="sm:flex-1"
                autoComplete="off"
                inputMode="text"
                aria-invalid={Boolean(codeError)}
              />
              <Button
                type="submit"
                className="w-full justify-center gap-2 sm:w-auto"
                disabled={isCheckingCode}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {isCheckingCode ? 'Checking…' : 'Enter Code'}
              </Button>
            </div>
            {codeError && <p className="text-sm text-red-600">{codeError}</p>}
          </form>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Scan a QR code</p>
                <p className="text-sm text-slate-600">
                  Opens your camera to instantly follow a join link.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full justify-center gap-2 sm:w-auto"
                onClick={() => setIsScanOpen(true)}
                disabled={!isBarcodeSupported}
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
                Scan QR
              </Button>
            </div>
            {!isBarcodeSupported && (
              <p className="mt-2 text-sm text-amber-700">
                QR scanning is not supported in this browser. Try a mobile device instead.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR code</DialogTitle>
            <DialogDescription>
              Use your camera to scan an invite QR code. We&apos;ll take you straight to the
              group join page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black">
              <video
                ref={videoRef}
                className="aspect-video h-full w-full rounded-2xl object-cover"
                playsInline
                muted
              />

              {!isScannerReady && !scanError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white">
                  Opening camera…
                </div>
              )}

              {scanError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-sm text-red-100">
                  {scanError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Point your camera at a Bubbles join QR code.</span>
              <Button variant="ghost" size="sm" type="button" onClick={startScanner}>
                Restart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
