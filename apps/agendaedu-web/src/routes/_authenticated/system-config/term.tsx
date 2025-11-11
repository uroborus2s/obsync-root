import { createFileRoute } from '@tanstack/react-router'
import { TermConfig } from '@/features/system-config/pages/term-config'

export const Route = createFileRoute('/_authenticated/system-config/term')({
  component: TermConfig,
})
