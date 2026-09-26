import type { ReactNode } from 'react'

export function PageHeader({ title, description, actions }: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-w-0'>
        <h2 className='text-2xl font-semibold tracking-tight text-foreground'>{title}</h2>
        {description ? <p className='mt-2 text-sm leading-6 text-muted-foreground'>{description}</p> : null}
      </div>
      {actions ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div> : null}
    </header>
  )
}
