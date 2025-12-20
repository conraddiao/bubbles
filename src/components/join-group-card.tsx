'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getGroupByToken } from '@/lib/database'

export function JoinGroupCard() {
  const router = useRouter()

  const [codeValue, setCodeValue] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [isCheckingCode, setIsCheckingCode] = useState(false)

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
    <Card className="h-full rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
          Join Group
        </CardTitle>
        <CardDescription className="text-slate-600">
          Enter a short invite code to jump into the right group.
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
      </CardContent>
    </Card>
  )
}
