import type { DevOpsClient } from './devops'

export interface Project {
  id: string
  name: string
}

interface ProjectListResponse {
  value: Project[]
  count: number
}

export async function listProjects(client: DevOpsClient): Promise<Project[]> {
  const res = await client.get<ProjectListResponse>('_apis/projects?api-version=7.1')
  return res.value
}
