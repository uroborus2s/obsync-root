import { Boxes } from 'lucide-react'

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className='flex items-center gap-3'>
      <div className='bg-sidebar-primary text-sidebar-primary-foreground flex size-10 items-center justify-center rounded-2xl shadow-[0_12px_28px_-20px_hsl(var(--foreground)/0.65)]'>
        <Boxes className='size-4' />
      </div>
      {!compact && (
        <div className='min-w-0 group-data-[collapsible=icon]:hidden'>
          <p className='truncate text-[11px] font-medium tracking-[0.24em] text-sidebar-foreground/42 uppercase'>
            Admin Kit
          </p>
          <p className='truncate text-[15px] font-semibold text-sidebar-foreground'>
            {{pascalName}} Console
          </p>
        </div>
      )}
    </div>
  )
}
