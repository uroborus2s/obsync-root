import { describe, expect, it } from 'vitest'

import {
  defaultUsersSearch,
  parseUsersSearch,
  toUsersPaginationState,
  toUsersSortingState,
} from '@/features/users/lib/search'

describe('users search helpers', () => {
  it('returns sane defaults for invalid search params', () => {
    expect(parseUsersSearch({ page: 'x', sort: 'unknown' })).toEqual(
      defaultUsersSearch
    )
  })

  it('parses supported search params and converts them to table state', () => {
    const search = parseUsersSearch({
      order: 'desc',
      page: '3',
      pageSize: '20',
      query: 'alex',
      sort: 'role',
      status: 'Active',
    })

    expect(search).toMatchObject({
      order: 'desc',
      page: 3,
      pageSize: 20,
      query: 'alex',
      sort: 'role',
      status: 'Active',
    })
    expect(toUsersSortingState(search)).toEqual([{ desc: true, id: 'role' }])
    expect(toUsersPaginationState(search)).toEqual({ pageIndex: 2, pageSize: 20 })
  })
})
