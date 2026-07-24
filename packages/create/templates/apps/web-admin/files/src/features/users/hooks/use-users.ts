import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/lib/api/query-keys'
import {
  changeUsersStatus,
  createUser,
  getUser,
  listUsers,
  updateUser,
  type UserMutationInput,
  type UsersListParams,
} from '@/features/users/api/users'
import type { UserStatus } from '@/features/users/data/mock-users'

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  ])
}

export function useUsersList(params: UsersListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => listUsers(params),
  })
}

export function useUserDetail(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: queryKeys.users.detail(userId ?? 'missing'),
    queryFn: () => getUser(userId as string),
  })
}

export function useCreateUserMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UserMutationInput) => createUser(input),
    onSuccess: async () => {
      toast.success('User created successfully.')
      await invalidateUsers(queryClient)
      onSuccess?.()
    },
  })
}

export function useUpdateUserMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, userId }: { input: UserMutationInput; userId: string }) =>
      updateUser(userId, input),
    onSuccess: async (_, variables) => {
      toast.success('User updated successfully.')
      await invalidateUsers(queryClient)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.userId),
      })
      onSuccess?.()
    },
  })
}

export function useChangeUsersStatusMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ status, userIds }: { status: UserStatus; userIds: string[] }) =>
      changeUsersStatus(userIds, status),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === 'Suspended'
          ? 'Selected users were suspended.'
          : 'Selected users were activated.'
      )
      await invalidateUsers(queryClient)
      onSuccess?.()
    },
  })
}
