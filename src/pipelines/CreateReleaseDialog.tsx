import { useEffect, useState } from 'react'
import type { DevOpsClient } from '../api/devops'
import type { PipelineRun } from '../api/pipelines'
import { listReleaseDefinitions, createRelease, type ReleaseDefinition } from '../api/releases'
import './RunPipelineDialog.css'

interface Props {
  client: DevOpsClient
  project: string
  run: PipelineRun
  onClose: () => void
}

export function CreateReleaseDialog({ client, project, run, onClose }: Props) {
  const [definitions, setDefinitions] = useState<ReleaseDefinition[]>([])
  const [selectedDefId, setSelectedDefId] = useState<number | null>(null)
  const [alias, setAlias] = useState('_' + run.pipeline.name)
  const [loading, setLoading] = useState(false)
  const [loadingDefs, setLoadingDefs] = useState(true)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  useEffect(() => {
    listReleaseDefinitions(client, project)
      .then(defs => {
        setDefinitions(defs)
        if (defs.length > 0) setSelectedDefId(defs[0].id)
      })
      .catch(() => setError('Failed to load release definitions'))
      .finally(() => setLoadingDefs(false))
  }, [client, project])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (selectedDefId === null) return
    setError('')
    setLoading(true)
    try {
      await createRelease(client, project, selectedDefId, run.id, alias)
      setCreated(true)
    } catch {
      setError('Failed to create release. Check permissions and artifact alias.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3>Create Release</h3>
        <p className="dialog-subtitle">From run #{run.id} ({run.pipeline.name})</p>

        {created ? (
          <div className="release-success">
            <p>Release created successfully!</p>
            <button type="button" className="btn-run" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            {loadingDefs ? (
              <p className="loading">Loading release definitions...</p>
            ) : definitions.length === 0 ? (
              <p className="error">No release definitions found in this project.</p>
            ) : (
              <>
                <label>
                  Release definition
                  <select
                    value={selectedDefId ?? ''}
                    onChange={e => setSelectedDefId(Number(e.target.value))}
                  >
                    {definitions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Artifact alias
                  <input
                    type="text"
                    value={alias}
                    onChange={e => setAlias(e.target.value)}
                    required
                  />
                </label>
              </>
            )}
            {error && <p className="error">{error}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn-run"
                disabled={loading || loadingDefs || definitions.length === 0}
              >
                {loading ? 'Creating...' : 'Create Release'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
