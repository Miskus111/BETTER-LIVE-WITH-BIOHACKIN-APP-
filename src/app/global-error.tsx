'use client' // error boundaries must be client components

import { useEffect } from 'react'

/**
 * Last resort when even the root layout fails: it replaces the whole page, so it brings its own <html>, <body>
 * and inline styles (the site's CSS and translations may not be loaded).
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#07090c',
          color: '#e8edf2',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div role="alert">
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>Něco se nepovedlo.</h1>
          <p style={{ color: '#9aa4af', marginTop: 12 }}>Something went wrong. Zkuste to prosím znovu.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              padding: '10px 22px',
              borderRadius: 999,
              border: 0,
              background: '#5ee7ff',
              color: '#07090c',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Zkusit znovu / Try again
          </button>
        </div>
      </body>
    </html>
  )
}
