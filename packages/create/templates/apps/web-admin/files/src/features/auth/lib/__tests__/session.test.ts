import { describe, expect, it } from 'vitest'

import {
  DEMO_LOGIN_PASSWORD,
  demoUser,
  getSafeRedirect,
  isValidDemoCredentials,
} from '@/features/auth/lib/session'

describe('auth helpers', () => {
  it('accepts the built-in demo credentials', () => {
    expect(isValidDemoCredentials(demoUser.email, DEMO_LOGIN_PASSWORD)).toBe(true)
    expect(isValidDemoCredentials('admin', DEMO_LOGIN_PASSWORD)).toBe(true)
  })

  it('rejects invalid demo credentials', () => {
    expect(isValidDemoCredentials('alex@wps.local', 'wrong-password')).toBe(false)
    expect(isValidDemoCredentials('someone@wps.local', DEMO_LOGIN_PASSWORD)).toBe(false)
  })

  it('keeps safe in-app redirects', () => {
    expect(getSafeRedirect('/settings')).toBe('/settings')
    expect(getSafeRedirect('/users?tab=active')).toBe('/users?tab=active')
  })

  it('rejects unsafe redirects and falls back to the dashboard', () => {
    expect(getSafeRedirect('https://example.com')).toBe('/')
    expect(getSafeRedirect('//example.com')).toBe('/')
    expect(getSafeRedirect('javascript:alert(1)')).toBe('/')
  })
})
