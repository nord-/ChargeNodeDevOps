import { describe, it, expect } from 'vitest'
import { ApiError, errorMessage } from './devops'

describe('ApiError', () => {
  it('creates error with status and detail', () => {
    const err = new ApiError(404, 'Not Found', 'Resource not found')
    expect(err.status).toBe(404)
    expect(err.statusText).toBe('Not Found')
    expect(err.detail).toBe('Resource not found')
    expect(err.message).toBe('Resource not found')
    expect(err.name).toBe('ApiError')
  })

  it('falls back to status text when detail is empty', () => {
    const err = new ApiError(500, 'Internal Server Error', '')
    expect(err.message).toBe('API 500: Internal Server Error')
  })
})

describe('errorMessage', () => {
  it('extracts detail from ApiError', () => {
    expect(errorMessage(new ApiError(400, 'Bad Request', 'Field is invalid'))).toBe('Field is invalid')
  })

  it('extracts message from regular Error', () => {
    expect(errorMessage(new Error('Network failure'))).toBe('Network failure')
  })

  it('returns "Unknown error" for non-Error values', () => {
    expect(errorMessage('something')).toBe('Unknown error')
    expect(errorMessage(null)).toBe('Unknown error')
    expect(errorMessage(42)).toBe('Unknown error')
  })
})
