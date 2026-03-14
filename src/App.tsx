import { useEffect, useState, useMemo } from 'react'
import { Icon } from '@mdi/react'
import { mdiViewDashboard, mdiPipe, mdiRocketLaunch } from '@mdi/js'
import { useAuth } from './auth/AuthContext'
import { ConnectPage } from './auth/ConnectPage'
import { createClient } from './api/devops'
import { listProjects, type Project } from './api/projects'
import { BoardView } from './boards/BoardView'
import { PipelineList } from './pipelines/PipelineList'
import { ReleaseList } from './releases/ReleaseList'
import './App.css'

type Tab = 'boards' | 'pipelines' | 'releases'

const TAB_KEY = 'cn-devops-tab'

function App() {
  const { auth, logout } = useAuth()
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_KEY)
    if (saved === 'boards' || saved === 'pipelines' || saved === 'releases') return saved
    return 'pipelines'
  })

  const client = useMemo(
    () => auth ? createClient(auth.organization, auth.token) : null,
    [auth],
  )

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState(
    () => localStorage.getItem('cn-devops-project') ?? ''
  )

  useEffect(() => {
    if (!client) return
    listProjects(client).then(p => {
      setProjects(p)
      const saved = localStorage.getItem('cn-devops-project')
      const match = saved && p.some(proj => proj.name === saved)
      if (!match && p.length > 0) {
        setSelectedProject(p[0].name)
        localStorage.setItem('cn-devops-project', p[0].name)
      }
    })
  }, [client])

  if (!auth) return <ConnectPage />

  return (
    <div className="app">
      <header className="header">
        <h1>CN DevOps</h1>
        <div className="header-actions">
          <select
            className="project-select-header"
            value={selectedProject}
            onChange={e => {
              setSelectedProject(e.target.value)
              localStorage.setItem('cn-devops-project', e.target.value)
            }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <button className="disconnect-btn" onClick={logout}>Disconnect</button>
        </div>
      </header>
      <div className="body">
        <nav className="nav">
          <button className={`nav-btn ${tab === 'boards' ? 'active' : ''}`} onClick={() => { setTab('boards'); localStorage.setItem(TAB_KEY, 'boards') }} title="Boards">
            <Icon path={mdiViewDashboard} size={1} />
            <span className="nav-label">Boards</span>
          </button>
          <button className={`nav-btn ${tab === 'pipelines' ? 'active' : ''}`} onClick={() => { setTab('pipelines'); localStorage.setItem(TAB_KEY, 'pipelines') }} title="Pipelines">
            <Icon path={mdiPipe} size={1} />
            <span className="nav-label">Pipelines</span>
          </button>
          <button className={`nav-btn ${tab === 'releases' ? 'active' : ''}`} onClick={() => { setTab('releases'); localStorage.setItem(TAB_KEY, 'releases') }} title="Releases">
            <Icon path={mdiRocketLaunch} size={1} />
            <span className="nav-label">Releases</span>
          </button>
        </nav>
        <main className="content">
        {tab === 'boards' && client && <BoardView client={client} project={selectedProject} />}
        {tab === 'pipelines' && client && <PipelineList client={client} project={selectedProject} />}
        {tab === 'releases' && client && <ReleaseList client={client} project={selectedProject} />}
        </main>
      </div>
    </div>
  )
}

export default App
