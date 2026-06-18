import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface FilterBarProps {
  actions?: ReactNode
  children: ReactNode
  className?: string
  variant?: 'default' | 'workspace'
}

export function FilterBar({
  actions,
  children,
  className,
  variant = 'default',
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
        variant === 'default' &&
          'rounded-xl border border-border/70 bg-muted/30 p-3',
        variant === 'workspace' && 'bg-transparent p-0',
        className
      )}
    >
      <div className='flex flex-1 flex-col gap-3 lg:flex-row lg:items-center'>
        {children}
      </div>
      {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
    </div>
  )
}
