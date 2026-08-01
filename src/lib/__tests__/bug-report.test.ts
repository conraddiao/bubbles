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
  const reporter = { id: 'user-123', email: 'jane@example.com', name: 'Jane Doe' }

  it('fences the report and includes redacted context', () => {
    const body = buildIssueBody('Something broke', {
      path: '/group/secrettokenvalue',
      userAgent: 'Mozilla/5.0',
      reporter,
    })

    expect(body).toContain('```text\nSomething broke\n```')
    expect(body).toContain('`/group/[id]`')
    expect(body).not.toContain('secrettokenvalue')
    expect(body).toContain('Mozilla/5.0')
    expect(body).toContain('untrusted text')
  })

  it('includes the reporter name, email and id', () => {
    const body = buildIssueBody('Something broke', {
      path: '/dashboard',
      userAgent: 'Mozilla/5.0',
      reporter,
    })

    expect(body).toContain('| Reporter | `Jane Doe` |')
    expect(body).toContain('| Email | `jane@example.com` |')
    expect(body).toContain('| User ID | `user-123` |')
  })

  it('marks missing reporter details as unknown', () => {
    const body = buildIssueBody('Something broke', {
      path: '/dashboard',
      userAgent: '',
      reporter: { id: 'user-123', email: null, name: null },
    })

    expect(body).toContain('| Reporter | unknown |')
    expect(body).toContain('| Email | unknown |')
    expect(body).toContain('| Browser | unknown |')
  })

  it('neutralises pipes and backticks so a crafted name cannot break the table', () => {
    const body = buildIssueBody('Something broke', {
      path: '/dashboard',
      userAgent: 'Mozilla/5.0',
      reporter: { id: 'user-123', email: 'a@b.c', name: 'Ev|il `injection`' },
    })

    const reporterRow = body.split('\n').find((line) => line.startsWith('| Reporter |'))
    expect(reporterRow).toBe('| Reporter | `Ev il  injection` |')
  })
})
