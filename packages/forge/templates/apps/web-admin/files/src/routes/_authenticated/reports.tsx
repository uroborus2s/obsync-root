import { createFileRoute } from '@tanstack/react-router'

import { ReportsPage } from '@/features/reports/pages/reports-page'

export const Route = createFileRoute('/_authenticated/reports')({
  component: ReportsPage,
})
