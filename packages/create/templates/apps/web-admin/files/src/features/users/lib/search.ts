import type { PaginationState, SortingState } from '@tanstack/react-table'

import { userStatuses, type UserStatus } from '@/features/users/data/mock-users'

export type UsersStatusFilter = UserStatus | 'all'
export type UsersSortField = 'name' | 'role' | 'team' | 'status' | 'lastActive'
export type UsersSortOrder = 'asc' | 'desc'

export interface UsersSearch {
  detail?: string
  form?: 'create' | 'edit'
  order: UsersSortOrder
  page: number
  pageSize: number
  query: string
  sort: UsersSortField
  status: UsersStatusFilter
  userId?: string
}

export const defaultUsersSearch: UsersSearch = {
  order: 'asc',
  page: 1,
  pageSize: 10,
  query: '',
  sort: 'name',
  status: 'all',
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function isUsersStatusFilter(value: unknown): value is UsersStatusFilter {
  return value === 'all' || userStatuses.includes(value as UserStatus)
}

function isUsersSortField(value: unknown): value is UsersSortField {
  return (
    value === 'name' ||
    value === 'role' ||
    value === 'team' ||
    value === 'status' ||
    value === 'lastActive'
  )
}

function isUsersSortOrder(value: unknown): value is UsersSortOrder {
  return value === 'asc' || value === 'desc'
}

export function parseUsersSearch(search: Record<string, unknown>): UsersSearch {
  return {
    detail: typeof search.detail === 'string' ? search.detail : undefined,
    form: search.form === 'create' || search.form === 'edit' ? search.form : undefined,
    order: isUsersSortOrder(search.order) ? search.order : defaultUsersSearch.order,
    page: parsePositiveInt(search.page, defaultUsersSearch.page),
    pageSize: parsePositiveInt(search.pageSize, defaultUsersSearch.pageSize),
    query: typeof search.query === 'string' ? search.query : defaultUsersSearch.query,
    sort: isUsersSortField(search.sort) ? search.sort : defaultUsersSearch.sort,
    status: isUsersStatusFilter(search.status) ? search.status : defaultUsersSearch.status,
    userId: typeof search.userId === 'string' ? search.userId : undefined,
  }
}

export function toUsersSortingState(search: UsersSearch): SortingState {
  return [
    {
      desc: search.order === 'desc',
      id: search.sort,
    },
  ]
}

export function toUsersPaginationState(search: UsersSearch): PaginationState {
  return {
    pageIndex: search.page - 1,
    pageSize: search.pageSize,
  }
}

