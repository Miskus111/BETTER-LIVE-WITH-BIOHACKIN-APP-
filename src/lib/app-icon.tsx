import { ImageResponse } from 'next/og'

/**
 * The app icon drawn from the logo mark: `rounded` for the plain manifest icon, `maskable` with a safe zone for
 * Android's shaped masks, `square` for iOS, which rounds the corners itself.
 */
export function appIcon(px: number, shape: 'rounded' | 'maskable' | 'square') {
  const mark = shape === 'maskable' ? px * 0.6 : px * 0.82
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#07090c',
        borderRadius: shape === 'rounded' ? px * 0.22 : 0,
      }}
    >
      <svg width={mark} height={mark} viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14.5" fill="none" stroke="#5ee7ff" strokeOpacity="0.55" />
        <circle cx="16" cy="10" r="3.2" fill="#5ee7ff" />
        <path
          d="M16 14.5 V26 M10.5 17 L16 15.5 L21.5 17 M12.5 26 L16 20.5 L19.5 26"
          stroke="#5ee7ff"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>,
    { width: px, height: px },
  )
}
