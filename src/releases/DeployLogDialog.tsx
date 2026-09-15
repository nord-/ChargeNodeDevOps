import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiClose, mdiChevronLeft } from '@mdi/js'
import { ApiError, errorMessage, type DevOpsClient } from '../api/devops'
import {
  getEnvironmentDetail,
  getTaskLog,
  listDeployTasks,
  latestPhases,
  isActiveStatus,
  type Release,
  type ReleaseEnvironment,
  type ReleaseEnvironmentDetail,
  type DeployTask,
} from '../api/releases'
import { useLivePolling } from './useLivePolling'
import { mapStatus, formatDuration } from './status'
import './DeployLogDialog.css'

interface Props {
  client: DevOpsClient
  project: string
  release: Release
  environment: ReleaseEnvironment
  onClose: () => void
}

/** How close to the bottom counts as "following the log", in pixels. */
const FOLLOW_THRESHOLD = 40

export function DeployLogDialog({ client, project, release, environment, onClose }: Props) {
  const [detail, setDetail] = useState<ReleaseEnvironmentDetail | null>(null)
  const [tasks, setTasks] = useState<DeployTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<DeployTask | null>(null)
  const [log, setLog] = useState('')
  const [logLoading, setLogLoading] = useState(false)

  const logRef = useRef<HTMLPreElement>(null)
  const following = useRef(true)
  const selectedRef = useRef<number | null>(null)

  const loadTasks = useCallback(async () => {
    const d = await getEnvironmentDetail(client, project, release.id, environment.id)
    setDetail(d)
    const phases = latestPhases(d)
    setTasks(phases.length === 0 ? [] : await listDeployTasks(client, project, release.id, environment.id, phases))
  }, [client, project, release.id, environment.id])

  const loadLog = useCallback(async (task: DeployTask) => {
    const text = await getTaskLog(client, project, release.id, environment.id, task.phaseId, task.id)
    if (task.id === selectedRef.current) setLog(text)
  }, [client, project, release.id, environment.id])

  useEffect(() => {
    setLoading(true)
    loadTasks()
      .catch(err => setError(`Failed to load deployment: ${errorMessage(err)}`))
      .finally(() => setLoading(false))
  }, [loadTasks])

  const [authBlocked, setAuthBlocked] = useState(false)

  const status = detail?.status ?? environment.status
  const isActive = isActiveStatus(status) && !authBlocked

  /** A live tick refreshes the task list, and the open log too since it keeps growing. */
  const tick = useCallback(async () => {
    try {
      await loadTasks()
      if (selected) await loadLog(selected)
    } catch (err) {
      console.error('Live refresh failed:', err)
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setAuthBlocked(true)
        setError(`Live refresh stopped: ${errorMessage(err)}`)
      }
    }
  }, [loadTasks, loadLog, selected])

  useLivePolling(isActive, tick)

  async function openLog(task: DeployTask) {
    selectedRef.current = task.id
    setSelected(task)
    setLog('')
    setError('')
    following.current = true
    setLogLoading(true)
    try {
      await loadLog(task)
    } catch (err) {
      setError(`Failed to load log: ${errorMessage(err)}`)
    } finally {
      setLogLoading(false)
    }
  }

  function handleScroll() {
    const el = logRef.current
    if (!el) return
    following.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD
  }

  // Keep the newest output in view, but only while the reader is at the bottom —
  // scrolling back to read something must not be yanked away by the next tick.
  useEffect(() => {
    const el = logRef.current
    if (el && following.current) el.scrollTop = el.scrollHeight
  }, [log])

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog dialog-log" onClick={e => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}><Icon path={mdiClose} size={0.8} /></button>
        {selected ? (
          <button className="log-back" onClick={() => { selectedRef.current = null; setSelected(null); setLog('') }}>
            <Icon path={mdiChevronLeft} size={0.8} /> {selected.name}
          </button>
        ) : (
          <h3>{environment.name}</h3>
        )}
        {!selected && (
          <p className="dialog-subtitle">
            <span className={`task-status ${mapStatus(status)}`} />
            {status}
            {isActive && <span className="live-dot" role="img" aria-label="Live - refreshing while the deployment runs" />}
          </p>
        )}

        {error && <p className="error">{error}</p>}

        {!selected && (
          <>
            {loading && <p className="loading">Loading deployment...</p>}
            {!loading && !error && tasks.length === 0 && (
              <p className="muted">
                {detail && latestPhases(detail).length > 0
                  ? 'The deployment started but reported no tasks.'
                  : 'This stage has not run yet.'}
              </p>
            )}
            <ul className="task-list">
              {tasks.map(task => (
                <li key={`${task.phaseId}-${task.id}`}>
                  <button className="task-row" onClick={() => openLog(task)}>
                    <span className={`task-status ${mapStatus(task.status)}`} />
                    <span className="task-name">{task.name}</span>
                    <span className="task-duration">{formatDuration(task.startTime, task.finishTime)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {selected && (
          <>
            {logLoading && <p className="loading">Loading log...</p>}
            <pre className="log-view" ref={logRef} onScroll={handleScroll}>
              {log || (logLoading ? '' : 'No log output yet.')}
            </pre>
          </>
        )}
      </div>
    </div>
  )
}
