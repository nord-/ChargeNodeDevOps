import { useEffect, useState, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiStar, mdiStarOutline, mdiPlay, mdiChevronDown, mdiRocketLaunch, mdiRefresh } from '@mdi/js'
import type { DevOpsClient } from '../api/devops'
import { listPipelines, listPipelineRuns, runPipeline, type Pipeline, type PipelineRun } from '../api/pipelines'
import { formatDate } from '../formatDate'
import { RunPipelineDialog } from './RunPipelineDialog'
import { CreateReleaseDialog } from './CreateReleaseDialog'
import './PipelineList.css'

const FAV_KEY = 'cn-devops-fav-pipelines'

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

export function PipelineList({ client, project }: Props) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [runTarget, setRunTarget] = useState<Pipeline | null>(null)
  const [releaseRun, setReleaseRun] = useState<PipelineRun | null>(null)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [showOther, setShowOther] = useState(false)
  const [quickRun, setQuickRun] = useState<{ pipelineId: number; branch: string } | null>(null)
  const [quickRunning, setQuickRunning] = useState(false)

  useEffect(() => {
    if (!project) return
    setLoading(true)
    setError('')
    setPipelines([])
    setExpandedId(null)
    setShowOther(false)
    setFavorites(loadFavorites(project))
    listPipelines(client, project)
      .then(setPipelines)
      .catch(() => setError('Failed to load pipelines'))
      .finally(() => setLoading(false))
  }, [client, project])

  const loadRuns = useCallback(async (pipelineId: number) => {
    setRuns([])
    setRunsLoading(true)
    try {
      const r = await listPipelineRuns(client, project, pipelineId)
      setRuns(r)
    } catch {
      setRuns([])
    } finally {
      setRunsLoading(false)
    }
  }, [client, project])

  function toggleRuns(pipelineId: number) {
    if (expandedId === pipelineId) {
      setExpandedId(null)
      return
    }
    setExpandedId(pipelineId)
    loadRuns(pipelineId)
  }

  function toggleFavorite(pipelineId: number) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(pipelineId)) {
        next.delete(pipelineId)
      } else {
        next.add(pipelineId)
      }
      saveFavorites(project, next)
      return next
    })
  }

  function handleRunStarted() {
    setRunTarget(null)
    if (expandedId !== null) {
      loadRuns(expandedId)
    }
  }

  async function handleQuickRunConfirm() {
    if (!quickRun) return
    setQuickRunning(true)
    try {
      await runPipeline(client, project, quickRun.pipelineId, quickRun.branch)
      setQuickRun(null)
      if (expandedId === quickRun.pipelineId) {
        loadRuns(expandedId)
      }
    } catch {
      setQuickRun(null)
    } finally {
      setQuickRunning(false)
    }
  }

  const favPipelines = pipelines.filter(p => favorites.has(p.id))
  const otherPipelines = pipelines.filter(p => !favorites.has(p.id))

  function renderPipeline(p: Pipeline) {
    const isFav = favorites.has(p.id)
    return (
      <li key={p.id} className="pipeline-item">
        <div className="pipeline-row">
          <button
            className={`btn-fav ${isFav ? 'active' : ''}`}
            onClick={() => toggleFavorite(p.id)}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Icon path={isFav ? mdiStar : mdiStarOutline} size={0.85} />
          </button>
          <button
            className="pipeline-toggle"
            onClick={() => toggleRuns(p.id)}
          >
            <span className="pipeline-name">{p.name}</span>
          </button>
          <div className="btn-group">
            <button className="btn-action" onClick={() => loadRuns(p.id)} title="Refresh runs">
              <Icon path={mdiRefresh} size={0.85} />
            </button>
            <button
              className="btn-action btn-action-primary"
              onClick={e => { e.stopPropagation(); setRunTarget(p) }}
              title="Run pipeline"
            >
              <Icon path={mdiPlay} size={0.85} />
            </button>
          </div>
          <span className={`expand-icon row-chevron ${expandedId === p.id ? 'open' : ''}`} onClick={() => toggleRuns(p.id)}>
            <Icon path={mdiChevronDown} size={0.8} />
          </span>
        </div>
        {expandedId === p.id && (
          <div className="runs-panel">
            {runsLoading && <p className="loading">Loading runs...</p>}
            <ul className="runs">
              {!runsLoading && runs.length === 0 && <li className="run-item muted">No runs found</li>}
              {runs.map(r => (
                <li key={r.id} className="run-item">
                  <span className={`run-status ${r.result ?? r.status}`} />
                  <div className="run-details">
                    <span className="run-name">
                      #{r.buildNumber}
                      {r.triggerInfo?.['ci.message'] && (
                        <span className="run-description"> &bull; {r.triggerInfo['ci.message']}</span>
                      )}
                    </span>
                    <span className="run-meta">
                      {r.sourceBranch && (
                        <button
                          className="run-branch-btn"
                          onClick={() => setQuickRun({ pipelineId: p.id, branch: r.sourceBranch.replace('refs/heads/', '') })}
                          title={`Run on ${r.sourceBranch.replace('refs/heads/', '')}`}
                        >
                          {r.sourceBranch.replace('refs/heads/', '')}
                        </button>
                      )}
                      {r.sourceBranch && ' \u00b7 '}
                      {r.result ?? r.status}
                      {' \u00b7 '}
                      {formatDate(r.startTime ?? r.queueTime)}
                    </span>
                  </div>
                  {r.result === 'succeeded' && (
                    <button
                      className="btn-release"
                      onClick={() => setReleaseRun(r)}
                      title="Create release from this run"
                    >
                      <Icon path={mdiRocketLaunch} size={0.6} /> Release
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="pipeline-list">
      {error && <p className="error">{error}</p>}
      {loading && <p className="loading">Loading pipelines...</p>}

      {favPipelines.length > 0 && (
        <section className="pipeline-section">
          <h3 className="section-title">Favorites</h3>
          <ul className="pipelines">{favPipelines.map(renderPipeline)}</ul>
        </section>
      )}

      {otherPipelines.length > 0 && (
        <section className="pipeline-section">
          <button
            className="section-toggle"
            onClick={() => setShowOther(v => !v)}
          >
            <span>Other pipelines ({otherPipelines.length})</span>
            <span className={`expand-icon ${showOther ? 'open' : ''}`}><Icon path={mdiChevronDown} size={0.8} /></span>
          </button>
          {showOther && (
            <ul className="pipelines">{otherPipelines.map(renderPipeline)}</ul>
          )}
        </section>
      )}

      {!loading && pipelines.length > 0 && favPipelines.length === 0 && otherPipelines.length > 0 && !showOther && (
        <p className="hint">Tap the star to add favorites</p>
      )}

      {runTarget && (
        <RunPipelineDialog
          client={client}
          project={project}
          pipelineId={runTarget.id}
          pipelineName={runTarget.name}
          onClose={() => setRunTarget(null)}
          onStarted={handleRunStarted}
        />
      )}

      {releaseRun && (
        <CreateReleaseDialog
          client={client}
          project={project}
          run={releaseRun}
          onClose={() => setReleaseRun(null)}
        />
      )}

      {quickRun && (
        <div className="dialog-backdrop" onClick={() => setQuickRun(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Run pipeline</h3>
            <p>Start a build on <strong>{quickRun.branch}</strong>?</p>
            <div className="dialog-actions">
              <button className="btn-cancel" onClick={() => setQuickRun(null)}>Cancel</button>
              <button className="btn-run" onClick={handleQuickRunConfirm} disabled={quickRunning}>
                {quickRunning ? 'Starting...' : 'Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
