import { FilterBar } from '@/components/admin/filters/filter-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { userStatuses } from '@/features/users/data/mock-users'
import type { UsersStatusFilter } from '@/features/users/lib/search'

interface UserFilterBarProps {
  onStatusChange: (value: UsersStatusFilter) => void
  onSuspendSelected: () => void
  onActivateSelected: () => void
  selectedCount: number
  status: UsersStatusFilter
}

export function UserFilterBar({
  onActivateSelected,
  onStatusChange,
  onSuspendSelected,
  selectedCount,
  status,
}: UserFilterBarProps) {
  return (
    <FilterBar
      variant='workspace'
      actions={
        selectedCount > 0 ? (
          <>
            <Badge variant='secondary'>{selectedCount} 项已选</Badge>
            <Button onClick={onActivateSelected} size='sm' variant='ghost'>
              启用
            </Button>
            <Button onClick={onSuspendSelected} size='sm' variant='ghost'>
              停用
            </Button>
          </>
        ) : null
      }
    >
      <Select
        onValueChange={(value) => onStatusChange(value as UsersStatusFilter)}
        value={status}
      >
        <SelectTrigger
          className='h-10 w-[180px] rounded-2xl border border-border/70 bg-background px-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] focus-visible:ring-0'
          size='sm'
        >
          <SelectValue placeholder='筛选状态' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>全部状态</SelectItem>
          {userStatuses.map((userStatus) => (
            <SelectItem key={userStatus} value={userStatus}>
              {userStatus}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  )
}
