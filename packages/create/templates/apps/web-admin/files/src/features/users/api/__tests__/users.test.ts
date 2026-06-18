import { describe, expect, it } from 'vitest'

import { listUsers } from '@/features/users/api/users'

describe('users api', () => {
  it('filters and paginates the mock user store', async () => {
    const response = await listUsers({
      order: 'asc',
      page: 1,
      pageSize: 5,
      query: 'support',
      sort: 'name',
      status: 'all',
    })

    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.every((item) => item.role.includes('Support'))).toBe(true)
    expect(response.summary.total).toBeGreaterThanOrEqual(response.total)
  })

  it('surfaces a normalized mock error for testing error states', async () => {
    await expect(
      listUsers({
        order: 'asc',
        page: 1,
        pageSize: 10,
        query: 'error',
        sort: 'name',
        status: 'all',
      })
    ).rejects.toThrow('The mock users endpoint intentionally failed for testing.')
  })
})
