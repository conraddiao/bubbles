import { mmsOnboarding } from '@/flags'
import { AppLayoutClient } from './app-layout-client'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const isMmsOnboarding = await mmsOnboarding()

  return <AppLayoutClient mmsOnboarding={isMmsOnboarding}>{children}</AppLayoutClient>
}
