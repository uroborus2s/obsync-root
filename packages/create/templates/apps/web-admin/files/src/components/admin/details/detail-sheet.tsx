import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface DetailSheetProps {
  actions?: ReactNode
  children: ReactNode
  description?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function DetailSheet({
  actions,
  children,
  description,
  onOpenChange,
  open,
  title,
}: DetailSheetProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className='w-full sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className='flex-1 overflow-y-auto px-4 pb-4'>{children}</div>
        <SheetFooter className='border-t bg-background/95'>
          <Button onClick={() => onOpenChange(false)} type='button' variant='outline'>
            Close
          </Button>
          {actions}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
