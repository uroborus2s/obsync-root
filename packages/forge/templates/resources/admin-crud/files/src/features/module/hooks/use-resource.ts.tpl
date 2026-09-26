import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { list{{pascalName}}Records, get{{pascalName}}Record, create{{pascalName}}Record, update{{pascalName}}Record, change{{pascalName}}RecordsStatus, type {{pascalName}}ListParams } from '@/features/{{pluralKebabName}}/api/{{pluralKebabName}}'
import type { {{pascalName}}FormValues } from '@/features/{{pluralKebabName}}/lib/schema'
import type { {{pascalName}}Status } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'

export const {{camelName}}QueryKeys = {
  all: ['{{pluralKebabName}}'] as const,
  list: (params: {{pascalName}}ListParams) => ['{{pluralKebabName}}', 'list', params] as const,
  detail: (id: string) => ['{{pluralKebabName}}', 'detail', id] as const,
}

export function use{{pascalName}}List(params: {{pascalName}}ListParams) {
  return useQuery({ queryKey: {{camelName}}QueryKeys.list(params), queryFn: () => list{{pascalName}}Records(params) })
}
export function use{{pascalName}}Detail(id?: string) {
  return useQuery({ queryKey: {{camelName}}QueryKeys.detail(id ?? ''), queryFn: () => get{{pascalName}}Record(id!), enabled: Boolean(id) })
}
export function use{{pascalName}}Mutations() {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: {{camelName}}QueryKeys.all })
  const create = useMutation({ mutationFn: create{{pascalName}}Record, onSuccess: refresh })
  const update = useMutation({ mutationFn: ({ id, values }: { id: string; values: {{pascalName}}FormValues }) => update{{pascalName}}Record(id, values), onSuccess: refresh })
  const changeStatus = useMutation({ mutationFn: ({ ids, status }: { ids: string[]; status: {{pascalName}}Status }) => change{{pascalName}}RecordsStatus(ids, status), onSuccess: refresh })
  return { create, update, changeStatus }
}
