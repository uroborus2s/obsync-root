import { describe, expect, it } from 'vitest'

import {
  getAppliedTheme,
  getNextTheme,
  isTheme,
  sanitizeTheme,
  type ThemePreference,
} from '@/lib/theme'

describe('theme helpers', () => {
  it('accepts supported theme values only', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('system')).toBe(true)
    expect(isTheme('sepia')).toBe(false)
  })

  it('falls back to system when stored theme is invalid', () => {
    expect(sanitizeTheme('light')).toBe('light')
    expect(sanitizeTheme('unknown')).toBe('system')
    expect(sanitizeTheme(null)).toBe('system')
  })

  it('resolves system preference against the current OS color scheme', () => {
    expect(getAppliedTheme('system', true)).toBe('dark')
    expect(getAppliedTheme('system', false)).toBe('light')
    expect(getAppliedTheme('dark', false)).toBe('dark')
  })

  it('cycles through all supported theme preferences', () => {
    const sequence: ThemePreference[] = ['light', 'dark', 'system']

    expect(getNextTheme(sequence[0])).toBe(sequence[1])
    expect(getNextTheme(sequence[1])).toBe(sequence[2])
    expect(getNextTheme(sequence[2])).toBe(sequence[0])
  })
})
