import type { ComponentProps } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Shared create action; visibility and click/navigation behavior belong to the page. */
export function CreateButton({ children = '新建', ...props }: ComponentProps<typeof Button>) {
  return <Button type='button' {...props}><Plus className='size-4' aria-hidden />{children}</Button>
}
