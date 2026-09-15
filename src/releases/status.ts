/** Maps the many Azure DevOps status spellings onto the handful the UI styles. */
export function mapStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === 'succeeded' || s === 'active') return 'succeeded'
  if (s === 'failed' || s === 'rejected') return 'failed'
  if (s === 'inprogress' || s === 'queued') return 'inProgress'
  if (s === 'notstarted' || s === 'notdeployed' || s === 'undefined') return 'notStarted'
  if (s === 'canceled' || s === 'cancelled') return 'canceled'
  return s
}

/** Human-readable run time for a task: "1m 12s" while running, "—" before it starts. */
export function formatDuration(start?: string, finish?: string): string {
  if (!start) return '—'
  const from = new Date(start).getTime()
  const to = finish ? new Date(finish).getTime() : Date.now()
  const seconds = Math.max(0, Math.round((to - from) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}
