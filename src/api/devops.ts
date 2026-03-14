const API_BASE = 'https://dev.azure.com'

export interface DevOpsClient {
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
}

export function createClient(organization: string, token: string): DevOpsClient {
  const headers: HeadersInit = {
    'Authorization': `Basic ${btoa(':' + token)}`,
    'Content-Type': 'application/json',
  }

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${API_BASE}/${organization}/${path}`
    const res = await fetch(url, { headers, ...init })
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText}`)
    }
    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  }
}
