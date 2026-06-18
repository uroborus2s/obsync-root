import * as React from 'react'
import {
  flexRender,
  getFacetedRowModel,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type Header,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'

import { DataTablePagination } from '@/components/admin/data-table/data-table-pagination'
import { DataTableText } from '@/components/admin/data-table/data-table-text'
import type { ExpandableColumnGroupConfig } from '@/components/admin/data-table/data-table-types'
import { DataTableViewOptions } from '@/components/admin/data-table/data-table-view-options'
import { ErrorState } from '@/components/admin/feedback/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ExpandableGroupDefinition {
  defaultExpanded: boolean
  id: string
  keepVisibleLeafIds: string[]
  leafIds: string[]
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  defaultCellMaxChars?: number
  emptyState?: React.ReactNode
  error?: string | null
  fillHeight?: boolean
  isLoading?: boolean
  onPaginationChange?: OnChangeFn<PaginationState>
  onRetry?: () => void
  onSearchValueChange?: (value: string) => void
  onSortingChange?: OnChangeFn<SortingState>
  pageCount?: number
  pagination?: PaginationState
  renderToolbar?: (table: TanStackTable<TData>) => React.ReactNode
  searchColumn?: string
  searchPlaceholder?: string
  searchValue?: string
  sorting?: SortingState
  toolbarVariant?: 'default' | 'workspace'
}

function getColumnId<TData, TValue>(column: ColumnDef<TData, TValue>, index: number) {
  if ('id' in column && typeof column.id === 'string') {
    return column.id
  }

  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey
  }

  return `column-${index}`
}

function hasChildColumns<TData, TValue>(
  column: ColumnDef<TData, TValue>
): column is ColumnDef<TData, TValue> & { columns: ColumnDef<TData, TValue>[] } {
  return 'columns' in column && Array.isArray(column.columns)
}

function collectLeafColumnIds<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): string[] {
  return columns.flatMap((column, index) => {
    if (hasChildColumns(column)) {
      return collectLeafColumnIds(column.columns)
    }

    return [getColumnId(column, index)]
  })
}

function collectExpandableGroups<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): ExpandableGroupDefinition[] {
  return columns.flatMap((column, index) => {
    const nestedGroups = hasChildColumns(column)
      ? collectExpandableGroups(column.columns)
      : []

    if (!hasChildColumns(column) || !column.meta?.expandableGroup) {
      return nestedGroups
    }

    const meta = column.meta.expandableGroup as ExpandableColumnGroupConfig
    const leafIds = collectLeafColumnIds(column.columns)
    const keepVisibleLeafIds =
      meta.keepVisibleLeafIds?.filter((leafId) => leafIds.includes(leafId)) ??
      leafIds.slice(0, 1)

    return [
      {
        defaultExpanded: meta.defaultExpanded ?? true,
        id: getColumnId(column, index),
        keepVisibleLeafIds,
        leafIds,
      },
      ...nestedGroups,
    ]
  })
}

