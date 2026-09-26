import { createFileRoute } from '@tanstack/react-router'
import { {{pascalName}}Page } from '@/features/{{pluralKebabName}}/pages/{{pluralKebabName}}-page'
import { parse{{pascalName}}Search } from '@/features/{{pluralKebabName}}/lib/search'

export const Route = createFileRoute('/_authenticated/{{pluralKebabName}}')({
  validateSearch: parse{{pascalName}}Search,
  component: {{pascalName}}Page,
})
