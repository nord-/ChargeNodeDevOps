import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>CN DevOps</h1>
      </header>
      <nav className="nav">
        <button className="nav-btn active">Boards</button>
        <button className="nav-btn">Pipelines</button>
        <button className="nav-btn">Releases</button>
      </nav>
      <main className="content">
        <p className="placeholder">Connect to Azure DevOps to get started</p>
      </main>
    </div>
  )
}

export default App
