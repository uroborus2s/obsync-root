import { useRouterState } from '@tanstack/react-router'

import { cn } from '@/lib/utils'

export function NavigationProgress() {
  const status = useRouterState({
    select: (state) => state.status,
  })

  const isPending = status === 'pending'

  return (
    <div
      aria-hidden='true'
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden transition-opacity duration-200',
        isPending ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className='h-full w-full origin-left animate-[pulse_1.2s_ease-in-out_infinite] bg-gradient-to-r from-teal-500 via-sky-500 to-amber-400' />
    </div>
  )
}
