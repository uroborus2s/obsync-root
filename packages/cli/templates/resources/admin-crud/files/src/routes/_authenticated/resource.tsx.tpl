import { createFileRoute } from '@tanstack/react-router'

import { {{pascalName}}Page } from '@/features/{{pluralKebabName}}'

export const Route = createFileRoute('/_authenticated/{{pluralKebabName}}')({
  component: {{pascalName}}Page,
})
