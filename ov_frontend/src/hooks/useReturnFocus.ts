import { useRef } from 'react'

// These overlays open from several buttons, rather than a single Radix Trigger.
export function useReturnFocus() {
  const trigger = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: () => {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault()
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (trigger.current?.isConnected && trigger.current !== document.body) {
        trigger.current.focus({ preventScroll: true })
      } else {
        const heading = document.querySelector<HTMLElement>('.sx-discovery h1')
        heading?.setAttribute('tabindex', '-1')
        heading?.focus({ preventScroll: true })
      }
    },
  }
}
