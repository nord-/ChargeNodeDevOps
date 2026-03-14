const API_BASE = 'https://dev.azure.com'
const VSRM_BASE = 'https://vsrm.dev.azure.com'

export interface DevOpsClient {
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
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
      throw new Error(`API ${res.status}: ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>(API_BASE, path),
    post: <T>(path: string, body: unknown) => request<T>(API_BASE, path, {
      method: 'POST',
      body: JSON.stringify(body),
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
