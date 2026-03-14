import { useEffect, useState, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiRefresh, mdiChevronDown, mdiBug, mdiBookOpen, mdiCheckboxMarked, mdiCardText, mdiPlus, mdiMagnify, mdiClose } from '@mdi/js'
import type { DevOpsClient } from '../api/devops'
import {
  listTeams,
  listBoards,
  getBoard,
  queryLaneItems,
  queryLaneCounts,
  queryColumnItems,
  queryColumnCounts,
  searchWorkItems,
  getWorkItems,
  type TeamRef,
  type BoardRef,
  type Board,
  type WorkItem,
} from '../api/boards'
import { WorkItemDialog } from './WorkItemDialog'
import { NewWorkItemDialog } from './NewWorkItemDialog'
import './BoardView.css'

interface Props {
  client: DevOpsClient
  project: string
}

const WIT_ICONS: Record<string, string> = {
  Bug: mdiBug,
  'User Story': mdiBookOpen,
  Task: mdiCheckboxMarked,
}

const TEAM_KEY = (p: string) => `cn-devops-board-team-${p}`
const BOARD_KEY = (p: string) => `cn-devops-board-name-${p}`

function renderCard(item: WorkItem, onClick: () => void) {
  return (
    <li key={item.id} className="board-card" onClick={onClick}>
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

export function BoardView({ client, project }: Props) {
  const [teams, setTeams] = useState<TeamRef[]>([])
  const [team, setTeam] = useState('')
  const [boards, setBoards] = useState<BoardRef[]>([])
  const [boardName, setBoardName] = useState('')
  const [board, setBoard] = useState<Board | null>(null)
  const [hasSwimLanes, setHasSwimLanes] = useState(false)

  // Lane mode state (boards with swimlanes)
  const [laneCounts, setLaneCounts] = useState<Record<string, number>>({})
  const [laneItems, setLaneItems] = useState<Record<string, WorkItem[]>>({})
  const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set())
  const [activeCol, setActiveCol] = useState<Record<string, string>>({})
  const [loadingLanes, setLoadingLanes] = useState<Set<string>>(new Set())

  // Column mode state (boards without swimlanes)
  const [columnCounts, setColumnCounts] = useState<Record<string, number>>({})
  const [columnItems, setColumnItems] = useState<Record<string, WorkItem[]>>({})
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set())
  const [loadingCols, setLoadingCols] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WorkItem[] | null>(null)
  const [searching, setSearching] = useState(false)

  function selectTeam(name: string) {
    setTeam(name)
    localStorage.setItem(TEAM_KEY(project), name)
  }

  function selectBoard(name: string) {
    setBoardName(name)
    localStorage.setItem(BOARD_KEY(project), name)
  }

  useEffect(() => {
    if (!project) return
    setTeams([]); setTeam(''); setBoards([]); setBoardName('')
    setBoard(null)
    listTeams(client, project).then(t => {
      setTeams(t)
      if (t.length > 0) {
        const saved = localStorage.getItem(TEAM_KEY(project))
        const match = saved && t.find(x => x.name === saved)
        const def = match || t.find(x => x.name === project) || t[0]
        selectTeam(def.name)
      }
    }).catch(() => setError('Failed to load teams'))
  }, [client, project])

  useEffect(() => {
    if (!team) return
    setBoards([]); setBoardName(''); setBoard(null)
    listBoards(client, project, team).then(b => {
      setBoards(b)
      if (b.length > 0) {
        const saved = localStorage.getItem(BOARD_KEY(project))
        const match = saved && b.find(x => x.name === saved)
        const def = match || b[0]
        selectBoard(def.name)
      }
    }).catch(() => setError('Failed to load boards'))
  }, [client, project, team])

  function resetState() {
    setLaneCounts({}); setLaneItems({}); setExpandedLanes(new Set()); setActiveCol({}); setLoadingLanes(new Set())
    setColumnCounts({}); setColumnItems({}); setExpandedCols(new Set()); setLoadingCols(new Set())
  }

  const loadBoard = useCallback(async () => {
    if (!boardName || !team) return
    setLoading(true); setError('')
    resetState()
    try {
      const b = await getBoard(client, project, team, boardName)
      const namedRows = b.rows.filter(r => r.name !== null)
      const swimLanes = namedRows.length > 0
      setHasSwimLanes(swimLanes)

      const allowedTypes = [...new Set(b.columns.flatMap(c => Object.keys(c.stateMappings)))]

      if (swimLanes) {
        const hasDefault = b.rows.some(r => r.name === null)
        if (!hasDefault) {
          b.rows.unshift({ id: '__default__', name: null })
        }
        setBoard(b)
        const laneNames = b.rows.map(r => r.name)
        const counts = await queryLaneCounts(client, project, team, laneNames, allowedTypes)
        setLaneCounts(counts)
      } else {
        setBoard(b)
        // Skip last column (Done/Closed)
        const colNames = b.columns.slice(0, -1).map(c => c.name)
        const counts = await queryColumnCounts(client, project, team, colNames, allowedTypes)
        setColumnCounts(counts)
      }
    } catch {
      setError('Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [client, project, team, boardName])

  useEffect(() => { loadBoard() }, [loadBoard])

  // --- Lane mode helpers ---

  function laneKey(row: { name: string | null }) {
    return row.name ?? ''
  }

  function boardTypes(): string[] {
    if (!board) return []
    return [...new Set(board.columns.flatMap(c => Object.keys(c.stateMappings)))]
  }

  async function loadLane(row: { name: string | null }) {
    const key = laneKey(row)
    setLoadingLanes(prev => new Set(prev).add(key))
    try {
      const ids = await queryLaneItems(client, project, team, row.name, boardTypes())
      const wi = ids.length > 0 ? await getWorkItems(client, project, ids) : []
      setLaneItems(prev => ({ ...prev, [key]: wi }))
    } catch {
      setError('Failed to load lane')
    } finally {
      setLoadingLanes(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  function toggleLane(row: { name: string | null }) {
    const key = laneKey(row)
    setExpandedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        if (!laneItems[key]) loadLane(row)
      }
      return next
    })
  }

  function toggleCol(laneK: string, colName: string) {
    setActiveCol(prev => ({
      ...prev,
      [laneK]: prev[laneK] === colName ? '' : colName,
    }))
  }

  function columnsForLane(isDefault: boolean) {
    if (!board) return []
    if (isDefault) return board.columns.slice(0, 1)
    return board.columns.slice(1, -1)
  }

  function itemsForCol(allItems: WorkItem[], colName: string) {
    return allItems.filter(i => i.fields['System.BoardColumn'] === colName)
  }

  // --- Column mode helpers ---

  async function loadColumn(colName: string) {
    setLoadingCols(prev => new Set(prev).add(colName))
    try {
      const ids = await queryColumnItems(client, project, team, colName, boardTypes())
      const wi = ids.length > 0 ? await getWorkItems(client, project, ids) : []
      setColumnItems(prev => ({ ...prev, [colName]: wi }))
    } catch {
      setError(`Failed to load ${colName}`)
    } finally {
      setLoadingCols(prev => { const n = new Set(prev); n.delete(colName); return n })
    }
  }

  function toggleColumnDirect(colName: string) {
    setExpandedCols(prev => {
      const next = new Set(prev)
      if (next.has(colName)) {
        next.delete(colName)
      } else {
        next.add(colName)
        if (!columnItems[colName]) loadColumn(colName)
      }
      return next
    })
  }

  // --- Shared helpers ---

  function handleItemUpdated(updated: WorkItem) {
    if (hasSwimLanes) {
      const lk = updated.fields['System.BoardLane'] ?? ''
      setLaneItems(prev => ({
        ...prev,
        [lk]: (prev[lk] ?? []).map(i => i.id === updated.id ? updated : i),
      }))
    } else {
      const col = updated.fields['System.BoardColumn'] ?? ''
      setColumnItems(prev => ({
        ...prev,
        [col]: (prev[col] ?? []).map(i => i.id === updated.id ? updated : i),
      }))
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
        {teams.length > 1 && (
          <select value={team} onChange={e => selectTeam(e.target.value)} className="board-select">
            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        )}
        {boards.length > 1 && (
          <select value={boardName} onChange={e => selectBoard(e.target.value)} className="board-select">
            {boards.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
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
                      <> &middot; {item.fields['System.AssignedTo'].displayName}</>
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
            const isExpanded = expandedCols.has(col.name)
            const isLoading = loadingCols.has(col.name)
            const items = columnItems[col.name]
            const count = columnCounts[col.name] ?? 0
            return (
              <div key={col.id} className="board-lane">
                <button className="board-lane-header" onClick={() => toggleColumnDirect(col.name)}>
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
                        {items.length === 0 && (
                          <li className="board-card muted">No items</li>
                        )}
                        {items.map(item => renderCard(item, () => setSelectedItem(item)))}
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
            const lk = laneKey(row)
            const isDefault = row.name === null
            const isExpanded = expandedLanes.has(lk)
            const isLoading = loadingLanes.has(lk)
            const items = laneItems[lk]
            const count = laneCounts[lk] ?? 0
            const activeName = activeCol[lk] ?? ''
            const cols = columnsForLane(isDefault)

            return (
              <div key={row.id} className="board-lane">
                <button className="board-lane-header" onClick={() => toggleLane(row)}>
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
                        {items.length === 0 && (
                          <li className="board-card muted">No items</li>
                        )}
                        {items.map(item => renderCard(item, () => setSelectedItem(item)))}
                      </ul>
                    )}
                  </>
                )}

                {isExpanded && !isDefault && (
                  <div className="board-columns-row">
                    {isLoading && <p className="loading">Loading...</p>}
                    {items && cols.map(col => {
                      const colItems = itemsForCol(items, col.name)
                      const isActive = activeName === col.name
                      return (
                        <div key={col.id} className={`board-col-strip ${isActive ? 'active' : ''}`}>
                          <button
                            className="board-col-tab"
                            onClick={() => toggleCol(lk, col.name)}
                          >
                            <span className="board-col-tab-name">{col.name}</span>
                            <span className="board-col-tab-count">{colItems.length}</span>
                          </button>
                          {isActive && (
                            <ul className="board-cards">
                              {colItems.length === 0 && (
                                <li className="board-card muted">No items</li>
                              )}
                              {colItems.map(item => renderCard(item, () => setSelectedItem(item)))}
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
          workItemTypes={[...new Set(board.columns.flatMap(c => Object.keys(c.stateMappings)))]}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadBoard() }}
        />
      )}
    </div>
  )
}
