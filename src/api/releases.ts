import type { DevOpsClient } from './devops'

export interface ReleaseDefinitionArtifact {
  alias: string
  type: string
  sourceId: string
  definitionReference: {
    definition?: { id: string; name: string }
    project?: { id: string; name: string }
  }
}

export interface ReleaseDefinition {
  id: number
  name: string
  path: string
  artifacts: ReleaseDefinitionArtifact[]
}

interface ReleaseDefinitionListResponse {
  value: ReleaseDefinition[]
  count: number
}

export interface ReleaseEnvironment {
  id: number
  name: string
  status: string
  releaseId: number
}

export interface Approval {
  id: number
  status: 'pending' | 'approved' | 'rejected' | 'reassigned' | 'skipped' | 'undefined'
  releaseEnvironment: { id: number; name: string }
  release: { id: number; name: string }
  approver: { displayName: string }
}

interface ApprovalListResponse {
  value: Approval[]
  count: number
}

export interface ReleaseArtifact {
  alias: string
  type: string
  definitionReference: {
    version?: { id: string; name: string }
    branch?: { id: string; name: string }
  }
}

export interface Release {
  id: number
  name: string
  status: string
  createdOn: string
  createdBy: { displayName: string }
  releaseDefinition: { id: number; name: string }
  environments: ReleaseEnvironment[]
  artifacts: ReleaseArtifact[]
}

interface ReleaseListResponse {
  value: Release[]
  count: number
}

export async function listReleaseDefinitions(client: DevOpsClient, project: string): Promise<ReleaseDefinition[]> {
  const res = await client.vsrmGet<ReleaseDefinitionListResponse>(
    `${project}/_apis/release/definitions?$expand=artifacts&api-version=7.1`
  )
  return res.value
}

export async function listReleases(client: DevOpsClient, project: string, definitionId?: number): Promise<Release[]> {
  const defFilter = definitionId ? `&definitionId=${definitionId}` : ''
  const res = await client.vsrmGet<ReleaseListResponse>(
    `${project}/_apis/release/releases?$expand=environments,artifacts&$top=20${defFilter}&api-version=7.1`
  )
  return res.value
}

export async function listApprovals(client: DevOpsClient, project: string, releaseId: number): Promise<Approval[]> {
  const res = await client.vsrmGet<ApprovalListResponse>(
    `${project}/_apis/release/approvals?releaseIdsFilter=${releaseId}&api-version=7.1`
  )
  return res.value
}

export async function updateApproval(
  client: DevOpsClient,
  project: string,
  approvalId: number,
  status: 'approved' | 'rejected',
  comments?: string,
): Promise<Approval> {
  return client.vsrmPatch<Approval>(
    `${project}/_apis/release/approvals/${approvalId}?api-version=7.1`,
    { status, comments: comments ?? '' },
  )
}

export async function deployEnvironment(
  client: DevOpsClient,
  project: string,
  releaseId: number,
  environmentId: number,
): Promise<void> {
  await client.vsrmPatch<unknown>(
    `${project}/_apis/release/releases/${releaseId}/environments/${environmentId}?api-version=7.1-preview.1`,
    { status: 'inProgress' },
  )
}

export async function createRelease(
  client: DevOpsClient,
  project: string,
  definitionId: number,
  buildId: number,
  buildAlias: string,
): Promise<Release> {
  return client.vsrmPost<Release>(
    `${project}/_apis/release/releases?api-version=7.1`,
    {
      definitionId,
      artifacts: [
        {
          alias: buildAlias,
          instanceReference: {
            id: String(buildId),
          },
        },
      ],
    },
  )
}

export interface ReleaseTask {
  id: number
  name: string
  status: string
  startTime?: string
  finishTime?: string
  percentComplete?: number
  issues?: { issueType: string; message: string }[]
}

export interface ReleaseDeployPhase {
  id: number
  name: string
  rank: number
  status: string
}

interface DeploymentAttempt {
  attempt: number
  status: string
  releaseDeployPhases: ReleaseDeployPhase[]
}

export interface ReleaseEnvironmentDetail extends ReleaseEnvironment {
  deploySteps: DeploymentAttempt[]
}

/** A task from the latest deployment attempt, carrying the phase it belongs to so its log can be fetched. */
export interface DeployTask extends ReleaseTask {
  phaseId: number
  phaseName: string
}

interface ReleaseTaskListResponse {
  value: ReleaseTask[]
  count: number
}

/** Stage statuses that mean the deployment is still moving, so the view needs to keep polling. */
const ACTIVE_STATUSES = ['inProgress', 'queued', 'scheduled', 'pending']

export function isActiveStatus(status: string | undefined): boolean {
  return status !== undefined && ACTIVE_STATUSES.includes(status)
}

/** The phases of the latest deployment attempt, in run order. Earlier attempts are dropped — the UI shows the current run. */
export function latestPhases(detail: ReleaseEnvironmentDetail): ReleaseDeployPhase[] {
  const steps = detail.deploySteps ?? []
  if (steps.length === 0) return []
  const latest = steps.reduce((a, b) => (b.attempt >= a.attempt ? b : a))
  return [...(latest.releaseDeployPhases ?? [])].sort((a, b) => a.rank - b.rank)
}

export async function getEnvironmentDetail(
  client: DevOpsClient,
  project: string,
  releaseId: number,
  environmentId: number,
): Promise<ReleaseEnvironmentDetail> {
  return client.vsrmGet<ReleaseEnvironmentDetail>(
    `${project}/_apis/release/releases/${releaseId}/environments/${environmentId}?api-version=7.1`
  )
}

export async function getPhaseTasks(
  client: DevOpsClient,
  project: string,
  releaseId: number,
  environmentId: number,
  phase: ReleaseDeployPhase,
): Promise<DeployTask[]> {
  const res = await client.vsrmGet<ReleaseTaskListResponse>(
    `${project}/_apis/release/releases/${releaseId}/environments/${environmentId}` +
    `/deployPhases/${phase.id}/tasks?api-version=7.1`
  )
  return res.value.map(task => ({ ...task, phaseId: phase.id, phaseName: phase.name }))
}

/**
 * Tasks for every phase of the latest attempt.
 *
 * The environment detail carries the phases but always reports an empty
 * deploymentJobs array, so the tasks have to be fetched per phase.
 */
export async function listDeployTasks(
  client: DevOpsClient,
  project: string,
  releaseId: number,
  environmentId: number,
  phases: ReleaseDeployPhase[],
): Promise<DeployTask[]> {
  const perPhase = await Promise.all(
    phases.map(phase => getPhaseTasks(client, project, releaseId, environmentId, phase))
  )
  return perPhase.flat()
}

export async function getTaskLog(
  client: DevOpsClient,
  project: string,
  releaseId: number,
  environmentId: number,
  phaseId: number,
  taskId: number,
): Promise<string> {
  return client.vsrmGetText(
    `${project}/_apis/release/releases/${releaseId}/environments/${environmentId}` +
    `/deployPhases/${phaseId}/tasks/${taskId}/logs?api-version=7.1`
  )
}
