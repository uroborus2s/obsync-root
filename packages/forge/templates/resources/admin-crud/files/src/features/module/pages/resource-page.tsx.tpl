import * as React from 'react'
import { FolderPlus, Layers3 } from 'lucide-react'

import { DataTable } from '@/components/admin/data-table/data-table'
import { ConfirmDialog } from '@/components/admin/feedback/confirm-dialog'
import { EmptyState } from '@/components/admin/feedback/empty-state'
import { Button } from '@/components/ui/button'
import { create{{pascalName}}Columns } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-columns'
import { {{pascalName}}DetailSheet } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-detail-sheet'
import { {{pascalName}}FilterBar } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-filter-bar'
import { {{pascalName}}FormSheet } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-form-sheet'
import { use{{pascalName}}Crud } from '@/features/{{pluralKebabName}}/hooks/use-{{pluralKebabName}}'
import type { {{pascalName}}Status } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'
import type { {{pascalName}}FormValues } from '@/features/{{pluralKebabName}}/lib/schema'

export function {{pascalName}}Page() {
  const { changeItemsStatus, createItem, getById, items, updateItem } =
    use{{pascalName}}Crud()
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState<'all' | {{pascalName}}Status>('all')
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [formState, setFormState] = React.useState<{
    mode: 'create' | 'edit'
    recordId?: string
  } | null>(null)
  const [statusConfirm, setStatusConfirm] = React.useState<{
    recordIds: string[]
    status: {{pascalName}}Status
  } | null>(null)

  const filteredItems = React.useMemo(
    () =>
      items.filter((item) => (status === 'all' ? true : item.status === status)),
    [items, status]
  )

  const detailRecord = detailId ? getById(detailId) : null
  const editingRecord = formState?.recordId ? getById(formState.recordId) : null

  const columns = React.useMemo(
    () =>
      create{{pascalName}}Columns({
        onEdit: (recordId) => {
          setDetailId(null)
          setFormState({
            mode: 'edit',
            recordId,
          })
        },
        onOpenDetail: (recordId) => {
          setFormState(null)
          setDetailId(recordId)
        },
      }),
    []
  )

  const handleSubmit = React.useCallback(
    (values: {{pascalName}}FormValues) => {
      if (formState?.mode === 'edit' && formState.recordId) {
        updateItem(formState.recordId, values)
      } else {
        createItem(values)
      }

      setFormState(null)
    },
    [createItem, formState, updateItem]
  )

  return (
    <>
      <div className='flex min-h-[calc(100svh-11.5rem)] flex-col gap-4'>
        <section className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
              {{pascalName}} 管理
            </h2>
            <p className='text-muted-foreground mt-2 text-sm leading-6'>
              这是通过 <code>stratix generate admin-crud {{kebabName}}</code>{' '}
              生成的标准 CRUD 工作区模块。
            </p>
          </div>
          <Button
            className='rounded-xl px-4'
            onClick={() =>
              setFormState({
                mode: 'create',
              })
            }
          >
            <FolderPlus className='size-4' />
            新建{{pascalName}}
          </Button>
        </section>

        <DataTable
          columns={columns}
          data={filteredItems}
          defaultCellMaxChars={18}
          emptyState={
            <EmptyState
              action={
                <Button
                  onClick={() =>
                    setFormState({
                      mode: 'create',
                    })
                  }
                >
                  <FolderPlus className='size-4' />
                  新建第一条记录
                </Button>
              }
              description='当前筛选条件下没有匹配记录，可以调整条件或创建一条新数据。'
              icon={<Layers3 className='size-5 text-muted-foreground' />}
              title='暂无记录'
            />
          }
          fillHeight
          renderToolbar={(table) => {
            const selectedIds = table
              .getFilteredSelectedRowModel()
              .rows.map((row) => row.original.id)

            return (
              <{{pascalName}}FilterBar
                onActivateSelected={() =>
                  setStatusConfirm({
                    recordIds: selectedIds,
                    status: 'Active',
                  })
                }
                onArchiveSelected={() =>
                  setStatusConfirm({
                    recordIds: selectedIds,
                    status: 'Archived',
                  })
                }
                onStatusChange={setStatus}
                selectedCount={selectedIds.length}
                status={status}
              />
            )
          }}
          searchColumn='name'
          searchPlaceholder='搜索名称'
          searchValue={query}
          toolbarVariant='workspace'
          onSearchValueChange={setQuery}
        />
      </div>

      <{{pascalName}}FormSheet
        initialRecord={editingRecord}
        mode={formState?.mode ?? 'create'}
        onOpenChange={(open) => {
          if (!open) {
            setFormState(null)
          }
        }}
        onSubmit={handleSubmit}
        open={Boolean(formState)}
      />

      <{{pascalName}}DetailSheet
        onEdit={() => {
          if (!detailId) {
            return
          }

          setFormState({
            mode: 'edit',
            recordId: detailId,
          })
          setDetailId(null)
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null)
          }
        }}
        open={Boolean(detailId)}
        record={detailRecord}
      />

      <ConfirmDialog
        confirmLabel={statusConfirm?.status === 'Archived' ? '确认归档' : '确认启用'}
        description='批量操作会同时更新当前选中的记录状态，请确认后继续。'
        onConfirm={() => {
          if (!statusConfirm) {
            return
          }

          changeItemsStatus(statusConfirm.recordIds, statusConfirm.status)
          setStatusConfirm(null)
        }}
        onOpenChange={(open) => {
          if (!open) {
            setStatusConfirm(null)
          }
        }}
        open={Boolean(statusConfirm)}
        title={statusConfirm?.status === 'Archived' ? '批量归档记录' : '批量启用记录'}
        tone={statusConfirm?.status === 'Archived' ? 'destructive' : 'default'}
      />
    </>
  )
}
