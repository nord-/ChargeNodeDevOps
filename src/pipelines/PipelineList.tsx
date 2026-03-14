import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { createClient } from '../api/devops'
import { listProjects, type Project } from '../api/projects'
import { listPipelines, listPipelineRuns, type Pipeline, type PipelineRun } from '../api/pipelines'
import { RunPipelineDialog } from './RunPipelineDialog'
import { CreateReleaseDialog } from './CreateReleaseDialog'
import './PipelineList.css'

const FAV_KEY = 'cn-devops-fav-pipelines'

function loadFavorites(project: string): Set<number> {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return new Set()
    const data = JSON.parse(raw)
    const ids: number[] = data[project] ?? []
    return new Set(ids)
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

export function PipelineList() {
  const { auth } = useAuth()
  const client = useMemo(() => auth ? createClient(auth.organization, auth.token) : null, [auth])

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState(
    () => localStorage.getItem('cn-devops-project') ?? ''
  )
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

  useEffect(() => {
    if (!client) return
    listProjects(client).then(p => {
      setProjects(p)
      const saved = localStorage.getItem('cn-devops-project')
      const match = saved && p.some(proj => proj.name === saved)
      if (!match && p.length > 0) setSelectedProject(p[0].name)
    }).catch(() => setError('Failed to load projects'))
  }, [client])

  useEffect(() => {
    if (!client || !selectedProject) return
    setLoading(true)
    setError('')
    setPipelines([])
    setExpandedId(null)
    setShowOther(false)
    setFavorites(loadFavorites(selectedProject))
    listPipelines(client, selectedProject)
      .then(setPipelines)
      .catch(() => setError('Failed to load pipelines'))
      .finally(() => setLoading(false))
  }, [client, selectedProject])

  const loadRuns = useCallback(async (pipelineId: number) => {
    if (!client) return
    setRuns([])
    setRunsLoading(true)
    try {
      const r = await listPipelineRuns(client, selectedProject, pipelineId)
      setRuns(r)
    } catch {
      setRuns([])
    } finally {
      setRunsLoading(false)
    }
  }, [client, selectedProject])

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
      saveFavorites(selectedProject, next)
      return next
    })
  }

  function handleRunStarted() {
    setRunTarget(null)
    if (expandedId !== null) {
      loadRuns(expandedId)
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
            {isFav ? '\u2605' : '\u2606'}
          </button>
          <button
            className="pipeline-toggle"
            onClick={() => toggleRuns(p.id)}
          >
            <span className="pipeline-name">{p.name}</span>
            <span className={`expand-icon ${expandedId === p.id ? 'open' : ''}`}>&#9662;</span>
          </button>
          <button
            className="btn-run-small"
            onClick={e => { e.stopPropagation(); setRunTarget(p) }}
            title="Run pipeline"
          >
            &#9654;
          </button>
        </div>
        {expandedId === p.id && (
          <div className="runs-panel">
            <div className="runs-header">Runs</div>
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
                        <span className="run-branch">{r.sourceBranch.replace('refs/heads/', '')}</span>
                      )}
                      {r.sourceBranch && ' \u00b7 '}
                      {r.result ?? r.status}
                      {' \u00b7 '}
                      {new Date(r.startTime ?? r.queueTime).toLocaleString()}
                    </span>
                  </div>
                  {r.result === 'succeeded' && (
                    <button
                      className="btn-release"
                      onClick={() => setReleaseRun(r)}
                      title="Create release from this run"
                    >
                      Release
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
      <div className="project-selector">
        <select
          value={selectedProject}
          onChange={e => {
            setSelectedProject(e.target.value)
            localStorage.setItem('cn-devops-project', e.target.value)
          }}
        >
          {projects.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

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
            <span className={`expand-icon ${showOther ? 'open' : ''}`}>&#9662;</span>
          </button>
          {showOther && (
            <ul className="pipelines">{otherPipelines.map(renderPipeline)}</ul>
          )}
        </section>
      )}

      {!loading && pipelines.length > 0 && favPipelines.length === 0 && otherPipelines.length > 0 && !showOther && (
        <p className="hint">Tap the star to add favorites</p>
      )}

      {runTarget && client && (
        <RunPipelineDialog
          client={client}
          project={selectedProject}
          pipelineId={runTarget.id}
          pipelineName={runTarget.name}
          onClose={() => setRunTarget(null)}
          onStarted={handleRunStarted}
        />
      )}

      {releaseRun && client && (
        <CreateReleaseDialog
          client={client}
          project={selectedProject}
          run={releaseRun}
          onClose={() => setReleaseRun(null)}
        />
      )}
    </div>
  )
}