function collectPinnedColumns<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): ColumnPinningState {
  return columns.reduce<{ left: string[]; right: string[] }>(
    (accumulator, column, index) => {
      if (hasChildColumns(column)) {
        const nested = collectPinnedColumns(column.columns)

        return {
          left: [...accumulator.left, ...(nested.left ?? [])],
          right: [...accumulator.right, ...(nested.right ?? [])],
        }
      }

      const columnId = getColumnId(column, index)

      if (column.meta?.pin === 'left') {
        accumulator.left.push(columnId)
      }

      if (column.meta?.pin === 'right') {
        accumulator.right.push(columnId)
      }

      return accumulator
    },
    {
      left: [],
      right: [],
    }
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultCellMaxChars,
  emptyState,
  error,
  fillHeight = false,
  isLoading = false,
  onPaginationChange,
  onRetry,
  onSearchValueChange,
  onSortingChange,
  pageCount,
  pagination,
  renderToolbar,
  searchColumn,
  searchPlaceholder = 'Search...',
  searchValue,
  sorting,
  toolbarVariant = 'default',
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const initialPinnedColumns = React.useMemo(() => collectPinnedColumns(columns), [columns])
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialPinnedColumns
  )
  const [rowSelection, setRowSelection] = React.useState({})
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const expandableGroups = React.useMemo(() => collectExpandableGroups(columns), [columns])
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        expandableGroups.map((group) => [group.id, group.defaultExpanded])
      )
  )
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [viewportWidth, setViewportWidth] = React.useState(0)

  const resolvedSorting = sorting ?? internalSorting
  const resolvedPagination = pagination ?? internalPagination
  const resolvedOnSortingChange = onSortingChange ?? setInternalSorting
  const resolvedOnPaginationChange = onPaginationChange ?? setInternalPagination
  const resolvedColumnVisibility = React.useMemo(() => {
    const nextVisibility = { ...columnVisibility }

    expandableGroups.forEach((group) => {
      if (expandedGroups[group.id]) {
        return
      }

      group.leafIds.forEach((leafId) => {
        if (group.keepVisibleLeafIds.includes(leafId)) {
          return
        }

        nextVisibility[leafId] = false
      })
    })

    return nextVisibility
  }, [columnVisibility, expandableGroups, expandedGroups])

  React.useEffect(() => {
    setExpandedGroups((previous) => {
      const nextState: Record<string, boolean> = {}

      expandableGroups.forEach((group) => {
        nextState[group.id] = previous[group.id] ?? group.defaultExpanded
      })

      return nextState
    })
  }, [expandableGroups])

  React.useEffect(() => {
    setColumnPinning((previous) => ({
      left: Array.from(
        new Set([...(initialPinnedColumns.left ?? []), ...(previous.left ?? [])])
      ),
      right: Array.from(
        new Set([...(initialPinnedColumns.right ?? []), ...(previous.right ?? [])])
      ),
    }))
  }, [initialPinnedColumns])

  React.useEffect(() => {
    const node = viewportRef.current

    if (!node) {
      return
    }

    const syncWidth = () => setViewportWidth(node.clientWidth)

    syncWidth()

    const observer = new ResizeObserver(syncWidth)
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  const table = useReactTable({
    data,
    columns,
    defaultColumn: {
      minSize: 96,
      size: 160,
    },
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFilteredRowModel: onSearchValueChange ? undefined : getFilteredRowModel(),
    getPaginationRowModel:
      typeof pageCount === 'number' ? undefined : getPaginationRowModel(),
    getSortedRowModel: onSortingChange ? undefined : getSortedRowModel(),
    manualFiltering: Boolean(onSearchValueChange),
    manualPagination: typeof pageCount === 'number',
    manualSorting: Boolean(onSortingChange),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onPaginationChange: resolvedOnPaginationChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: resolvedOnSortingChange,
    pageCount,
    state: {
      columnFilters,
      columnPinning,
      columnVisibility: resolvedColumnVisibility,
      pagination: resolvedPagination,
      rowSelection,
      sorting: resolvedSorting,
    },
  })

  const searchableColumn = searchColumn ? table.getColumn(searchColumn) : undefined

  React.useEffect(() => {
    if (!searchableColumn || onSearchValueChange) {
      return
    }

    searchableColumn.setFilterValue(searchValue ?? '')
  }, [onSearchValueChange, searchValue, searchableColumn])

  const visibleLeafColumns = table.getVisibleLeafColumns()
  const totalLeafWidth = visibleLeafColumns.reduce(
    (sum, column) => sum + column.getSize(),
    0
  )
  const extraWidthPerColumn =
    visibleLeafColumns.length > 0 && viewportWidth > totalLeafWidth
      ? (viewportWidth - totalLeafWidth) / visibleLeafColumns.length
      : 0
  const getDisplayWidth = React.useCallback(
    (_columnId: string, fallbackWidth: number) => fallbackWidth + extraWidthPerColumn,
    [extraWidthPerColumn]
  )
  const tableDisplayWidth =
    visibleLeafColumns.length > 0
      ? visibleLeafColumns.reduce(
          (sum, column) => sum + getDisplayWidth(column.id, column.getSize()),
          0
        )
      : viewportWidth

  const leftPinnedColumns = table.getLeftVisibleLeafColumns()
  const rightPinnedColumns = table.getRightVisibleLeafColumns()
  const leftPinnedOffsets = new Map<string, number>()
  const rightPinnedOffsets = new Map<string, number>()

  let leftOffset = 0
  leftPinnedColumns.forEach((column) => {
    leftPinnedOffsets.set(column.id, leftOffset)
    leftOffset += getDisplayWidth(column.id, column.getSize())
  })

  let rightOffset = 0
  ;[...rightPinnedColumns].reverse().forEach((column) => {
    rightPinnedOffsets.set(column.id, rightOffset)
    rightOffset += getDisplayWidth(column.id, column.getSize())
  })

  const getPinnedCellStyles = React.useCallback(
    (column: ReturnType<TanStackTable<TData>['getAllColumns']>[number]) => {
      const pinned = column.getIsPinned()

      if (!pinned) {
        return undefined
      }

      const isLastLeftPinnedColumn =
        pinned === 'left' &&
        leftPinnedColumns[leftPinnedColumns.length - 1]?.id === column.id
      const isFirstRightPinnedColumn =
        pinned === 'right' && rightPinnedColumns[0]?.id === column.id

      return {
        background: 'hsl(var(--background))',
        boxShadow: isLastLeftPinnedColumn
          ? '2px 0 0 hsl(var(--border) / 0.7)'
          : isFirstRightPinnedColumn
            ? '-2px 0 0 hsl(var(--border) / 0.7)'
            : undefined,
        left:
          pinned === 'left' ? `${leftPinnedOffsets.get(column.id) ?? 0}px` : undefined,
        position: 'sticky' as const,
        right:
          pinned === 'right'
            ? `${rightPinnedOffsets.get(column.id) ?? 0}px`
            : undefined,
        zIndex: 2,
      }
    },
    [leftPinnedColumns, leftPinnedOffsets, rightPinnedColumns, rightPinnedOffsets]
  )

  const getHeaderDisplayWidth = React.useCallback(
    (header: Header<TData, unknown>) => {
      if (header.subHeaders.length > 0) {
        return header
          .getLeafHeaders()
          .filter((leafHeader) => leafHeader.column.getIsVisible())
          .reduce(
            (sum, leafHeader) =>
              sum +
              getDisplayWidth(leafHeader.column.id, leafHeader.column.getSize()),
            0
          )
      }

      return getDisplayWidth(header.column.id, header.column.getSize())
    },
    [getDisplayWidth]
  )

  const toggleColumnGroup = React.useCallback((groupId: string) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }))
  }, [])

  return (
    <div
      className={cn(
        'space-y-4',
        fillHeight && 'flex min-h-0 flex-1 flex-col space-y-0'
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-3 lg:flex-row lg:items-center',
          fillHeight && 'pb-4'
        )}
      >
        {searchableColumn ? (
          <Input
            className={cn(
              'h-9 lg:max-w-sm',
              toolbarVariant === 'workspace' &&
                'h-10 rounded-2xl border border-border/70 bg-background px-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] focus-visible:ring-0'
            )}
            onChange={(event) => {
              const nextValue = event.target.value

              if (onSearchValueChange) {
                onSearchValueChange(nextValue)
                return
              }

              searchableColumn.setFilterValue(nextValue)
            }}
            placeholder={searchPlaceholder}
            value={(searchValue ?? searchableColumn.getFilterValue() ?? '') as string}
          />
        ) : null}
        {renderToolbar ? renderToolbar(table) : null}
        <DataTableViewOptions table={table} variant={toolbarVariant} />
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-[22px] border border-border/70 bg-background/96',
          fillHeight && 'min-h-0 flex flex-1 flex-col'
        )}
      >
        <div
          className={cn(fillHeight && 'min-h-0 flex-1')}
          ref={viewportRef}
        >
          <Table
            className='text-sm'
            containerClassName={cn(
              'w-full',
              fillHeight ? 'min-h-0 h-full overflow-auto' : 'overflow-auto'
            )}
            style={{ width: tableDisplayWidth || '100%' }}
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      className={cn(
                        'h-11 border-b border-border/70 bg-background/96 px-3 text-sm font-semibold',
                        header.column.columnDef.meta?.headerClassName
                      )}
                      key={header.id}
                      style={{
                        ...getPinnedCellStyles(header.column),
                        width: getHeaderDisplayWidth(header),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : header.column.columnDef.meta?.expandableGroup &&
                            header.subHeaders.length > 0 ? (
                              <button
                                className='inline-flex items-center gap-1.5 font-semibold'
                                onClick={() => toggleColumnGroup(header.column.id)}
                                type='button'
                              >
                                <span>
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                                {expandedGroups[header.column.id] ? (
                                  <ChevronDownIcon className='size-4' />
                                ) : (
                                  <ChevronRightIcon className='size-4' />
                                )}
                              </button>
                            ) : (
                              flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )
                            )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: resolvedPagination.pageSize }).map((_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex}`}>
                    {columns.map((column, columnIndex) => (
                      <TableCell key={`${rowIndex}-${column.id ?? columnIndex}`}>
                        <Skeleton className='h-5 w-full max-w-[140px]' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <ErrorState
                      description={error}
                      onRetry={onRetry}
                      title='Unable to load table data'
                    />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        className={cn(
                          'px-3 py-3',
                          cell.column.columnDef.meta?.cellClassName
                        )}
                        key={cell.id}
                        style={{
                          ...getPinnedCellStyles(cell.column),
                          width: getDisplayWidth(cell.column.id, cell.column.getSize()),
                        }}
                      >
                        {(() => {
                          const renderedValue = flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )

                          if (React.isValidElement(renderedValue)) {
                            return renderedValue
                          }

                          if (
                            typeof renderedValue === 'string' ||
                            typeof renderedValue === 'number'
                          ) {
                            return (
                              <DataTableText
                                maxChars={
                                  cell.column.columnDef.meta?.maxChars ?? defaultCellMaxChars
                                }
                                tooltip={cell.column.columnDef.meta?.tooltip}
                                value={`${renderedValue}`}
                              />
                            )
                          }

                          return renderedValue
                        })()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className='p-6' colSpan={columns.length}>
                    {emptyState ?? (
                      <div className='text-center text-sm text-muted-foreground'>
                        No results.
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={table} variant={toolbarVariant} />
      </div>
    </div>
  )
}
