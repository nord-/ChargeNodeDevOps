const API_BASE = 'https://dev.azure.com'
const VSRM_BASE = 'https://vsrm.dev.azure.com'

export class ApiError extends Error {
  constructor(public status: number, public statusText: string, public detail: string) {
    super(detail || `API ${status}: ${statusText}`)
    this.name = 'ApiError'
  }
}

export interface DevOpsClient {
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
  patch: <T>(path: string, body: unknown) => Promise<T>
  jsonPatch: <T>(path: string, ops: unknown[]) => Promise<T>
  vsrmGet: <T>(path: string) => Promise<T>
  vsrmPost: <T>(path: string, body: unknown) => Promise<T>
  vsrmPatch: <T>(path: string, body: unknown) => Promise<T>
}

export function createClient(organization: string, token: string): DevOpsClient {
  const headers: HeadersInit = {
    'Authorization': `Basic ${btoa(':' + token)}`,
    'Content-Type': 'application/json',
  }

  async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
    const url = `${base}/${organization}/${path}`
    const res = await fetch(url, { headers, ...init })
    if (!res.ok) {
      let detail = `API ${res.status}: ${res.statusText}`
      try {
        const body = await res.json()
        if (body.message) detail = body.message
      } catch { /* no JSON body */ }
      throw new ApiError(res.status, res.statusText, detail)
    }
    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>(API_BASE, path),
    post: <T>(path: string, body: unknown) => request<T>(API_BASE, path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    patch: <T>(path: string, body: unknown) => request<T>(API_BASE, path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    jsonPatch: <T>(path: string, ops: unknown[]) => request<T>(API_BASE, path, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(ops),
    }),
    vsrmGet: <T>(path: string) => request<T>(VSRM_BASE, path),
    vsrmPost: <T>(path: string, body: unknown) => request<T>(VSRM_BASE, path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    vsrmPatch: <T>(path: string, body: unknown) => request<T>(VSRM_BASE, path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail
  if (err instanceof Error) return err.message
  return 'Unknown error'
}
