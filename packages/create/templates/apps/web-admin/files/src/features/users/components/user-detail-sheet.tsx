import { MailIcon, PencilLineIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'

import { DetailSheet } from '@/components/admin/details/detail-sheet'
import { ErrorState } from '@/components/admin/feedback/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRecord } from '@/features/users/data/mock-users'

interface UserDetailSheetProps {
  error?: string | null
  isLoading?: boolean
  onEdit: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  user?: UserRecord | null
}

export function UserDetailSheet({
  error,
  isLoading = false,
  onEdit,
  onOpenChange,
  open,
  user,
}: UserDetailSheetProps) {
  return (
    <DetailSheet
      actions={
        <Button onClick={onEdit} type='button'>
          <PencilLineIcon className='size-4' />
          Edit user
        </Button>
      }
      description='Detail sheet container for the example CRUD resource.'
      onOpenChange={onOpenChange}
      open={open}
      title={user?.name ?? 'User details'}
    >
      {isLoading ? (
        <div className='space-y-4'>
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      ) : error ? (
        <ErrorState description={error} title='Unable to load user details' />
      ) : user ? (
        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <UsersIcon className='size-4 text-muted-foreground' />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Name</span>
                <span className='font-medium'>{user.name}</span>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Role</span>
                <span>{user.role}</span>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Team</span>
                <span>{user.team}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <MailIcon className='size-4 text-muted-foreground' />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Email</span>
                <span className='font-medium'>{user.email}</span>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Last active</span>
                <span>{user.lastActive}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <ShieldCheckIcon className='size-4 text-muted-foreground' />
                Access state
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant='outline'>{user.status}</Badge>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </DetailSheet>
  )
}
