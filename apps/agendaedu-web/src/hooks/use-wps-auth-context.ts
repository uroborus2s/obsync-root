import { useContext } from 'react'
import { WpsAuthContext } from '@/contexts/wps-auth-context'
import type { UseWpsAuthReturn } from './use-wps-auth'

/**
 * 使用WPS认证Hook
 * 必须在WpsAuthProvider内部使用
 */
export function useWpsAuthContext(): UseWpsAuthReturn {
  const context = useContext(WpsAuthContext)
  if (!context) {
    throw new Error('useWpsAuthContext must be used within WpsAuthProvider')
  }
  return context
}
