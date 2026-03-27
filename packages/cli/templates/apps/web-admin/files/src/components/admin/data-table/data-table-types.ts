import type { RowData } from '@tanstack/react-table'

export interface ExpandableColumnGroupConfig {
  defaultExpanded?: boolean
  keepVisibleLeafIds?: string[]
}

export interface DataTableColumnMeta {
  cellClassName?: string
  expandableGroup?: ExpandableColumnGroupConfig
  headerClassName?: string
  maxChars?: number
  pin?: 'left' | 'right'
  tooltip?: boolean
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue>
    extends DataTableColumnMeta {}
}

export {}
