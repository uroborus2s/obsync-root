import type { ReactNode } from 'react'
import { WpsAuthContext } from '@/contexts/wps-auth-context'
import { useWpsAuth } from '@/hooks/use-wps-auth'

interface WpsAuthProviderProps {
  children: ReactNode
}

export function WpsAuthProvider({ children }: WpsAuthProviderProps) {
  const auth = useWpsAuth()

  return (
    <WpsAuthContext.Provider value={auth}>
      {children}
      {/* 不再需要全局二维码登录弹窗，因为已在AuthenticatedLayout中处理 */}
    </WpsAuthContext.Provider>
  )
}
