import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatDate } from './formatDate'

describe('formatDate', () => {
  afterEach(() => { vi.useRealTimers() })

  it('shows "Today HH:mm" for today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 14, 0))
    expect(formatDate(new Date(2026, 2, 15, 9, 5))).toBe('Today 09:05')
  })

  it('shows "Yesterday HH:mm" for yesterday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 14, 0))
    expect(formatDate(new Date(2026, 2, 14, 23, 59))).toBe('Yesterday 23:59')
  })

  it('shows "d Mon HH:mm" for same year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 14, 0))
    expect(formatDate(new Date(2026, 0, 3, 8, 30))).toBe('3 Jan 08:30')
  })

  it('shows "d Mon YYYY HH:mm" for different year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 14, 0))
    expect(formatDate(new Date(2025, 11, 25, 16, 0))).toBe('25 Dec 2025 16:00')
  })

  it('accepts ISO string input', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 14, 0))
    const result = formatDate('2026-03-15T10:30:00')
    expect(result).toBe('Today 10:30')
  })

  it('pads single-digit hours and minutes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 14, 0))
    expect(formatDate(new Date(2026, 2, 15, 1, 2))).toBe('Today 01:02')
  })
})
