import { describe, it, expect } from 'vitest'
import { esc, baseConditions } from './boards'

describe('esc', () => {
  it('escapes single quotes', () => {
    expect(esc("it's")).toBe("it''s")
  })

  it('escapes multiple single quotes', () => {
    expect(esc("it's a 'test'")).toBe("it''s a ''test''")
  })

  it('leaves strings without quotes unchanged', () => {
    expect(esc('hello world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(esc('')).toBe('')
  })
})

describe('baseConditions', () => {
  it('returns base conditions without types', () => {
    const result = baseConditions('MyProject')
    expect(result).toBe(
      "[System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.TeamProject] = 'MyProject'"
    )
  })

  it('includes type filter when types provided', () => {
    const result = baseConditions('MyProject', ['Bug', 'User Story'])
    expect(result).toContain("AND [System.WorkItemType] IN ('Bug','User Story')")
  })

  it('escapes project name with quotes', () => {
    const result = baseConditions("Project's Name")
    expect(result).toContain("[System.TeamProject] = 'Project''s Name'")
  })

  it('escapes type names with quotes', () => {
    const result = baseConditions('P', ["It's a Type"])
    expect(result).toContain("'It''s a Type'")
  })

  it('omits type filter for empty array', () => {
    const result = baseConditions('P', [])
    expect(result).not.toContain('WorkItemType')
  })
})
