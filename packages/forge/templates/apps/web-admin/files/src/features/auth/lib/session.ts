export const AUTH_STORAGE_KEY = '{{kebabName}}.session'
export const AUTH_SESSION_STORAGE_KEY = '{{kebabName}}.session.temporary'
export const DEMO_LOGIN_ACCOUNT = 'admin'
export const DEMO_LOGIN_PASSWORD = 'Admin@123456'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

export interface DemoSignInInput {
  account: string
  password: string
  remember?: boolean
}

export const demoUser: AuthUser = {
  id: 'demo-admin',
  name: 'Alex Johnson',
  email: 'alex@wps.local',
  role: 'Workspace Admin',
}

export const demoAuthCredentials = {
  account: demoUser.email,
  password: DEMO_LOGIN_PASSWORD,
  username: DEMO_LOGIN_ACCOUNT,
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseStoredUser(rawValue: string | null): AuthUser | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AuthUser>
    if (
      typeof parsedValue.id === 'string' &&
      typeof parsedValue.name === 'string' &&
      typeof parsedValue.email === 'string' &&
      typeof parsedValue.role === 'string'
    ) {
      return parsedValue as AuthUser
    }
  } catch {
    return null
  }

  return null
}

function readStoredUser(storageKey: string): AuthUser | null {
  if (!isStorageAvailable()) {
    return null
  }

  const storage =
    storageKey === AUTH_SESSION_STORAGE_KEY ? window.sessionStorage : window.localStorage
  const parsedUser = parseStoredUser(storage.getItem(storageKey))

  if (!parsedUser) {
    storage.removeItem(storageKey)
  }

  return parsedUser
}

function clearPersistedSession(): void {
  if (!isStorageAvailable()) {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

function persistSession(user: AuthUser, remember: boolean): void {
  if (!isStorageAvailable()) {
    return
  }

  clearPersistedSession()

  const storage = remember ? window.localStorage : window.sessionStorage
  const storageKey = remember ? AUTH_STORAGE_KEY : AUTH_SESSION_STORAGE_KEY

  storage.setItem(storageKey, JSON.stringify(user))
}

export function getStoredSession(): AuthUser | null {
  return readStoredUser(AUTH_SESSION_STORAGE_KEY) ?? readStoredUser(AUTH_STORAGE_KEY)
}

export function isAuthenticated(): boolean {
  return getStoredSession() !== null
}

export function isValidDemoCredentials(account: string, password: string): boolean {
  const normalizedAccount = account.trim().toLowerCase()
  const allowedAccounts = [demoUser.email.toLowerCase(), DEMO_LOGIN_ACCOUNT]

  return allowedAccounts.includes(normalizedAccount) && password === DEMO_LOGIN_PASSWORD
}

export function signInWithDemoCredentials({
  account,
  password,
  remember = true,
}: DemoSignInInput): AuthUser {
  if (!isValidDemoCredentials(account, password)) {
    throw new Error('演示账号或密码不正确，请使用预置账号登录。')
  }

  persistSession(demoUser, remember)
  return demoUser
}

export function persistDemoSession(options: { remember?: boolean } = {}): AuthUser {
  persistSession(demoUser, options.remember ?? true)
  return demoUser
}

export function clearStoredSession(): void {
  clearPersistedSession()
}

export function getSafeRedirect(redirect: string | null | undefined): string {
  if (!redirect || typeof redirect !== 'string') {
    return '/'
  }

  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/'
  }

  return redirect
}
