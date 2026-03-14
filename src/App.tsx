import { useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { ConnectPage } from './auth/ConnectPage'
import { PipelineList } from './pipelines/PipelineList'
import './App.css'

type Tab = 'boards' | 'pipelines' | 'releases'

function App() {
  const { auth, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('pipelines')

  if (!auth) return <ConnectPage />

  return (
    <div className="app">
      <header className="header">
        <h1>CN DevOps</h1>
        <button className="disconnect-btn" onClick={logout}>Disconnect</button>
      </header>
      <nav className="nav">
        <button className={`nav-btn ${tab === 'boards' ? 'active' : ''}`} onClick={() => setTab('boards')}>Boards</button>
        <button className={`nav-btn ${tab === 'pipelines' ? 'active' : ''}`} onClick={() => setTab('pipelines')}>Pipelines</button>
        <button className={`nav-btn ${tab === 'releases' ? 'active' : ''}`} onClick={() => setTab('releases')}>Releases</button>
      </nav>
      <main className="content">
        {tab === 'boards' && <p className="placeholder">Boards — coming soon</p>}
        {tab === 'pipelines' && <PipelineList />}
        {tab === 'releases' && <p className="placeholder">Releases — coming soon</p>}
      </main>
    </div>
  )
}

export default App
