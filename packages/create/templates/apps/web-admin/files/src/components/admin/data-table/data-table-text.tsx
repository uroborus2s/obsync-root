import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface DataTableTextProps {
  className?: string
  maxChars?: number
  tooltip?: boolean
  value: string
}

function truncateValue(value: string, maxChars?: number) {
  if (!maxChars || value.length <= maxChars) {
    return {
      isTruncated: false,
      value,
    }
  }

  return {
    isTruncated: true,
    value: `${value.slice(0, Math.max(0, maxChars)).trimEnd()}...`,
  }
}

export function DataTableText({
  className,
  maxChars,
  tooltip = false,
  value,
}: DataTableTextProps) {
  const normalizedValue = value.trim()
  const { value: displayValue } = truncateValue(normalizedValue, maxChars)
  const shouldShowTooltip = tooltip && normalizedValue.length > 0

  const content = (
    <span className={cn('block max-w-full truncate', className)}>{displayValue}</span>
  )

  if (!shouldShowTooltip) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className='max-w-sm whitespace-pre-wrap break-words'>
        {normalizedValue}
      </TooltipContent>
    </Tooltip>
  )
}
