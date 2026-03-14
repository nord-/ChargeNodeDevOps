import { useState } from 'react'
import type { WorkItem } from '../api/boards'

export function useLazyItems(loadFn: (key: string) => Promise<WorkItem[]>) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [items, setItems] = useState<Record<string, WorkItem[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<Set<string>>(new Set())

  async function load(key: string) {
    setLoading(prev => new Set(prev).add(key))
    try {
      const wi = await loadFn(key)
      setItems(prev => ({ ...prev, [key]: wi }))
    } finally {
      setLoading(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  function toggle(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        if (!items[key]) load(key)
      }
      return next
    })
  }

  function moveItem(updated: WorkItem, newKey: string) {
    setItems(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter(i => i.id !== updated.id)
      }
      if (next[newKey]) {
        next[newKey] = [...next[newKey], updated]
      } else {
        delete next[newKey]
      }
      return next
    })
    setCounts(prev => {
      const counts = { ...prev }
      for (const [key, list] of Object.entries(items)) {
        if (list.some(i => i.id === updated.id) && key !== newKey) {
          counts[key] = Math.max(0, (counts[key] ?? 0) - 1)
          counts[newKey] = (counts[newKey] ?? 0) + 1
          break
        }
      }
      return counts
    })
  }

  function reset() {
    setCounts({}); setItems({}); setExpanded(new Set()); setLoading(new Set())
  }

  return { counts, setCounts, items, expanded, loading, toggle, moveItem, reset }
}
