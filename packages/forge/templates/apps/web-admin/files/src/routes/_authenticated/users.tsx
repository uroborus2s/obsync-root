import { createFileRoute } from '@tanstack/react-router'

import { UsersPage } from '@/features/users/pages/users-page'
import {
  parseUsersSearch,
  type UsersSearch,
} from '@/features/users/lib/search'

export const Route = createFileRoute('/_authenticated/users')({
  validateSearch: (search): UsersSearch => parseUsersSearch(search),
  component: UsersPage,
})
