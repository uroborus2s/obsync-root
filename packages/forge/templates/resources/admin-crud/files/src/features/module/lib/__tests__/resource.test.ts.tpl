import { afterEach, describe, expect, it, vi } from 'vitest'
import { parse{{pascalName}}Search } from '@/features/{{pluralKebabName}}/lib/search'
import { list{{pascalName}}Records, create{{pascalName}}Record, update{{pascalName}}Record, get{{pascalName}}Record, change{{pascalName}}RecordsStatus } from '@/features/{{pluralKebabName}}/api/{{pluralKebabName}}'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('{{pascalName}} resource contract', () => {
  it('normalizes malformed URL filters and rejects partial/unbounded pagination', () => {
    expect(parse{{pascalName}}Search({ page: '2oops', pageSize: 1000000, status: 'invalid', sort: '__proto__' })).toEqual({
      page: 1, pageSize: 10, query: '', status: 'all', sort: 'name', order: 'asc',
    })
    expect(parse{{pascalName}}Search({ page: '2', pageSize: '20', order: 'desc' })).toMatchObject({ page: 2, pageSize: 20, order: 'desc' })
  })
  it('uses the app HTTP boundary and query parameters when mock mode is disabled', async () => {
    vi.stubEnv('VITE_API_MODE', 'http')
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    await list{{pascalName}}Records({ query: 'a & b', page: 2 })
    const url = new URL(fetcher.mock.calls[0]![0], 'http://test.local')
    expect(url.searchParams.get('query')).toBe('a & b')
    expect(url.searchParams.get('page')).toBe('2')
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    await expect(list{{pascalName}}Records()).rejects.toThrow()
  })
  it('filters before counting/paging, persists mutations across reads and rejects missing records', async () => {
    const input = { name: 'Contract record', owner: 'Tester', status: 'Draft' as const, description: 'A valid resource for the contract test.' }
    const created = await create{{pascalName}}Record(input)
    const result = await list{{pascalName}}Records({ query: 'Contract record', status: 'Draft' })
    expect(result).toEqual({ items: [created], total: 1 })
    expect(await list{{pascalName}}Records({ query: input.name, page: 2 })).toEqual({ items: [], total: 1 })
    await update{{pascalName}}Record(created.id, { ...input, name: 'Updated contract' })
    await change{{pascalName}}RecordsStatus([created.id], 'Archived')
    expect(await get{{pascalName}}Record(created.id)).toMatchObject({ name: 'Updated contract', status: 'Archived' })
    await expect(update{{pascalName}}Record('missing', input)).rejects.toThrow('记录不存在')
    await expect(change{{pascalName}}RecordsStatus([created.id, 'missing'], 'Active')).rejects.toThrow('记录已失效')
    expect((await get{{pascalName}}Record(created.id)).status).toBe('Archived')
    await expect(create{{pascalName}}Record({ ...input, name: '' })).rejects.toThrow()
  })
})
