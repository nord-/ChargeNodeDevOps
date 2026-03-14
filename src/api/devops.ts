const API_BASE = 'https://dev.azure.com'

export interface DevOpsClient {
  get: <T>(path: string) => Promise<T>
}

export function createClient(organization: string, token: string): DevOpsClient {
  const headers: HeadersInit = {
    'Authorization': `Basic ${btoa(':' + token)}`,
    'Content-Type': 'application/json',
  }

  return {
    async get<T>(path: string): Promise<T> {
      const url = `${API_BASE}/${organization}/${path}`
      const res = await fetch(url, { headers })
      if (!res.ok) {
        throw new Error(`API ${res.status}: ${res.statusText}`)
      }
      return res.json() as Promise<T>
    },
  }
}
