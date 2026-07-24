import { useEffect, type PropsWithChildren } from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from 'next-themes'

import {
  THEME_STORAGE_KEY,
  getNextTheme,
  getThemeMetaColor,
  sanitizeTheme,
  type AppliedTheme,
  type ThemePreference,
} from '@/lib/theme'

interface ThemeContextValue {
  theme: ThemePreference
  appliedTheme: AppliedTheme
  setTheme: (theme: ThemePreference) => void
  cycleTheme: () => void
}

function ThemeMetaSync() {
  const { resolvedTheme } = useNextTheme()

  useEffect(() => {
    const appliedTheme = resolvedTheme === 'dark' ? 'dark' : 'light'
    const root = document.documentElement

    root.dataset.theme = appliedTheme

    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    metaThemeColor?.setAttribute('content', getThemeMetaColor(appliedTheme))
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      disableTransitionOnChange
      enableSystem
      storageKey={THEME_STORAGE_KEY}
    >
      <ThemeMetaSync />
      {children}
    </NextThemesProvider>
  )
}

export function useTheme(): ThemeContextValue {
  const { resolvedTheme, setTheme, theme } = useNextTheme()
  const safeTheme = sanitizeTheme(theme)

  return {
    theme: safeTheme,
    appliedTheme: resolvedTheme === 'dark' ? 'dark' : 'light',
    setTheme: (nextTheme) => setTheme(nextTheme),
    cycleTheme: () => setTheme(getNextTheme(safeTheme)),
  }
}
