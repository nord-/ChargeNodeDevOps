import { useEffect, useState } from 'react'
import type { DevOpsClient } from '../api/devops'
import { runPipeline, listBranches } from '../api/pipelines'
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
  const [branches, setBranches] = useState<string[]>([])
  const [branch, setBranch] = useState('')
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listBranches(client, project, pipelineId)
      .then(b => {
        setBranches(b)
        if (b.length > 0) {
          const main = b.find(name => name === 'main') ?? b.find(name => name === 'master') ?? b[0]
          setBranch(main)
        }
      })
      .catch(() => setError('Failed to load branches'))
      .finally(() => setLoadingBranches(false))
  }, [client, project, pipelineId])

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    if (!branch) return
    setError('')
    setLoading(true)
    try {
      await runPipeline(client, project, pipelineId, branch)
      onStarted()
    } catch {
      setError('Failed to start pipeline. Check permissions.')
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
            {loadingBranches ? (
              <select disabled><option>Loading...</option></select>
            ) : branches.length > 0 ? (
              <select value={branch} onChange={e => setBranch(e.target.value)}>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="main"
                required
              />
            )}
          </label>
          {error && <p className="error">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-run" disabled={loading || loadingBranches || !branch}>
              {loading ? 'Starting...' : 'Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
