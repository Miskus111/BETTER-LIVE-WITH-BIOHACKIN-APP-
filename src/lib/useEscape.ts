import { useEffect } from 'react'

/** Closes a dialog on Escape, wherever the keyboard focus is; `enabled` = the dialog is open. */
export function useEscape(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, enabled])
}

/**
 * Gives keyboard focus back to whatever opened a dialog when it closes (otherwise it falls to <body> and a
 * keyboard user starts over from the top). Call it before the dialog moves focus inside: effects run in order.
 */
export function useRestoreFocus() {
  useEffect(() => {
    const opener = document.activeElement
    return () => {
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) opener.focus()
    }
  }, [])
}
