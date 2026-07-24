import type {
  UserMutationInput,
  UsersListParams,
} from '@/features/users/api/users'

export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (userId: string) => [...queryKeys.users.all, 'detail', userId] as const,
    list: (params: UsersListParams) => [...queryKeys.users.all, 'list', params] as const,
    mutationPreview: (payload: Partial<UserMutationInput>) =>
      [...queryKeys.users.all, 'mutation-preview', payload] as const,
  },
}
