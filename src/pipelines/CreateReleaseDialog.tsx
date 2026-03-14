import { useEffect, useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiClose } from '@mdi/js'
import { errorMessage, type DevOpsClient } from '../api/devops'
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
  const [loading, setLoading] = useState(false)
  const [loadingDefs, setLoadingDefs] = useState(true)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  useEffect(() => {
    listReleaseDefinitions(client, project)
      .then(allDefs => {
        const buildDefId = String(run.definition.id)
        const matching = allDefs.filter(d =>
          d.artifacts?.some(a =>
            a.type === 'Build' && a.definitionReference?.definition?.id === buildDefId
          )
        )
        setDefinitions(matching)
        if (matching.length > 0) setSelectedDefId(matching[0].id)
      })
      .catch(err => setError(`Failed to load release definitions: ${errorMessage(err)}`))
      .finally(() => setLoadingDefs(false))
  }, [client, project, run.definition.id])

  function getAlias(): string {
    if (selectedDefId === null) return ''
    const def = definitions.find(d => d.id === selectedDefId)
    if (!def) return ''
    const buildDefId = String(run.definition.id)
    const artifact = def.artifacts?.find(a =>
      a.type === 'Build' && a.definitionReference?.definition?.id === buildDefId
    )
    return artifact?.alias ?? ''
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (selectedDefId === null) return
    const alias = getAlias()
    if (!alias) return
    setError('')
    setLoading(true)
    try {
      await createRelease(client, project, selectedDefId, run.id, alias)
      setCreated(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}><Icon path={mdiClose} size={0.8} /></button>
        <h3>Create Release</h3>
        <p className="dialog-subtitle">From build #{run.buildNumber}</p>

        {created ? (
          <div className="release-success">
            <p>Release created successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            {loadingDefs ? (
              <p className="loading">Loading release definitions...</p>
            ) : definitions.length === 0 ? (
              <p className="error">No matching release definitions found for this pipeline.</p>
            ) : definitions.length === 1 ? (
              <p>Release definition: <strong>{definitions[0].name}</strong></p>
            ) : (
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
            )}
            {error && <p className="error">{error}</p>}
            <div className="dialog-actions">
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
