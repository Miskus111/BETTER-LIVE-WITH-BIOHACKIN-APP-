'use client'

import { useTransition } from 'react'

/**
 * useTransition for saving to the database from the browser: an exception (network down, missing keys)
 * goes to `onError` instead of taking down the whole screen with an error page.
 */
export function useSafeTransition(onError: (e: unknown) => void) {
  const [pending, startRaw] = useTransition()
  const start = (fn: () => Promise<void> | void) =>
    startRaw(async () => {
      try {
        await fn()
      } catch (e) {
        console.error('[save] failed', e)
        onError(e)
      }
    })
  return [pending, start] as const
}
