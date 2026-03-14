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
  }
}

interface WiqlResult {
  workItems: { id: number }[]
}

interface WorkItemBatchResult {
  value: WorkItem[]
  count: number
}

interface BoardListResult {
  value: BoardRef[]
}

export interface TeamRef {
  id: string
  name: string
}

interface TeamListResult {
  value: TeamRef[]
}

export async function listTeams(client: DevOpsClient, project: string): Promise<TeamRef[]> {
  const res = await client.get<TeamListResult>(
    `_apis/projects/${encodeURIComponent(project)}/teams?api-version=7.1`
  )
  return res.value
}

export async function listBoards(client: DevOpsClient, project: string, team: string): Promise<BoardRef[]> {
  const res = await client.get<BoardListResult>(
    `${project}/${team}/_apis/work/boards?api-version=7.1`
  )
  return res.value
}

export async function getBoard(client: DevOpsClient, project: string, team: string, boardName: string): Promise<Board> {
  return client.get<Board>(
    `${project}/${team}/_apis/work/boards/${encodeURIComponent(boardName)}?api-version=7.1`
  )
}

export async function queryLaneItems(client: DevOpsClient, project: string, team: string, lane: string | null): Promise<number[]> {
  const laneFilter = lane
    ? `[System.BoardLane] = '${lane}'`
    : `[System.BoardLane] = ''`
  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${laneFilter} AND [System.BoardColumn] <> '' AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.TeamProject] = '${project}' ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC`
  const res = await client.post<WiqlResult>(
    `${project}/${team}/_apis/wit/wiql?api-version=7.1`,
    { query: wiql },
  )
  return res.workItems.map(w => w.id)
}

export async function queryLaneCounts(client: DevOpsClient, project: string, team: string, lanes: (string | null)[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  await Promise.all(lanes.map(async lane => {
    const laneFilter = lane
      ? `[System.BoardLane] = '${lane}'`
      : `[System.BoardLane] = ''`
    const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${laneFilter} AND [System.BoardColumn] <> '' AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.TeamProject] = '${project}'`
    const res = await client.post<WiqlResult>(
      `${project}/${team}/_apis/wit/wiql?api-version=7.1`,
      { query: wiql },
    )
    counts[lane ?? ''] = res.workItems.length
  }))
  return counts
}

export async function searchWorkItems(client: DevOpsClient, project: string, team: string, text: string): Promise<number[]> {
  const escaped = text.replace(/'/g, "''")
  const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.Title] CONTAINS '${escaped}' AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.TeamProject] = '${project}' ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC`
  const res = await client.post<WiqlResult>(
    `${project}/${team}/_apis/wit/wiql?api-version=7.1`,
    { query: wiql },
  )
  return res.workItems.map(w => w.id)
}

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
    op: 'replace',
    path: `/fields/${path}`,
    value,
  }))
  return client.jsonPatch<WorkItem>(
    `${project}/_apis/wit/workitems/${id}?api-version=7.1`,
    ops,
  )
}

export async function listTeamMembers(client: DevOpsClient, project: string, team: string): Promise<{ displayName: string; uniqueName: string }[]> {
  const res = await client.get<{ value: { identity: { displayName: string; uniqueName: string } }[] }>(
    `_apis/projects/${encodeURIComponent(project)}/teams/${encodeURIComponent(team)}/members?api-version=7.1`
  )
  return res.value.map(m => m.identity)
}
