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
import {
  {{camelName}}StatusOptions,
  type {{pascalName}}Status,
} from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'

interface {{pascalName}}FilterBarProps {
  onActivateSelected: () => void
  onArchiveSelected: () => void
  onStatusChange: (value: 'all' | {{pascalName}}Status) => void
  selectedCount: number
  status: 'all' | {{pascalName}}Status
}

export function {{pascalName}}FilterBar({
  onActivateSelected,
  onArchiveSelected,
  onStatusChange,
  selectedCount,
  status,
}: {{pascalName}}FilterBarProps) {
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
            <Button onClick={onArchiveSelected} size='sm' variant='ghost'>
              归档
            </Button>
          </>
        ) : null
      }
    >
      <Select
        onValueChange={(value) => onStatusChange(value as 'all' | {{pascalName}}Status)}
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
          { {{camelName}}StatusOptions.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  )
}
