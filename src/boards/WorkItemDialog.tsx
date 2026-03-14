import { useEffect, useState } from 'react'
import type { DevOpsClient } from '../api/devops'
import { updateWorkItem, listTeamMembers, type WorkItem, type Board } from '../api/boards'
import './WorkItemDialog.css'

interface Props {
  client: DevOpsClient
  project: string
  team: string
  item: WorkItem
  board: Board
  onClose: () => void
  onUpdated: (item: WorkItem) => void
}

export function WorkItemDialog({ client, project, team, item, board, onClose, onUpdated }: Props) {
  const [column, setColumn] = useState(item.fields['System.BoardColumn'] ?? '')
  const [lane, setLane] = useState(item.fields['System.BoardLane'] ?? '')
  const [assignedTo, setAssignedTo] = useState(item.fields['System.AssignedTo']?.uniqueName ?? '')
  const [members, setMembers] = useState<{ displayName: string; uniqueName: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listTeamMembers(client, project, team)
      .then(setMembers)
      .catch(() => {})
  }, [client, project, team])

  // Reset form when item changes
  useEffect(() => {
    setColumn(item.fields['System.BoardColumn'] ?? '')
    setLane(item.fields['System.BoardLane'] ?? '')
    setAssignedTo(item.fields['System.AssignedTo']?.uniqueName ?? '')
    setError('')
  }, [item])

  const hasChanges =
    column !== (item.fields['System.BoardColumn'] ?? '') ||
    lane !== (item.fields['System.BoardLane'] ?? '') ||
    assignedTo !== (item.fields['System.AssignedTo']?.uniqueName ?? '')

  async function handleSave() {
    if (!hasChanges) return
    setSaving(true)
    setError('')
    try {
      const fields: Record<string, string> = {}
      if (column !== (item.fields['System.BoardColumn'] ?? '')) {
        fields['System.BoardColumn'] = column
      }
      if (lane !== (item.fields['System.BoardLane'] ?? '')) {
        fields['System.BoardLane'] = lane
      }
      if (assignedTo !== (item.fields['System.AssignedTo']?.uniqueName ?? '')) {
        fields['System.AssignedTo'] = assignedTo
      }
      const updated = await updateWorkItem(client, project, item.id, fields)
      onUpdated(updated)
    } catch {
      setError('Failed to update work item')
    } finally {
      setSaving(false)
    }
  }

  const description = item.fields['System.Description'] ?? ''
  const hasSwimLanes = board.rows.length > 1

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog wi-dialog" onClick={e => e.stopPropagation()}>
        <div className="wi-header">
          <span className={`wi-type wit-${item.fields['System.WorkItemType'].toLowerCase().replace(/\s/g, '-')}`}>
            {item.fields['System.WorkItemType']}
          </span>
          <span className="wi-id">#{item.id}</span>
        </div>
        <h3 className="wi-title">{item.fields['System.Title']}</h3>

        {description && (
          <div className="wi-description" dangerouslySetInnerHTML={{ __html: description }} />
        )}

        <div className="wi-fields">
          <label>
            Column
            <select value={column} onChange={e => setColumn(e.target.value)}>
              {board.columns.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>

          {hasSwimLanes && (
            <label>
              Swimlane
              <select value={lane} onChange={e => setLane(e.target.value)}>
                {board.rows.map(r => (
                  <option key={r.id} value={r.name ?? ''}>{r.name ?? '(Default)'}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            Assigned to
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.uniqueName} value={m.uniqueName}>{m.displayName}</option>
              ))}
            </select>
          </label>
        </div>

        {item.fields['System.Tags'] && (
          <div className="wi-tags">
            {item.fields['System.Tags'].split(';').map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} className="wi-tag">{tag}</span>
            ))}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
          {hasChanges && (
            <button type="button" className="btn-run" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
