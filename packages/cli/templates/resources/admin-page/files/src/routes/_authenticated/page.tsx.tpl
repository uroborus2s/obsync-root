import { createFileRoute } from '@tanstack/react-router'

import { {{pascalName}}Page } from '@/features/{{kebabName}}'

export const Route = createFileRoute('/_authenticated/{{kebabName}}')({
  component: {{pascalName}}Page,
})
