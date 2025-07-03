import { createContext } from 'react'
import type { UseWpsAuthReturn } from '@/hooks/use-wps-auth'

export const WpsAuthContext = createContext<UseWpsAuthReturn | null>(null)
