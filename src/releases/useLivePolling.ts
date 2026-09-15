import { useEffect, useRef } from 'react'

export const POLL_INTERVAL_MS = 10_000

/**
 * Calls `onTick` on an interval while `active` is true.
 *
 * Azure DevOps has no push channel a static PWA can subscribe to, so live
 * status is polled. Polling pauses while the document is hidden — a
 * backgrounded PWA must not keep draining the battery and the API quota —
 * and fires once immediately when the user comes back, so the view is
 * current before the next interval elapses.
 */
export function useLivePolling(active: boolean, onTick: () => void | Promise<void>, intervalMs: number = POLL_INTERVAL_MS) {
  const tick = useRef(onTick)

  useEffect(() => {
    tick.current = onTick
  }, [onTick])

  useEffect(() => {
    if (!active) return

    let timer: number | undefined
    let inFlight = false

    const runTick = async () => {
      if (inFlight) return
      inFlight = true
      try {
        await tick.current()
      } finally {
        inFlight = false
      }
    }

    const start = () => {
      if (timer === undefined) timer = window.setInterval(runTick, intervalMs)
    }
    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }
    const handleVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        runTick()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [active, intervalMs])
}
