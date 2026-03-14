import { useEffect, useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiClose } from '@mdi/js'
import { errorMessage, type DevOpsClient } from '../api/devops'
import { createWorkItem, listTeamMembers, type WorkItem } from '../api/boards'
import './NewWorkItemDialog.css'

interface Props {
  client: DevOpsClient
  project: string
  team: string
  workItemTypes: string[]
  onClose: () => void
  onCreated: (item: WorkItem) => void
}

export function NewWorkItemDialog({ client, project, team, workItemTypes, onClose, onCreated }: Props) {
  const [type, setType] = useState(workItemTypes[0] ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [members, setMembers] = useState<{ displayName: string; uniqueName: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listTeamMembers(client, project, team)
      .then(setMembers)
      .catch(err => console.error('Failed to load team members:', err))
  }, [client, project, team])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      const fields: Record<string, string> = {
        'System.Title': title.trim(),
      }
      if (description.trim()) {
        fields['System.Description'] = description.trim()
      }
      if (assignedTo) {
        fields['System.AssignedTo'] = assignedTo
      }
      const item = await createWorkItem(client, project, type, fields)
      onCreated(item)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog wi-new-dialog" onClick={e => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}><Icon path={mdiClose} size={0.8} /></button>
        <h3>New work item</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Type
            <select value={type} onChange={e => setType(e.target.value)}>
              {workItemTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Work item title"
              required
              autoFocus
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Markdown supported"
              rows={6}
            />
          </label>

          <label>
            Assigned to
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.uniqueName} value={m.uniqueName}>{m.displayName}</option>
              ))}
            </select>
          </label>

          {error && <p className="error">{error}</p>}

          <div className="dialog-actions">
            <button type="submit" className="btn-run" disabled={saving || !title.trim()}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
