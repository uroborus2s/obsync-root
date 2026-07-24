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

interface FormSheetProps {
  children: ReactNode
  description: string
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  open: boolean
  submitLabel?: string
  submitting?: boolean
  title: string
}

export function FormSheet({
  children,
  description,
  onOpenChange,
  onSubmit,
  open,
  submitLabel = 'Save changes',
  submitting = false,
  title,
}: FormSheetProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className='w-full sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className='flex-1 overflow-y-auto px-4 pb-4'>{children}</div>
        <SheetFooter className='border-t bg-background/95'>
          <Button onClick={() => onOpenChange(false)} type='button' variant='outline'>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={onSubmit} type='button'>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
