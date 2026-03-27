import { z } from 'zod'

import {
  userRoleOptions,
  userStatuses,
  userTeamOptions,
  type UserRecord,
} from '@/features/users/data/mock-users'

export const userFormSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  name: z.string().min(2, 'Name should be at least 2 characters.'),
  role: z.enum(userRoleOptions),
  status: z.enum(userStatuses),
  team: z.enum(userTeamOptions),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export function getUserFormDefaults(user?: UserRecord | null): UserFormValues {
  const safeRole = userRoleOptions.includes(user?.role as (typeof userRoleOptions)[number])
    ? (user?.role as (typeof userRoleOptions)[number])
    : userRoleOptions[0]
  const safeTeam = userTeamOptions.includes(user?.team as (typeof userTeamOptions)[number])
    ? (user?.team as (typeof userTeamOptions)[number])
    : userTeamOptions[0]

  return {
    email: user?.email ?? '',
    name: user?.name ?? '',
    role: safeRole,
    status: user?.status ?? 'Invited',
    team: safeTeam,
  }
}
