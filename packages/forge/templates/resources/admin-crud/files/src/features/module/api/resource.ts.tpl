import { apiClient } from '@/lib/api/api-client'
import { mock{{pascalName}}Records, type {{pascalName}}Record, type {{pascalName}}Status } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'
import { {{camelName}}FormSchema, type {{pascalName}}FormValues } from '@/features/{{pluralKebabName}}/lib/schema'
import { parse{{pascalName}}Search, type {{pascalName}}Search } from '@/features/{{pluralKebabName}}/lib/search'

export type {{pascalName}}ListParams = {{pascalName}}Search
export type {{pascalName}}MutationInput = {{pascalName}}FormValues
export interface {{pascalName}}ListResult { items: {{pascalName}}Record[]; total: number }

// Same mock/HTTP boundary as the users example. Mock data resets on reload.
// Connect these endpoints to your backend before setting VITE_API_MODE=http.
const endpoint = '/api/{{pluralKebabName}}'
let records = mock{{pascalName}}Records.map((item) => ({ ...item }))

function findRecord(recordId: string) {
  const record = records.find((item) => item.id === recordId)
  if (!record) throw new Error('记录不存在，请刷新列表。')
  return record
}

export async function list{{pascalName}}Records(params: Partial<{{pascalName}}ListParams> = {}): Promise<{{pascalName}}ListResult> {
  const search = parse{{pascalName}}Search(params)
  const queryString = new URLSearchParams(Object.entries(search).map(([key, value]) => [key, String(value)]))
  return apiClient.request({ path: `${endpoint}?${queryString}`, mock: () => {
    const query = search.query.trim().toLocaleLowerCase()
    const filtered = records.filter((item) =>
      (search.status === 'all' || item.status === search.status) &&
      (!query || item.name.toLocaleLowerCase().includes(query)))
    filtered.sort((a, b) => {
      const result = a[search.sort].localeCompare(b[search.sort]) || a.id.localeCompare(b.id)
      return search.order === 'desc' ? -result : result
    })
    const offset = (search.page - 1) * search.pageSize
    return { items: filtered.slice(offset, offset + search.pageSize).map((item) => ({ ...item })), total: filtered.length }
  } })
}

export async function get{{pascalName}}Record(recordId: string): Promise<{{pascalName}}Record> {
  return apiClient.request({ path: `${endpoint}/${encodeURIComponent(recordId)}`, mock: () => ({ ...findRecord(recordId) }) })
}

export async function create{{pascalName}}Record(input: {{pascalName}}MutationInput): Promise<{{pascalName}}Record> {
  const values = {{camelName}}FormSchema.parse(input)
  return apiClient.request({ path: endpoint, method: 'POST', body: values, mock: () => {
    const record = { ...values, id: crypto.randomUUID(), updatedAt: new Date().toISOString() }
    records = [record, ...records]
    return { ...record }
  } })
}

export async function update{{pascalName}}Record(recordId: string, input: {{pascalName}}MutationInput): Promise<{{pascalName}}Record> {
  const values = {{camelName}}FormSchema.parse(input)
  return apiClient.request({ path: `${endpoint}/${encodeURIComponent(recordId)}`, method: 'PATCH', body: values, mock: () => {
    const updated = { ...findRecord(recordId), ...values, updatedAt: new Date().toISOString() }
    records = records.map((item) => item.id === recordId ? updated : item)
    return { ...updated }
  } })
}

export async function change{{pascalName}}RecordsStatus(recordIds: string[], status: {{pascalName}}Status) {
  const validatedStatus = {{camelName}}FormSchema.shape.status.parse(status)
  return apiClient.request<{ updated: number }>({ path: `${endpoint}/status`, method: 'PATCH', body: { ids: recordIds, status: validatedStatus }, mock: () => {
    const selected = new Set(recordIds)
    if (recordIds.some((id) => !records.some((item) => item.id === id))) throw new Error('选中的记录已失效，请刷新列表。')
    records = records.map((item) => selected.has(item.id) ? { ...item, status: validatedStatus, updatedAt: new Date().toISOString() } : item)
    return { updated: selected.size }
  } })
}
