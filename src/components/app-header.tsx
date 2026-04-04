'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, LogOut, Settings } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'

export function AppHeader() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === '/dashboard'

  const displayName = [
    profile?.first_name ?? user?.user_metadata?.first_name,
    profile?.last_name ?? user?.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const avatarInitial = (displayName?.charAt(0) ?? user?.email?.charAt(0) ?? '?').toUpperCase()

  const [classicCards, setClassicCards] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.cookie.includes('classic-cards=true')
  })

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleClassicCardsToggle = (checked: boolean) => {
    setClassicCards(checked)
    if (checked) {
      document.cookie = 'classic-cards=true; path=/; max-age=31536000'
    } else {
      document.cookie = 'classic-cards=; path=/; max-age=0'
    }
    router.refresh()
  }

  return (
    <header className="border-b border-border" role="banner">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left slot: back arrow on mobile for non-home pages */}
        <div className="block sm:hidden">
          {isHome ? (
            <div className="h-11 w-11" aria-hidden="true" />
          ) : (
            <Link href="/dashboard">
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#7A6E63] transition-colors hover:bg-[#F0E8D9] active-scale"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            </Link>
          )}
        </div>

        <Link
          href="/dashboard"
          className="absolute left-1/2 -translate-x-1/2 font-display text-xl font-bold tracking-tight text-foreground sm:static sm:translate-x-0"
        >
          Bubbles
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active-scale"
              aria-label="Open user menu"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-[var(--accent-light)] text-sm font-semibold text-primary">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold">{displayName || 'Account'}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={classicCards}
              onCheckedChange={handleClassicCardsToggle}
            >
              Classic Cards
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
