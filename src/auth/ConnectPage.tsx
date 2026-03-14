import { useState } from 'react'
import { useAuth } from './AuthContext'
import { createClient, ApiError } from '../api/devops'
import './ConnectPage.css'

export function ConnectPage() {
  const { login } = useAuth()
  const [org, setOrg] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const client = createClient(org, token)
      await client.get('_apis/projects?api-version=7.1')
      login(org, token)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid PAT token. Check that it has the correct scopes.')
      } else if (err instanceof ApiError && err.status === 404) {
        setError('Organization not found. Check the name.')
      } else {
        setError('Could not connect. Check organization name and PAT.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="connect-page">
      <div className="connect-card">
        <h2>Connect to Azure DevOps</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Organization
            <input
              type="text"
              value={org}
              onChange={e => setOrg(e.target.value)}
              placeholder="my-org"
              required
            />
          </label>
          <label>
            Personal Access Token
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="paste your PAT here"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  )
}
