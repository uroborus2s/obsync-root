// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { {{pascalName}}Page } from '@/features/{{pluralKebabName}}/pages/{{pluralKebabName}}-page'
import { {{camelName}}QueryKeys } from '@/features/{{pluralKebabName}}/hooks/use-{{pluralKebabName}}'
import { parse{{pascalName}}Search } from '@/features/{{pluralKebabName}}/lib/search'
import { mock{{pascalName}}Records } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'

const transport = vi.hoisted(() => ({ get: vi.fn(), navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ getRouteApi: () => ({
  useSearch: () => ({ page: 1, pageSize: 10, query: '', status: 'all', sort: 'name', order: 'asc' }),
  useNavigate: () => transport.navigate,
}) }))
vi.mock('@/features/{{pluralKebabName}}/api/{{pluralKebabName}}', async (original) => ({
  ...await original<object>(), get{{pascalName}}Record: transport.get,
}))
vi.mock('@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-columns', () => ({
  create{{pascalName}}Columns: ({ onEdit }: { onEdit: (id: string) => void }) => [
    { accessorKey: 'name', header: '名称' },
    { id: 'edit', cell: ({ row }: { row: { original: { id: string } } }) => <button onClick={() => onEdit(row.original.id)}>编辑行</button> },
  ],
}))

it('keeps dirty edits through a failed stale-detail refresh and a successful retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const record = mock{{pascalName}}Records[0]!
  const key = {{camelName}}QueryKeys.detail(record.id)
  client.setQueryData({{camelName}}QueryKeys.list(parse{{pascalName}}Search({})), { items: [record], total: 1 })
  client.setQueryDefaults(key, { staleTime: 30_000 })
  client.setQueryData(key, record, { updatedAt: Date.now() - 60_000 })
  let reject!: (error: Error) => void
  transport.get.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise }))
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><{{pascalName}}Page /></QueryClientProvider>))
    await act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === '编辑行')!.click())
    const input = document.querySelector<HTMLInputElement>('input[name="name"]')!
    expect(input.value).toBe(record.name)
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '未保存的编辑内容')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => { reject(new Error('refresh unavailable')); await new Promise((resolve) => setTimeout(resolve, 10)) })
    expect(client.getQueryState(key)?.status).toBe('error')
    expect(document.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('未保存的编辑内容')
    transport.get.mockResolvedValueOnce({ ...record, name: '后台更新的名称' })
    await act(async () => { await client.refetchQueries({ queryKey: key }); await new Promise((resolve) => setTimeout(resolve, 10)) })
    expect(client.getQueryState(key)?.status).toBe('success')
    expect(document.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('未保存的编辑内容')
  } finally {
    await act(async () => root.unmount())
    container.remove()
    client.clear()
    vi.unstubAllGlobals()
  }
})
