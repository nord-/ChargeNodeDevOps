import { useState } from 'react'
import type { DevOpsClient } from '../api/devops'
import { runPipeline } from '../api/pipelines'
import './RunPipelineDialog.css'

interface Props {
  client: DevOpsClient
  project: string
  pipelineId: number
  pipelineName: string
  onClose: () => void
  onStarted: () => void
}

export function RunPipelineDialog({ client, project, pipelineId, pipelineName, onClose, onStarted }: Props) {
  const [branch, setBranch] = useState('main')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await runPipeline(client, project, pipelineId, branch)
      onStarted()
    } catch {
      setError('Failed to start pipeline. Check branch name and permissions.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3>Run {pipelineName}</h3>
        <form onSubmit={handleRun}>
          <label>
            Branch
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
              required
              autoFocus
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-run" disabled={loading}>
              {loading ? 'Starting...' : 'Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
