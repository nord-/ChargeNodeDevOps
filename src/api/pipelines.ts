import type { DevOpsClient } from './devops'

export interface Pipeline {
  id: number
  name: string
  folder: string
  revision: number
}

interface PipelineListResponse {
  value: Pipeline[]
  count: number
}

export interface PipelineRun {
  id: number
  buildNumber: string
  definition: { id: number; name: string }
  sourceBranch: string
  sourceVersion: string
  status: 'all' | 'cancelling' | 'completed' | 'inProgress' | 'none' | 'notStarted' | 'postponed'
  result?: 'canceled' | 'failed' | 'none' | 'partiallySucceeded' | 'succeeded'
  startTime?: string
  finishTime?: string
  queueTime: string
  requestedFor?: { displayName: string }
  triggerInfo?: { 'ci.message'?: string }
}

interface BuildListResponse {
  value: PipelineRun[]
  count: number
}

export async function listPipelines(client: DevOpsClient, project: string): Promise<Pipeline[]> {
  const res = await client.get<PipelineListResponse>(`${project}/_apis/pipelines?api-version=7.1`)
  return res.value
}

export async function listPipelineRuns(client: DevOpsClient, project: string, pipelineId: number): Promise<PipelineRun[]> {
  const res = await client.get<BuildListResponse>(
    `${project}/_apis/build/builds?definitions=${pipelineId}&$top=20&api-version=7.1`
  )
  return res.value
}

export async function runPipeline(client: DevOpsClient, project: string, pipelineId: number, branch: string): Promise<PipelineRun> {
  return client.post<PipelineRun>(
    `${project}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`,
    {
      resources: {
        repositories: {
          self: { refName: `refs/heads/${branch}` },
        },
      },
    },
  )
}
