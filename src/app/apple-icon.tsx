import { appIcon } from '@/lib/app-icon'

/** Home-screen icon for iPhone and iPad (Next adds the apple-touch-icon link); iOS rounds the corners itself. */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return appIcon(180, 'square')
}
