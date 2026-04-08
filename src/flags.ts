import { flag } from 'flags/next'
import { vercelAdapter } from '@flags-sdk/vercel'

const hasFlags = !!process.env.FLAGS

export const showQRCard = flag<boolean>({
  key: 'showQRCard',
  defaultValue: false,
  ...(hasFlags
    ? { adapter: vercelAdapter() as never }
    : { decide: () => false }),
})

export const showQRCube = flag<boolean>({
  key: 'showQRCube',
  defaultValue: true,
  ...(hasFlags
    ? { adapter: vercelAdapter() as never }
    : { decide: () => true }),
})

export const mmsOnboarding = flag<boolean>({
  key: 'mms-onboarding',
  defaultValue: false,
  ...(hasFlags
    ? { adapter: vercelAdapter() as never }
    : { decide: () => false }),
})

export const showLandingPageCopy = flag<boolean>({
  key: 'show-landing-page-copy',
  defaultValue: false,
  ...(hasFlags
    ? { adapter: vercelAdapter() as never }
    : { decide: () => false }),
})
