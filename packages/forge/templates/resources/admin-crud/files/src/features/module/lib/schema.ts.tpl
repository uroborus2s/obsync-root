import { z } from 'zod'

import {
  {{camelName}}StatusOptions,
  type {{pascalName}}Record,
} from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'

export const {{camelName}}FormSchema = z.object({
  description: z
    .string()
    .min(10, 'Description should be at least 10 characters.')
    .max(240, 'Description should be at most 240 characters.'),
  name: z.string().min(2, 'Name should be at least 2 characters.'),
  owner: z.string().min(2, 'Owner should be at least 2 characters.'),
  status: z.enum({{camelName}}StatusOptions),
})

export type {{pascalName}}FormValues = z.infer<typeof {{camelName}}FormSchema>

export function get{{pascalName}}FormDefaults(
  record?: {{pascalName}}Record | null
): {{pascalName}}FormValues {
  return {
    description: record?.description ?? '',
    name: record?.name ?? '',
    owner: record?.owner ?? '',
    status: record?.status ?? 'Draft',
  }
}
