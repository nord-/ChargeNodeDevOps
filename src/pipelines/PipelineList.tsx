import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'
import { createClient } from '../api/devops'
import { listProjects, type Project } from '../api/projects'
import { listPipelines, listPipelineRuns, type Pipeline, type PipelineRun } from '../api/pipelines'
import { RunPipelineDialog } from './RunPipelineDialog'
import { CreateReleaseDialog } from './CreateReleaseDialog'
import './PipelineList.css'

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

  function handleRunStarted() {
    setRunTarget(null)
    if (expandedId !== null) {
      loadRuns(expandedId)
    }
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

      <ul className="pipelines">
        {pipelines.map(p => (
          <li key={p.id} className="pipeline-item">
            <div className="pipeline-row">
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
                      <span className={`run-status ${r.result ?? r.state}`} />
                      <span className="run-name">#{r.id}</span>
                      <span className="run-info">{r.result ?? r.state}</span>
                      <span className="run-date">
                        {new Date(r.createdDate).toLocaleDateString()}
                      </span>
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
        ))}
      </ul>

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
