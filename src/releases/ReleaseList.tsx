import { useEffect, useState, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiStar, mdiStarOutline, mdiChevronDown, mdiCheck, mdiClose, mdiRocketLaunch, mdiRefresh } from '@mdi/js'
import { formatDate } from '../formatDate'
import { errorMessage, type DevOpsClient } from '../api/devops'
import {
  listReleaseDefinitions,
  listReleases,
  listApprovals,
  updateApproval,
  deployEnvironment,
  type ReleaseDefinition,
  type Release,
  type Approval,
} from '../api/releases'
import './ReleaseList.css'

const FAV_KEY = 'cn-devops-fav-releases'

function loadFavorites(project: string): Set<number> {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return new Set()
    const data = JSON.parse(raw)
    return new Set<number>(data[project] ?? [])
  } catch { return new Set() }
}

function saveFavorites(project: string, ids: Set<number>) {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data[project] = [...ids]
    localStorage.setItem(FAV_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

interface Props {
  client: DevOpsClient
  project: string
}

export function ReleaseList({ client, project }: Props) {
  const [definitions, setDefinitions] = useState<ReleaseDefinition[]>([])
  const [expandedDefId, setExpandedDefId] = useState<number | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [releasesLoading, setReleasesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [showOther, setShowOther] = useState(false)
  const [expandedReleaseId, setExpandedReleaseId] = useState<number | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [approvalBusy, setApprovalBusy] = useState<number | null>(null)
  const [stageBusy, setStageBusy] = useState<number | null>(null)

  useEffect(() => {
    if (!project) return
    setLoading(true)
    setError('')
    setDefinitions([])
    setExpandedDefId(null)
    setShowOther(false)
    setFavorites(loadFavorites(project))
    listReleaseDefinitions(client, project)
      .then(setDefinitions)
      .catch(err => setError(`Failed to load definitions: ${errorMessage(err)}`))
      .finally(() => setLoading(false))
  }, [client, project])

  async function toggleReleases(defId: number) {
    if (expandedDefId === defId) {
      setExpandedDefId(null)
      return
    }
    setExpandedDefId(defId)
    setExpandedReleaseId(null)
    setReleases([])
    setReleasesLoading(true)
    try {
      const r = await listReleases(client, project, defId)
      setReleases(r)
    } catch (err) {
      console.error('Failed to load releases:', err)
      setReleases([])
    } finally {
      setReleasesLoading(false)
    }
  }

  async function reloadReleases(defId: number) {
    setReleases([])
    setReleasesLoading(true)
    try {
      const r = await listReleases(client, project, defId)
      setReleases(r)
    } catch (err) {
      console.error('Failed to reload releases:', err)
      setReleases([])
    } finally {
      setReleasesLoading(false)
    }
  }

  async function reloadRelease(releaseId: number) {
    if (expandedDefId !== null) {
      const r = await listReleases(client, project, expandedDefId)
      setReleases(r)
    }
    await loadApprovals(releaseId)
  }

  const loadApprovals = useCallback(async (releaseId: number) => {
    setApprovals([])
    setApprovalsLoading(true)
    try {
      const a = await listApprovals(client, project, releaseId)
      setApprovals(a)
    } catch (err) {
      console.error('Failed to load approvals:', err)
      setApprovals([])
    } finally {
      setApprovalsLoading(false)
    }
  }, [client, project])

  function toggleRelease(releaseId: number) {
    if (expandedReleaseId === releaseId) {
      setExpandedReleaseId(null)
      return
    }
    setExpandedReleaseId(releaseId)
    loadApprovals(releaseId)
  }

  async function handleApproval(approvalId: number, status: 'approved' | 'rejected') {
    setApprovalBusy(approvalId)
    try {
      await updateApproval(client, project, approvalId, status)
      if (expandedReleaseId !== null) {
        await loadApprovals(expandedReleaseId)
        if (expandedDefId !== null) {
          const r = await listReleases(client, project, expandedDefId)
          setReleases(r)
        }
      }
    } catch (err) { console.error('Approval failed:', err) }
    finally {
      setApprovalBusy(null)
    }
  }

  async function handleDeploy(releaseId: number, environmentId: number) {
    setStageBusy(environmentId)
    try {
      await deployEnvironment(client, project, releaseId, environmentId)
      if (expandedDefId !== null) {
        const r = await listReleases(client, project, expandedDefId)
        setReleases(r)
      }
      await loadApprovals(releaseId)
    } catch (err) { console.error('Deploy failed:', err) }
    finally {
      setStageBusy(null)
    }
  }

  function toggleFavorite(defId: number) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(defId)) {
        next.delete(defId)
      } else {
        next.add(defId)
      }
      saveFavorites(project, next)
      return next
    })
  }

  const favDefs = definitions.filter(d => favorites.has(d.id))
  const otherDefs = definitions.filter(d => !favorites.has(d.id))

  function renderDefinition(d: ReleaseDefinition) {
    const isFav = favorites.has(d.id)
    return (
      <li key={d.id} className="def-item">
        <div className="def-row">
          <button
            className={`btn-fav ${isFav ? 'active' : ''}`}
            onClick={() => toggleFavorite(d.id)}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Icon path={isFav ? mdiStar : mdiStarOutline} size={0.85} />
          </button>
          <button
            className="def-toggle"
            onClick={() => toggleReleases(d.id)}
          >
            <span className="def-name">{d.name}</span>
          </button>
          <div className="btn-group">
            <button className="btn-action" onClick={() => reloadReleases(d.id)} title="Refresh releases">
              <Icon path={mdiRefresh} size={0.85} />
            </button>
          </div>
          <span className={`expand-icon row-chevron ${expandedDefId === d.id ? 'open' : ''}`} onClick={() => toggleReleases(d.id)}>
            <Icon path={mdiChevronDown} size={0.8} />
          </span>
        </div>
        {expandedDefId === d.id && (
          <div className="releases-panel">
            {releasesLoading && <p className="loading">Loading releases...</p>}
            <ul className="releases">
              {!releasesLoading && releases.length === 0 && (
                <li className="release-item muted">No releases found</li>
              )}
              {releases.map(r => {
                const buildArtifact = r.artifacts?.find(a => a.type === 'Build')
                const buildVersion = buildArtifact?.definitionReference?.version?.name
                const buildBranch = buildArtifact?.definitionReference?.branch?.name?.replace('refs/heads/', '')
                const isExpanded = expandedReleaseId === r.id
                return (
                  <li key={r.id} className="release-item-wrap">
                    <div className="release-item-row">
                      <button className="release-item-btn" onClick={() => toggleRelease(r.id)}>
                        <span className={`release-status ${mapStatus(r.status)}`} />
                        <div className="release-details">
                          <span className="release-name">
                            {r.name}
                            {buildVersion && (
                              <span className="release-build"> &bull; {buildVersion}</span>
                            )}
                          </span>
                          <span className="release-meta">
                            {r.environments.map(e => (
                              <span key={e.id} className={`env-badge ${mapStatus(e.status)}`}>
                                {e.name}
                              </span>
                            ))}
                          </span>
                          <span className="release-meta">
                            {buildBranch && (
                              <><span className="release-branch">{buildBranch}</span> &middot; </>
                            )}
                            {r.createdBy.displayName} &middot; {formatDate(r.createdOn)}
                          </span>
                        </div>
                      </button>
                      <div className="btn-group">
                        <button className="btn-action" onClick={e => { e.stopPropagation(); reloadRelease(r.id) }} title="Refresh">
                          <Icon path={mdiRefresh} size={0.7} />
                        </button>
                      </div>
                      <span className={`expand-icon row-chevron ${isExpanded ? 'open' : ''}`} onClick={() => toggleRelease(r.id)}>
                        <Icon path={mdiChevronDown} size={0.7} />
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="stages-panel">
                        {approvalsLoading && <p className="loading">Loading stages...</p>}
                        {!approvalsLoading && (
                          <ul className="stages">
                            {r.environments.map(env => {
                              const envApproval = approvals.find(a => a.releaseEnvironment.id === env.id)
                              const status = mapStatus(env.status)
                              const hasPendingApproval = envApproval && envApproval.status === 'pending'
                              const isRunning = status === 'inProgress'
                              const canDeploy = !isRunning && !hasPendingApproval
                              const isDeploy = status === 'notStarted'
                              return (
                                <li key={env.id} className={`stage-item stage-${status}`}>
                                  <span className="stage-name">{env.name}</span>
                                  <span className={`stage-status-text ${status}`}>{env.status}</span>
                                  {hasPendingApproval && (
                                    <div className="stage-actions">
                                      <button
                                        className="btn-approve"
                                        disabled={approvalBusy === envApproval.id}
                                        onClick={() => handleApproval(envApproval.id, 'approved')}
                                        title="Approve"
                                      >
                                        <Icon path={mdiCheck} size={0.75} />
                                      </button>
                                      <button
                                        className="btn-reject"
                                        disabled={approvalBusy === envApproval.id}
                                        onClick={() => handleApproval(envApproval.id, 'rejected')}
                                        title="Reject"
                                      >
                                        <Icon path={mdiClose} size={0.75} />
                                      </button>
                                    </div>
                                  )}
                                  {canDeploy && (
                                    <button
                                      className="btn-deploy"
                                      disabled={stageBusy === env.id}
                                      onClick={() => handleDeploy(r.id, env.id)}
                                      title={isDeploy ? 'Deploy' : 'Redeploy'}
                                    >
                                      <Icon path={mdiRocketLaunch} size={0.7} />
                                      {stageBusy === env.id ? ' ...' : isDeploy ? ' Deploy' : ' Redeploy'}
                                    </button>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="release-list">
      {error && <p className="error">{error}</p>}
      {loading && <p className="loading">Loading release definitions...</p>}

      {!loading && definitions.length === 0 && !error && (
        <p className="placeholder">No release definitions found</p>
      )}

      {favDefs.length > 0 && (
        <section className="release-section">
          <h3 className="section-title">Favorites</h3>
          <ul className="definitions">{favDefs.map(renderDefinition)}</ul>
        </section>
      )}

      {otherDefs.length > 0 && (
        <section className="release-section">
          <button
            className="section-toggle"
            onClick={() => setShowOther(v => !v)}
          >
            <span>Other definitions ({otherDefs.length})</span>
            <span className={`expand-icon ${showOther ? 'open' : ''}`}><Icon path={mdiChevronDown} size={0.8} /></span>
          </button>
          {showOther && (
            <ul className="definitions">{otherDefs.map(renderDefinition)}</ul>
          )}
        </section>
      )}

      {!loading && definitions.length > 0 && favDefs.length === 0 && otherDefs.length > 0 && !showOther && (
        <p className="hint">Tap the star to add favorites</p>
      )}
    </div>
  )
}

function mapStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === 'succeeded' || s === 'active') return 'succeeded'
  if (s === 'failed' || s === 'rejected') return 'failed'
  if (s === 'inprogress' || s === 'queued') return 'inProgress'
  if (s === 'notstarted' || s === 'notdeployed' || s === 'undefined') return 'notStarted'
  if (s === 'canceled' || s === 'cancelled') return 'canceled'
  return s
}
