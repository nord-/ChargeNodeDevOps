import { Icon } from '@mdi/react'
import { mdiBug, mdiBookOpen, mdiCheckboxMarked, mdiCardText } from '@mdi/js'
import type { WorkItem } from '../api/boards'

const WIT_ICONS: Record<string, string> = {
  Bug: mdiBug,
  'User Story': mdiBookOpen,
  Task: mdiCheckboxMarked,
}

interface Props {
  item: WorkItem
  onClick: () => void
}

export function WorkItemCard({ item, onClick }: Props) {
  return (
    <li className="board-card" onClick={onClick}>
      <Icon
        path={WIT_ICONS[item.fields['System.WorkItemType']] ?? mdiCardText}
        size={0.7}
        className={`wit-icon wit-${item.fields['System.WorkItemType'].toLowerCase().replace(/\s/g, '-')}`}
      />
      <div className="card-details">
        <span className="card-title">{item.fields['System.Title']}</span>
        {item.fields['System.AssignedTo'] && (
          <span className="card-meta">{item.fields['System.AssignedTo'].displayName}</span>
        )}
      </div>
    </li>
  )
}
