import { ArrowLeft, Home, RefreshCw } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ErrorShellProps {
  code: string
  title: string
  description: string
  resetLabel?: string
  onReset?: () => void
}

export function ErrorShell({
  code,
  title,
  description,
  resetLabel = 'Try again',
  onReset,
}: ErrorShellProps) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.16),_transparent_42%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,0.9))] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.22),_transparent_38%),linear-gradient(180deg,_rgba(2,6,23,1),_rgba(15,23,42,0.94))]'>
      <Card className='w-full max-w-2xl rounded-[32px] border-border/70 bg-background/92'>
        <CardHeader className='pb-4'>
          <Badge className='mb-4' variant='outline'>
            Error {code}
          </Badge>
          <CardTitle className='text-3xl'>{title}</CardTitle>
          <CardDescription className='max-w-xl text-base leading-7'>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-3'>
          <Button onClick={() => window.history.back()} variant='outline'>
            <ArrowLeft className='size-4' />
            Go back
          </Button>
          <Link
            className={cn(buttonVariants({ variant: 'secondary' }))}
            to='/'
          >
            <Home className='size-4' />
            Back to dashboard
          </Link>
          {onReset ? (
            <Button onClick={onReset}>
              <RefreshCw className='size-4' />
              {resetLabel}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
