import { createFileRoute } from '@tanstack/react-router'

import { TableDemoPage } from '@/features/table-demo/pages/table-demo-page'

export const Route = createFileRoute('/_authenticated/table-demo')({
  component: TableDemoPage,
})
