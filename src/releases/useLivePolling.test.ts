// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLivePolling, POLL_INTERVAL_MS } from './useLivePolling'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
}

describe('useLivePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not poll while inactive', () => {
    const onTick = vi.fn()
    renderHook(() => useLivePolling(false, onTick))

    vi.advanceTimersByTime(POLL_INTERVAL_MS * 3)

    expect(onTick).not.toHaveBeenCalled()
  })

  it('polls on an interval while active', async () => {
    const onTick = vi.fn()
    renderHook(() => useLivePolling(true, onTick))

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)

    expect(onTick).toHaveBeenCalledTimes(3)
  })

  it('pauses while the document is hidden', () => {
    const onTick = vi.fn()
    renderHook(() => useLivePolling(true, onTick))

    setHidden(true)
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(POLL_INTERVAL_MS * 3)

    expect(onTick).not.toHaveBeenCalled()
  })

  it('ticks once immediately and restarts when the document becomes visible again', async () => {
    const onTick = vi.fn()
    renderHook(() => useLivePolling(true, onTick))

    setHidden(true)
    document.dispatchEvent(new Event('visibilitychange'))
    onTick.mockClear()

    setHidden(false)
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)

    expect(onTick).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(onTick).toHaveBeenCalledTimes(2)
  })

  it('stops polling on unmount', () => {
    const onTick = vi.fn()
    const { unmount } = renderHook(() => useLivePolling(true, onTick))

    unmount()
    vi.advanceTimersByTime(POLL_INTERVAL_MS * 3)

    expect(onTick).not.toHaveBeenCalled()
  })

  it('skips a tick while the previous one is still in flight', async () => {
    let resolveTick: () => void = () => {}
    const onTick = vi.fn(() => new Promise<void>(resolve => { resolveTick = resolve }))
    renderHook(() => useLivePolling(true, onTick))

    vi.advanceTimersByTime(POLL_INTERVAL_MS)
    vi.advanceTimersByTime(POLL_INTERVAL_MS)

    expect(onTick).toHaveBeenCalledTimes(1)

    resolveTick()
    await Promise.resolve()
    vi.advanceTimersByTime(POLL_INTERVAL_MS)

    expect(onTick).toHaveBeenCalledTimes(2)
  })
})
