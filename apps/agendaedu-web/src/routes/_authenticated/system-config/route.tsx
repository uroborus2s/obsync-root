import { createFileRoute } from '@tanstack/react-router'
import SystemConfig from '@/features/system-config'

export const Route = createFileRoute('/_authenticated/system-config')({
  component: SystemConfig,
})

