import { describe, it, expect } from 'vitest'
import { latestPhases, isActiveStatus, type ReleaseEnvironmentDetail } from './releases'

function detail(deploySteps: unknown[]): ReleaseEnvironmentDetail {
  return {
    id: 1,
    name: 'Prod',
    status: 'inProgress',
    releaseId: 10,
    deploySteps,
  } as ReleaseEnvironmentDetail
}

describe('isActiveStatus', () => {
  it('treats a running deployment as active', () => {
    expect(isActiveStatus('inProgress')).toBe(true)
    expect(isActiveStatus('queued')).toBe(true)
  })

  it('treats a finished deployment as inactive', () => {
    expect(isActiveStatus('succeeded')).toBe(false)
    expect(isActiveStatus('rejected')).toBe(false)
    expect(isActiveStatus('notStarted')).toBe(false)
  })

  it('handles a missing status', () => {
    expect(isActiveStatus(undefined)).toBe(false)
  })
})

describe('latestPhases', () => {
  it('returns an empty list when the stage has never run', () => {
    expect(latestPhases(detail([]))).toEqual([])
  })

  it('returns the phases of the attempt, even though deploymentJobs always comes back empty', () => {
    const phases = latestPhases(detail([
      {
        attempt: 1,
        status: 'failed',
        releaseDeployPhases: [
          { id: 43031, name: 'Agent job', rank: 1, status: 'failed', deploymentJobs: [] },
        ],
      },
    ]))
    expect(phases).toHaveLength(1)
    expect(phases[0]).toMatchObject({ id: 43031, name: 'Agent job', status: 'failed' })
  })

  it('keeps only the latest attempt, so a redeploy does not show the previous run', () => {
    const phases = latestPhases(detail([
      { attempt: 1, status: 'rejected', releaseDeployPhases: [{ id: 1, name: 'Old', rank: 1, status: 'rejected' }] },
      { attempt: 2, status: 'inProgress', releaseDeployPhases: [{ id: 2, name: 'New', rank: 1, status: 'inProgress' }] },
    ]))
    expect(phases.map(p => p.name)).toEqual(['New'])
  })

  it('orders phases by rank', () => {
    const phases = latestPhases(detail([
      {
        attempt: 1,
        status: 'succeeded',
        releaseDeployPhases: [
          { id: 2, name: 'Second', rank: 2, status: 'succeeded' },
          { id: 1, name: 'First', rank: 1, status: 'succeeded' },
        ],
      },
    ]))
    expect(phases.map(p => p.name)).toEqual(['First', 'Second'])
  })

  it('survives an attempt with no phases', () => {
    expect(latestPhases(detail([{ attempt: 1, status: 'queued', releaseDeployPhases: [] }]))).toEqual([])
  })
})
