import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { createClient } from '../api/devops'
import { listProjects, type Project } from '../api/projects'
import { listPipelines, listPipelineRuns, type Pipeline, type PipelineRun } from '../api/pipelines'
import './PipelineList.css'

export function PipelineList() {
  const { auth } = useAuth()
  const client = useMemo(() => auth ? createClient(auth.organization, auth.token) : null, [auth])

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!client) return
    listProjects(client).then(p => {
      setProjects(p)
      if (p.length > 0) setSelectedProject(p[0].name)
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

  async function toggleRuns(pipelineId: number) {
    if (expandedId === pipelineId) {
      setExpandedId(null)
      return
    }
    if (!client) return
    setExpandedId(pipelineId)
    setRuns([])
    try {
      const r = await listPipelineRuns(client, selectedProject, pipelineId)
      setRuns(r)
    } catch {
      setRuns([])
    }
  }

  return (
    <div className="pipeline-list">
      <div className="project-selector">
        <select
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
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
            <button
              className="pipeline-row"
              onClick={() => toggleRuns(p.id)}
            >
              <span className="pipeline-name">{p.name}</span>
              <span className={`expand-icon ${expandedId === p.id ? 'open' : ''}`}>&#9662;</span>
            </button>
            {expandedId === p.id && (
              <ul className="runs">
                {runs.length === 0 && <li className="run-item muted">No recent runs</li>}
                {runs.slice(0, 5).map(r => (
                  <li key={r.id} className="run-item">
                    <span className={`run-status ${r.result ?? r.state}`} />
                    <span className="run-name">#{r.id}</span>
                    <span className="run-info">
                      {r.result ?? r.state}
                    </span>
                    <span className="run-date">
                      {new Date(r.createdDate).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
