import { describe, it, expect } from 'vitest'
import {
  buildIssueBody,
  buildIssueTitle,
  fenceUserText,
  redactPath,
  truncate,
} from '../bug-report'

describe('redactPath', () => {
  it('keeps known static route segments', () => {
    expect(redactPath('/dashboard')).toBe('/dashboard')
    expect(redactPath('/messaging/privacy-policy')).toBe('/messaging/privacy-policy')
    expect(redactPath('/onboarding/verify')).toBe('/onboarding/verify')
  })

  it('redacts share tokens and ids so they never reach the public tracker', () => {
    expect(redactPath('/group/aB3xY9tokenvalue')).toBe('/group/[id]')
    expect(redactPath('/group/aB3xY9tokenvalue/join')).toBe('/group/[id]/join')
    expect(redactPath('/join/short')).toBe('/join/[id]')
  })

  it('falls back to root for missing or relative paths', () => {
    expect(redactPath('')).toBe('/')
    expect(redactPath('dashboard')).toBe('/')
  })
})

describe('fenceUserText', () => {
  it('wraps text in a fence', () => {
    expect(fenceUserText('hello')).toBe('```text\nhello\n```')
  })

  it('grows the fence so embedded backticks cannot break out', () => {
    const fenced = fenceUserText('```\nnot markdown\n```')
    expect(fenced.startsWith('````text\n')).toBe(true)
    expect(fenced.endsWith('\n````')).toBe(true)
  })
})

describe('buildIssueTitle', () => {
  it('uses the first line of the description', () => {
    expect(buildIssueTitle('QR will not scan\nmore detail here')).toBe(
      'Bug report: QR will not scan'
    )
  })

  it('truncates long first lines', () => {
    const title = buildIssueTitle('x'.repeat(200))
    expect(title.length).toBeLessThanOrEqual('Bug report: '.length + 80)
    expect(title.endsWith('…')).toBe(true)
  })
})

describe('truncate', () => {
  it('leaves short values untouched', () => {
    expect(truncate('  short  ', 10)).toBe('short')
  })

  it('adds an ellipsis when over the limit', () => {
    expect(truncate('abcdef', 4)).toBe('abc…')
  })
})

describe('buildIssueBody', () => {
  it('fences the report and includes redacted context', () => {
    const body = buildIssueBody('Something broke', {
      path: '/group/secrettokenvalue',
      userAgent: 'Mozilla/5.0',
      userId: 'user-123',
    })

    expect(body).toContain('```text\nSomething broke\n```')
    expect(body).toContain('`/group/[id]`')
    expect(body).not.toContain('secrettokenvalue')
    expect(body).toContain('Mozilla/5.0')
    expect(body).toContain('untrusted text')
  })

  it('identifies the reporter by user id only', () => {
    const body = buildIssueBody('Something broke', {
      path: '/dashboard',
      userAgent: 'Mozilla/5.0',
      userId: 'user-123',
    })

    expect(body).toContain('| User ID | `user-123` |')
    // The tracker repo is public — no name or email may appear.
    expect(body).not.toMatch(/Reporter|Email|@/)
  })

  it('marks a missing user agent as unknown', () => {
    const body = buildIssueBody('Something broke', {
      path: '/dashboard',
      userAgent: '',
      userId: 'user-123',
    })

    expect(body).toContain('| Browser | unknown |')
  })

  it('neutralises pipes and backticks so a crafted value cannot break the table', () => {
    const body = buildIssueBody('Something broke', {
      path: '/dashboard',
      userAgent: 'Ev|il `injection`',
      userId: 'user-123',
    })

    const browserRow = body.split('\n').find((line) => line.startsWith('| Browser |'))
    expect(browserRow).toBe('| Browser | `Ev il  injection` |')
  })
})
