import type { DevOpsClient } from './devops'

export interface BoardRef {
  id: string
  name: string
}

export interface BoardColumn {
  id: string
  name: string
  isSplit: boolean
  stateMappings: Record<string, string>
}

export interface BoardRow {
  id: string
  name: string | null
}

export interface Board {
  id: string
  name: string
  columns: BoardColumn[]
  rows: BoardRow[]
}

export interface WorkItem {
  id: number
  fields: {
    'System.Title': string
    'System.State': string
    'System.WorkItemType': string
    'System.AssignedTo'?: { displayName: string; uniqueName: string }
    'System.Description'?: string
    'System.BoardColumn'?: string
    'System.BoardLane'?: string
    'System.Tags'?: string
    'Microsoft.VSTS.Common.Priority'?: number
    [key: string]: unknown
  }
}

export interface TeamRef {
  id: string
  name: string
}

interface WiqlResult {
  workItems: { id: number }[]
}

interface WorkItemBatchResult {
  value: WorkItem[]
  count: number
}

// ── Helpers ──────────────────────────────────────────────────────────

function esc(value: string): string {
  return value.replace(/'/g, "''")
}

function wiqlPath(project: string, team: string): string {
  return `${project}/${team}/_apis/wit/wiql?api-version=7.1`
}

function baseConditions(project: string, allowedTypes: string[] = []): string {
  let sql = `[System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.TeamProject] = '${esc(project)}'`
  if (allowedTypes.length > 0) {
    sql += ` AND [System.WorkItemType] IN (${allowedTypes.map(t => `'${esc(t)}'`).join(',')})`
  }
  return sql
}

async function runWiql(client: DevOpsClient, project: string, team: string, query: string): Promise<number[]> {
  const res = await client.post<WiqlResult>(wiqlPath(project, team), { query })
  return res.workItems.map(w => w.id)
}

// ── Teams & Boards ───────────────────────────────────────────────────

export async function listTeams(client: DevOpsClient, project: string): Promise<TeamRef[]> {
  const res = await client.get<{ value: TeamRef[] }>(
    `_apis/projects/${encodeURIComponent(project)}/teams?api-version=7.1`
  )
  return res.value
}

export async function listBoards(client: DevOpsClient, project: string, team: string): Promise<BoardRef[]> {
  const res = await client.get<{ value: BoardRef[] }>(
    `${project}/${team}/_apis/work/boards?api-version=7.1`
  )
  return res.value
}

export async function getBoard(client: DevOpsClient, project: string, team: string, boardName: string): Promise<Board> {
  return client.get<Board>(
    `${project}/${team}/_apis/work/boards/${encodeURIComponent(boardName)}?api-version=7.1`
  )
}

export async function listTeamMembers(client: DevOpsClient, project: string, team: string): Promise<{ displayName: string; uniqueName: string }[]> {
  const res = await client.get<{ value: { identity: { displayName: string; uniqueName: string } }[] }>(
    `_apis/projects/${encodeURIComponent(project)}/teams/${encodeURIComponent(team)}/members?api-version=7.1`
  )
  return res.value.map(m => m.identity)
}

// ── WIQL Queries ─────────────────────────────────────────────────────

export async function queryLaneItems(client: DevOpsClient, project: string, team: string, lane: string | null, allowedTypes: string[] = []): Promise<number[]> {
  const laneFilter = lane ? `[System.BoardLane] = '${esc(lane)}'` : `[System.BoardLane] = ''`
  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${laneFilter} AND [System.BoardColumn] <> '' AND ${baseConditions(project, allowedTypes)} ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC`
  return runWiql(client, project, team, wiql)
}

export async function queryLaneCounts(client: DevOpsClient, project: string, team: string, lanes: (string | null)[], allowedTypes: string[] = []): Promise<Record<string, number>> {
  const base = baseConditions(project, allowedTypes)
  const counts: Record<string, number> = {}
  await Promise.all(lanes.map(async lane => {
    const laneFilter = lane ? `[System.BoardLane] = '${esc(lane)}'` : `[System.BoardLane] = ''`
    const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${laneFilter} AND [System.BoardColumn] <> '' AND ${base}`
    const ids = await runWiql(client, project, team, wiql)
    counts[lane ?? ''] = ids.length
  }))
  return counts
}

export async function queryColumnItems(client: DevOpsClient, project: string, team: string, column: string, allowedTypes: string[] = []): Promise<number[]> {
  const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.BoardColumn] = '${esc(column)}' AND ${baseConditions(project, allowedTypes)} ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC`
  return runWiql(client, project, team, wiql)
}

export async function queryColumnCounts(client: DevOpsClient, project: string, team: string, columns: string[], allowedTypes: string[] = []): Promise<Record<string, number>> {
  const base = baseConditions(project, allowedTypes)
  const counts: Record<string, number> = {}
  await Promise.all(columns.map(async col => {
    const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.BoardColumn] = '${esc(col)}' AND ${base}`
    const ids = await runWiql(client, project, team, wiql)
    counts[col] = ids.length
  }))
  return counts
}

export async function searchWorkItems(client: DevOpsClient, project: string, team: string, text: string): Promise<number[]> {
  const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.Title] CONTAINS '${esc(text)}' AND ${baseConditions(project)} ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC`
  return runWiql(client, project, team, wiql)
}

// ── Work Items CRUD ──────────────────────────────────────────────────

export async function getWorkItems(client: DevOpsClient, project: string, ids: number[]): Promise<WorkItem[]> {
  if (ids.length === 0) return []
  const results: WorkItem[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200)
    const res = await client.get<WorkItemBatchResult>(
      `${project}/_apis/wit/workitems?ids=${batch.join(',')}&$expand=all&api-version=7.1`
    )
    results.push(...res.value)
  }
  return results
}

export async function createWorkItem(
  client: DevOpsClient,
  project: string,
  workItemType: string,
  fields: Record<string, string>,
): Promise<WorkItem> {
  const ops = Object.entries(fields).map(([path, value]) => ({
    op: 'add',
    path: `/fields/${path}`,
    value,
  }))
  return client.jsonPatch<WorkItem>(
    `${project}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=7.1`,
    ops,
  )
}

export async function updateWorkItem(
  client: DevOpsClient,
  project: string,
  id: number,
  fields: Record<string, string>,
): Promise<WorkItem> {
  const ops = Object.entries(fields).map(([path, value]) => ({
    op: 'add',
    path: `/fields/${path}`,
    value,
  }))
  return client.jsonPatch<WorkItem>(
    `${project}/_apis/wit/workitems/${id}?api-version=7.1`,
    ops,
  )
}
