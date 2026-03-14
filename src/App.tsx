import { useAuth } from './auth/AuthContext'
import { ConnectPage } from './auth/ConnectPage'
import './App.css'

function App() {
  const { auth, logout } = useAuth()

  if (!auth) return <ConnectPage />

  return (
    <div className="app">
      <header className="header">
        <h1>CN DevOps</h1>
        <button className="disconnect-btn" onClick={logout}>Disconnect</button>
      </header>
      <nav className="nav">
        <button className="nav-btn active">Boards</button>
        <button className="nav-btn">Pipelines</button>
        <button className="nav-btn">Releases</button>
      </nav>
      <main className="content">
        <p className="placeholder">Connected to <strong>{auth.organization}</strong></p>
      </main>
    </div>
  )
}

export default App
