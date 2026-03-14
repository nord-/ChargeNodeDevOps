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
