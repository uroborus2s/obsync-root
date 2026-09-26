import { z } from 'zod'
import { {{camelName}}StatusOptions } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'

// URL state is untrusted; reject partial numbers, unsupported fields and unbounded page sizes.
const positiveInteger = z.coerce.number().int().positive()
const searchSchema = z.object({
  page: positiveInteger.max(Number.MAX_SAFE_INTEGER).catch(1),
  pageSize: z.coerce.number().int().refine((value) => [10, 20, 50, 100].includes(value)).catch(10),
  query: z.string().catch(''),
  status: z.enum(['all', ...{{camelName}}StatusOptions]).catch('all'),
  sort: z.enum(['name', 'owner', 'status', 'updatedAt']).catch('name'),
  order: z.enum(['asc', 'desc']).catch('asc'),
})
export type {{pascalName}}Search = z.infer<typeof searchSchema>
export function parse{{pascalName}}Search(search: Record<string, unknown>): {{pascalName}}Search {
  return searchSchema.parse(search)
}
