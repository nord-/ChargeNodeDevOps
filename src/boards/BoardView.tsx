import { useEffect, useState, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiRefresh, mdiChevronDown, mdiBug, mdiBookOpen, mdiCheckboxMarked, mdiCardText, mdiPlus, mdiMagnify, mdiClose } from '@mdi/js'
import type { DevOpsClient } from '../api/devops'
import {
  getBoard,
  queryLaneItems,
  queryLaneCounts,
  queryColumnItems,
  queryColumnCounts,
  searchWorkItems,
  getWorkItems,
  type Board,
  type WorkItem,
} from '../api/boards'
import { useBoardSelector } from './useBoardSelector'
import { useLazyItems } from './useLazyItems'
import { WorkItemCard } from './WorkItemCard'
import { WorkItemDialog } from './WorkItemDialog'
import { NewWorkItemDialog } from './NewWorkItemDialog'
import './BoardView.css'

interface Props {
  client: DevOpsClient
  project: string
}

function boardTypes(board: Board): string[] {
  return [...new Set(board.columns.flatMap(c => Object.keys(c.stateMappings)))]
}

export function BoardView({ client, project }: Props) {
  const selector = useBoardSelector(client, project)
  const { team, boardName, error, setError } = selector

  const [board, setBoard] = useState<Board | null>(null)
  const [hasSwimLanes, setHasSwimLanes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WorkItem[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Active column per lane (swimlane mode accordion)
  const [activeCol, setActiveCol] = useState<Record<string, string>>({})

  const lanes = useLazyItems(async (key) => {
    const laneName = key === '' ? null : key
    const types = board ? boardTypes(board) : []
    const ids = await queryLaneItems(client, project, team, laneName, types)
    return ids.length > 0 ? await getWorkItems(client, project, ids) : []
  })

  const columns = useLazyItems(async (key) => {
    const types = board ? boardTypes(board) : []
    const ids = await queryColumnItems(client, project, team, key, types)
    return ids.length > 0 ? await getWorkItems(client, project, ids) : []
  })

  const loadBoard = useCallback(async () => {
    if (!boardName || !team) return
    setLoading(true); setError('')
    lanes.reset(); columns.reset(); setActiveCol({})
    try {
      const b = await getBoard(client, project, team, boardName)
      const swimLanes = b.rows.some(r => r.name !== null)
      setHasSwimLanes(swimLanes)

      const types = boardTypes(b)

      if (swimLanes) {
        if (!b.rows.some(r => r.name === null)) {
          b.rows.unshift({ id: '__default__', name: null })
        }
        setBoard(b)
        const counts = await queryLaneCounts(client, project, team, b.rows.map(r => r.name), types)
        lanes.setCounts(counts)
      } else {
        setBoard(b)
        const colNames = b.columns.slice(0, -1).map(c => c.name)
        const counts = await queryColumnCounts(client, project, team, colNames, types)
        columns.setCounts(counts)
      }
    } catch {
      setError('Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [client, project, team, boardName])

  useEffect(() => { loadBoard() }, [loadBoard])

  function columnsForLane(isDefault: boolean) {
    if (!board) return []
    return isDefault ? board.columns.slice(0, 1) : board.columns.slice(1, -1)
  }

  function handleItemUpdated(updated: WorkItem) {
    if (hasSwimLanes) {
      lanes.moveItem(updated, updated.fields['System.BoardLane'] as string ?? '')
    } else {
      columns.moveItem(updated, updated.fields['System.BoardColumn'] as string ?? '')
    }
    setSelectedItem(updated)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true); setSearchResults(null)
    try {
      const ids = await searchWorkItems(client, project, team, q)
      const wi = ids.length > 0 ? await getWorkItems(client, project, ids) : []
      setSearchResults(wi)
    } catch {
      setError('Search failed')
    } finally {
      setSearching(false)
    }
  }

  function closeSearch() {
    setShowSearch(false); setSearchQuery(''); setSearchResults(null)
  }

  return (
    <div className="board-view">
      <div className="board-controls">
        {selector.teams.length > 1 && (
          <select value={team} onChange={e => selector.selectTeam(e.target.value)} className="board-select">
            {selector.teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        )}
        {selector.boards.length > 1 && (
          <select value={boardName} onChange={e => selector.selectBoard(e.target.value)} className="board-select">
            {selector.boards.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        )}
        <div className="btn-group">
          <button className="btn-action btn-action-primary" onClick={() => setShowNew(true)} title="New work item">
            <Icon path={mdiPlus} size={0.85} />
          </button>
          <button className="btn-action" onClick={() => setShowSearch(s => !s)} title="Search">
            <Icon path={mdiMagnify} size={0.85} />
          </button>
          <button className="btn-action" onClick={loadBoard} title="Refresh board">
            <Icon path={mdiRefresh} size={0.85} />
          </button>
        </div>
      </div>

      {showSearch && (
        <form className="board-search" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search work items..."
            autoFocus
          />
          <button type="button" className="board-search-close" onClick={closeSearch} title="Close search">
            <Icon path={mdiClose} size={0.7} />
          </button>
        </form>
      )}

      {searching && <p className="loading">Searching...</p>}

      {searchResults && !searching && (
        <div className="board-search-results">
          <p className="board-search-count">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
          <ul className="board-cards">
            {searchResults.map(item => (
              <li key={item.id} className="board-card" onClick={() => setSelectedItem(item)}>
                <Icon
                  path={WIT_ICONS[item.fields['System.WorkItemType']] ?? mdiCardText}
                  size={0.7}
                  className={`wit-icon wit-${item.fields['System.WorkItemType'].toLowerCase().replace(/\s/g, '-')}`}
                />
                <div className="card-details">
                  <span className="card-title">{item.fields['System.Title']}</span>
                  <span className="card-meta">
                    {item.fields['System.BoardColumn']}
                    {item.fields['System.AssignedTo'] && (
                      <> &middot; {(item.fields['System.AssignedTo'] as { displayName: string }).displayName}</>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p className="loading">Loading board...</p>}

      {/* Column mode: no swimlanes */}
      {board && !loading && !hasSwimLanes && (
        <div className="board-lanes">
          {board.columns.slice(0, -1).map(col => {
            const isExpanded = columns.expanded.has(col.name)
            const isLoading = columns.loading.has(col.name)
            const items = columns.items[col.name]
            const count = columns.counts[col.name] ?? 0
            return (
              <div key={col.id} className="board-lane">
                <button className="board-lane-header" onClick={() => columns.toggle(col.name)}>
                  <span className="board-lane-name">{col.name}</span>
                  <span className="board-column-count">{count}</span>
                  <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>
                    <Icon path={mdiChevronDown} size={0.7} />
                  </span>
                </button>
                {isExpanded && (
                  <>
                    {isLoading && <p className="loading">Loading...</p>}
                    {items && (
                      <ul className="board-cards">
                        {items.length === 0 && <li className="board-card muted">No items</li>}
                        {items.map(item => <WorkItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lane mode: with swimlanes */}
      {board && !loading && hasSwimLanes && (
        <div className="board-lanes">
          {board.rows.map(row => {
            const lk = row.name ?? ''
            const isDefault = row.name === null
            const isExpanded = lanes.expanded.has(lk)
            const isLoading = lanes.loading.has(lk)
            const items = lanes.items[lk]
            const count = lanes.counts[lk] ?? 0
            const activeName = activeCol[lk] ?? ''
            const cols = columnsForLane(isDefault)

            return (
              <div key={row.id} className="board-lane">
                <button className="board-lane-header" onClick={() => lanes.toggle(lk)}>
                  <span className="board-lane-name">{row.name ?? 'Backlog'}</span>
                  <span className="board-column-count">{count}</span>
                  <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>
                    <Icon path={mdiChevronDown} size={0.7} />
                  </span>
                </button>

                {isExpanded && isDefault && (
                  <>
                    {isLoading && <p className="loading">Loading...</p>}
                    {items && (
                      <ul className="board-cards">
                        {items.length === 0 && <li className="board-card muted">No items</li>}
                        {items.map(item => <WorkItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                      </ul>
                    )}
                  </>
                )}

                {isExpanded && !isDefault && (
                  <div className="board-columns-row">
                    {isLoading && <p className="loading">Loading...</p>}
                    {items && cols.map(col => {
                      const colItems = items.filter(i => i.fields['System.BoardColumn'] === col.name)
                      const isActive = activeName === col.name
                      return (
                        <div key={col.id} className={`board-col-strip ${isActive ? 'active' : ''}`}>
                          <button
                            className="board-col-tab"
                            onClick={() => setActiveCol(prev => ({
                              ...prev,
                              [lk]: prev[lk] === col.name ? '' : col.name,
                            }))}
                          >
                            <span className="board-col-tab-name">{col.name}</span>
                            <span className="board-col-tab-count">{colItems.length}</span>
                          </button>
                          {isActive && (
                            <ul className="board-cards">
                              {colItems.length === 0 && <li className="board-card muted">No items</li>}
                              {colItems.map(item => <WorkItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedItem && board && (
        <WorkItemDialog
          client={client}
          project={project}
          team={team}
          item={selectedItem}
          board={board}
          onClose={() => setSelectedItem(null)}
          onUpdated={handleItemUpdated}
        />
      )}

      {showNew && board && (
        <NewWorkItemDialog
          client={client}
          project={project}
          team={team}
          workItemTypes={boardTypes(board)}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadBoard() }}
        />
      )}
    </div>
  )
}

const WIT_ICONS: Record<string, string> = {
  Bug: mdiBug,
  'User Story': mdiBookOpen,
  Task: mdiCheckboxMarked,
}
