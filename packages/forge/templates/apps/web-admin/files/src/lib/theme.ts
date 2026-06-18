export const THEME_STORAGE_KEY = '{{kebabName}}.theme'

export const THEMES = ['light', 'dark', 'system'] as const

export type ThemePreference = (typeof THEMES)[number]
export type AppliedTheme = Exclude<ThemePreference, 'system'>

export function isTheme(value: unknown): value is ThemePreference {
  return typeof value === 'string' && THEMES.includes(value as ThemePreference)
}

export function sanitizeTheme(value: unknown): ThemePreference {
  return isTheme(value) ? value : 'system'
}

export function getAppliedTheme(
  preference: ThemePreference,
  prefersDark: boolean
): AppliedTheme {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return preference
}

export function getNextTheme(preference: ThemePreference): ThemePreference {
  const currentIndex = THEMES.indexOf(preference)
  return THEMES[(currentIndex + 1) % THEMES.length]
}

export function getThemeMetaColor(theme: AppliedTheme): string {
  return theme === 'dark' ? '#0b1220' : '#f7f7f5'
}

export function getSystemPreference(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyThemeToDocument(
  preference: ThemePreference,
  prefersDark: boolean
): AppliedTheme | null {
  if (typeof document === 'undefined') {
    return null
  }

  const appliedTheme = getAppliedTheme(preference, prefersDark)
  const root = document.documentElement

  root.classList.toggle('dark', appliedTheme === 'dark')
  root.dataset.theme = appliedTheme

  const metaThemeColor = document.querySelector("meta[name='theme-color']")
  metaThemeColor?.setAttribute('content', getThemeMetaColor(appliedTheme))

  return appliedTheme
}
