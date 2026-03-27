import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  action?: ReactNode
  description: string
  icon?: ReactNode
  title: string
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <Card className='border-dashed shadow-none'>
      <CardContent className='flex flex-col items-center justify-center gap-4 px-6 py-10 text-center'>
        {icon ? (
          <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
            {icon}
          </div>
        ) : null}
        <div className='space-y-2'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <p className='max-w-md text-sm text-muted-foreground'>{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

interface ErrorStateProps {
  description: string
  onRetry?: () => void
  title?: string
}

export function ErrorState({
  description,
  onRetry,
  title = 'Something went wrong',
}: ErrorStateProps) {
  return (
    <EmptyState
      action={
        onRetry ? (
          <Button onClick={onRetry} variant='outline'>
            Try again
          </Button>
        ) : undefined
      }
      description={description}
      title={title}
    />
  )
}
