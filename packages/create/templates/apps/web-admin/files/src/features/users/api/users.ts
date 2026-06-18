import { apiClient } from '@/lib/api/api-client'
import { ApiError } from '@/lib/api/api-error'
import {
  mockUsers,
  type UserRecord,
  type UserStatus,
} from '@/features/users/data/mock-users'
import type {
  UsersSortField,
  UsersSortOrder,
  UsersStatusFilter,
} from '@/features/users/lib/search'

export interface UsersListParams {
  order: UsersSortOrder
  page: number
  pageSize: number
  query: string
  sort: UsersSortField
  status: UsersStatusFilter
}

export interface UsersSummary {
  active: number
  invited: number
  pendingReview: number
  total: number
}

export interface UsersListResponse {
  items: UserRecord[]
  page: number
  pageSize: number
  summary: UsersSummary
  total: number
}

export interface UserMutationInput {
  email: string
  name: string
  role: string
  status: UserStatus
  team: string
}

let usersStore = [...mockUsers]

function cloneUser(user: UserRecord): UserRecord {
  return { ...user }
}

function getUsersSummary(records: UserRecord[]): UsersSummary {
  return {
    active: records.filter((record) => record.status === 'Active').length,
    invited: records.filter((record) => record.status === 'Invited').length,
    pendingReview: records.filter((record) => record.status === 'Pending MFA').length,
    total: records.length,
  }
}

function parseLastActive(lastActive: string): number {
  const match = lastActive.match(/^(\d+)(m|h|d)\s+ago$/i)

  if (!match) {
    return Number.MAX_SAFE_INTEGER
  }

  const amount = Number.parseInt(match[1], 10)
  const unit = match[2].toLowerCase()

  if (unit === 'm') return amount
  if (unit === 'h') return amount * 60
  return amount * 60 * 24
}

function sortUsers(
  records: UserRecord[],
  sort: UsersSortField,
  order: UsersSortOrder
): UserRecord[] {
  return [...records].sort((left, right) => {
    const direction = order === 'asc' ? 1 : -1

    if (sort === 'lastActive') {
      return (parseLastActive(left.lastActive) - parseLastActive(right.lastActive)) * direction
    }

    return left[sort].localeCompare(right[sort]) * direction
  })
}

function filterUsers(records: UserRecord[], params: UsersListParams): UserRecord[] {
  const query = params.query.trim().toLowerCase()

  return records.filter((record) => {
    const matchesStatus =
      params.status === 'all' ? true : record.status === params.status
    const matchesQuery = query
      ? [
          record.name,
          record.email,
          record.role,
          record.team,
          record.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      : true

    return matchesStatus && matchesQuery
  })
}

function getUserOrThrow(userId: string): UserRecord {
  const user = usersStore.find((record) => record.id === userId)

  if (!user) {
    throw new ApiError('The requested user could not be found.', {
      status: 404,
    })
  }

  return user
}

export async function listUsers(params: UsersListParams): Promise<UsersListResponse> {
  return apiClient.request({
    delayMs: 300,
    method: 'GET',
    mock: () => {
      if (params.query.trim().toLowerCase() === 'error') {
        throw new ApiError('The mock users endpoint intentionally failed for testing.', {
          status: 500,
        })
      }

      const filtered = filterUsers(usersStore, params)
      const sorted = sortUsers(filtered, params.sort, params.order)
      const start = (params.page - 1) * params.pageSize
      const end = start + params.pageSize

      return {
        items: sorted.slice(start, end).map(cloneUser),
        page: params.page,
        pageSize: params.pageSize,
        summary: getUsersSummary(usersStore),
        total: sorted.length,
      }
    },
    path: '/api/users',
  })
}

export async function getUser(userId: string): Promise<UserRecord> {
  return apiClient.request({
    delayMs: 180,
    method: 'GET',
    mock: () => cloneUser(getUserOrThrow(userId)),
    path: `/api/users/${userId}`,
  })
}

export async function createUser(input: UserMutationInput): Promise<UserRecord> {
  return apiClient.request({
    body: input,
    delayMs: 320,
    method: 'POST',
    mock: () => {
      const nextUser: UserRecord = {
        ...input,
        id: `usr_${Date.now().toString(36)}`,
        lastActive: 'Just now',
      }

      usersStore = [nextUser, ...usersStore]
      return cloneUser(nextUser)
    },
    path: '/api/users',
  })
}

export async function updateUser(
  userId: string,
  input: UserMutationInput
): Promise<UserRecord> {
  return apiClient.request({
    body: input,
    delayMs: 320,
    method: 'PATCH',
    mock: () => {
      const currentUser = getUserOrThrow(userId)
      const nextUser = {
        ...currentUser,
        ...input,
      }

      usersStore = usersStore.map((record) =>
        record.id === userId ? nextUser : record
      )

      return cloneUser(nextUser)
    },
    path: `/api/users/${userId}`,
  })
}

export async function changeUsersStatus(
  userIds: string[],
  status: UserStatus
): Promise<UserRecord[]> {
  return apiClient.request({
    body: { status, userIds },
    delayMs: 280,
    method: 'PATCH',
    mock: () => {
      usersStore = usersStore.map((record) =>
        userIds.includes(record.id)
          ? { ...record, status }
          : record
      )

      return usersStore
        .filter((record) => userIds.includes(record.id))
        .map(cloneUser)
    },
    path: '/api/users/status',
  })
}
