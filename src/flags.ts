import { flag } from 'flags/next'

export const showQrCode = flag<boolean>({
  key: 'show-qr-code',
  defaultValue: true,
  description: 'Show the QR code card in the group hero section',
  options: [
    { value: true, label: 'Visible' },
    { value: false, label: 'Hidden' },
  ],
  decide: () => true,
})

export const showCube = flag<boolean>({
  key: 'show-cube',
  defaultValue: true,
  description: 'Show the 3D squircle background in the group hero section',
  options: [
    { value: true, label: 'Visible' },
    { value: false, label: 'Hidden' },
  ],
  decide: () => true,
})
