import type { DevOpsClient } from './devops'

export interface ReleaseDefinition {
  id: number
  name: string
  path: string
}

interface ReleaseDefinitionListResponse {
  value: ReleaseDefinition[]
  count: number
}

export interface Release {
  id: number
  name: string
  status: string
  createdOn: string
  releaseDefinition: { id: number; name: string }
}

export async function listReleaseDefinitions(client: DevOpsClient, project: string): Promise<ReleaseDefinition[]> {
  const res = await client.vsrmGet<ReleaseDefinitionListResponse>(
    `${project}/_apis/release/definitions?api-version=7.1`
  )
  return res.value
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
