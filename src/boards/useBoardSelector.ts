import { useEffect, useState } from 'react'
import { errorMessage, type DevOpsClient } from '../api/devops'
import { listTeams, listBoards, type TeamRef, type BoardRef } from '../api/boards'

const TEAM_KEY = (p: string) => `cn-devops-board-team-${p}`
const BOARD_KEY = (p: string) => `cn-devops-board-name-${p}`

export function useBoardSelector(client: DevOpsClient, project: string) {
  const [teams, setTeams] = useState<TeamRef[]>([])
  const [team, setTeam] = useState('')
  const [boards, setBoards] = useState<BoardRef[]>([])
  const [boardName, setBoardName] = useState('')
  const [error, setError] = useState('')

  function selectTeam(name: string) {
    setTeam(name)
    localStorage.setItem(TEAM_KEY(project), name)
  }

  function selectBoard(name: string) {
    setBoardName(name)
    localStorage.setItem(BOARD_KEY(project), name)
  }

  useEffect(() => {
    if (!project) return
    setTeams([]); setTeam(''); setBoards([]); setBoardName('')
    listTeams(client, project).then(t => {
      setTeams(t)
      if (t.length > 0) {
        const saved = localStorage.getItem(TEAM_KEY(project))
        const match = saved && t.find(x => x.name === saved)
        const def = match || t.find(x => x.name === project) || t[0]
        selectTeam(def.name)
      }
    }).catch(err => setError(`Failed to load teams: ${errorMessage(err)}`))
  }, [client, project])

  useEffect(() => {
    if (!team) return
    setBoards([]); setBoardName('')
    listBoards(client, project, team).then(b => {
      setBoards(b)
      if (b.length > 0) {
        const saved = localStorage.getItem(BOARD_KEY(project))
        const match = saved && b.find(x => x.name === saved)
        const def = match || b[0]
        selectBoard(def.name)
      }
    }).catch(err => setError(`Failed to load boards: ${errorMessage(err)}`))
  }, [client, project, team])

  return { teams, team, selectTeam, boards, boardName, selectBoard, error, setError }
}
