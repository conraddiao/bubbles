import { flag } from 'flags/next'
import { vercelAdapter } from '@flags-sdk/vercel'

export const showQRCard = flag<boolean>({
  key: 'showQRCard',
  adapter: vercelAdapter(),
  defaultValue: false,
})

export const showQRCube = flag<boolean>({
  key: 'showQRCube',
  adapter: vercelAdapter(),
  defaultValue: true,
})
