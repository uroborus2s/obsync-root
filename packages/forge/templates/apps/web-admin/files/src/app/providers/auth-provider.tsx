import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import {
  AUTH_SESSION_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  clearStoredSession,
  getStoredSession,
  persistDemoSession,
  signInWithDemoCredentials,
  type DemoSignInInput,
  type AuthUser,
} from '@/features/auth/lib/session'

interface AuthContextValue {
  user: AuthUser | null
  login: (input: DemoSignInInput) => AuthUser
  loginAsDemo: (remember?: boolean) => AuthUser
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredSession())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === AUTH_STORAGE_KEY ||
        event.key === AUTH_SESSION_STORAGE_KEY
      ) {
        startTransition(() => {
          setUser(getStoredSession())
        })
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (input) => {
        const nextUser = signInWithDemoCredentials(input)
        setUser(nextUser)
        return nextUser
      },
      loginAsDemo: (remember = true) => {
        const nextUser = persistDemoSession({ remember })
        setUser(nextUser)
        return nextUser
      },
      logout: () => {
        clearStoredSession()
        setUser(null)
      },
    }),
    [user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
