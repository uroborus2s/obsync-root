import * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { DataTable } from '@/components/admin/data-table/data-table'
import { PageHeader } from '@/components/admin/layout/page-header'
import { CreateButton } from '@/components/admin/actions/create-button'
import { ConfirmDialog } from '@/components/admin/feedback/confirm-dialog'
import { ErrorState } from '@/components/admin/feedback/empty-state'
import { getErrorMessage } from '@/lib/api/api-error'
import { create{{pascalName}}Columns } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-columns'
import { {{pascalName}}DetailSheet } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-detail-sheet'
import { {{pascalName}}FilterBar } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-filter-bar'
import { {{pascalName}}FormDialog } from '@/features/{{pluralKebabName}}/components/{{pluralKebabName}}-form-dialog'
import { use{{pascalName}}List, use{{pascalName}}Detail, use{{pascalName}}Mutations } from '@/features/{{pluralKebabName}}/hooks/use-{{pluralKebabName}}'
import type { {{pascalName}}Status } from '@/features/{{pluralKebabName}}/data/mock-{{pluralKebabName}}'
import type { {{pascalName}}FormValues } from '@/features/{{pluralKebabName}}/lib/schema'
import type { {{pascalName}}Search } from '@/features/{{pluralKebabName}}/lib/search'

const route = getRouteApi('/_authenticated/{{pluralKebabName}}')
export function {{pascalName}}Page() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const list = use{{pascalName}}List(search)
  const mutations = use{{pascalName}}Mutations()
  const [detailId, setDetailId] = React.useState<string>()
  const [form, setForm] = React.useState<{ id?: string } | null>(null)
  const detail = use{{pascalName}}Detail(form?.id ?? detailId)
  const [confirmation, setConfirmation] = React.useState<{ ids: string[]; status: {{pascalName}}Status } | null>(null)
  const patchSearch = React.useCallback((patch: Partial<{{pascalName}}Search>) => {
    void navigate({ replace: true, search: (previous) => ({ ...previous, ...patch }) })
  }, [navigate])
  const pagination = { pageIndex: search.page - 1, pageSize: search.pageSize }
  const sorting = [{ id: search.sort, desc: search.order === 'desc' }]
  const onPaginationChange: OnChangeFn<PaginationState> = (update) => {
    const next = typeof update === 'function' ? update(pagination) : update
    patchSearch({ page: next.pageSize !== search.pageSize ? 1 : next.pageIndex + 1, pageSize: next.pageSize })
  }
  const onSortingChange: OnChangeFn<SortingState> = (update) => {
    const next = (typeof update === 'function' ? update(sorting) : update)[0]
    patchSearch({ page: 1, sort: (next?.id as {{pascalName}}Search['sort']) ?? 'name', order: next?.desc ? 'desc' : 'asc' })
  }
  // Mutations/filters may remove the last page. Canonicalize the URL only after fresh data arrives.
  React.useEffect(() => {
    if (!list.data || list.isFetching) return
    const lastPage = Math.max(1, Math.ceil(list.data.total / search.pageSize))
    if (search.page > lastPage) patchSearch({ page: lastPage })
  }, [list.data, list.isFetching, search.page, search.pageSize, patchSearch])
  const columns = React.useMemo(() => create{{pascalName}}Columns({
    onEdit: (id) => { setDetailId(undefined); setForm({ id }) },
    onOpenDetail: (id) => setDetailId(id),
  }), [])
  const submit = async (values: {{pascalName}}FormValues) => {
    if (form?.id) await mutations.update.mutateAsync({ id: form.id, values })
    else await mutations.create.mutateAsync(values)
    setForm(null)
  }
  return (
    <div className='flex min-h-[calc(100svh-11.5rem)] flex-col gap-4'>
      <PageHeader title='{{pascalName}} 管理' description='管理记录、筛选数据和批量更新状态。'
        actions={<CreateButton onClick={() => setForm({})}>新建{{pascalName}}</CreateButton>} />
      <DataTable columns={columns} data={list.data?.items ?? []} getRowId={(row) => row.id}
        rowCount={list.data?.total ?? 0} pagination={pagination} onPaginationChange={onPaginationChange}
        pageSizeOptions={[10, 20, 50, 100]} sorting={sorting} onSortingChange={onSortingChange}
        searchColumn='name' searchValue={search.query} searchPlaceholder='搜索名称'
        onSearchValueChange={(query) => patchSearch({ query, page: 1 })}
        isLoading={list.isPending} error={list.error ? getErrorMessage(list.error) : null}
        onRetry={() => void list.refetch()} fillHeight toolbarVariant='workspace'
        renderToolbar={(table) => {
          const ids = table.getFilteredSelectedRowModel().rows.map((row) => row.original.id)
          return <{{pascalName}}FilterBar status={search.status} selectedCount={ids.length}
            onStatusChange={(status) => patchSearch({ status, page: 1 })}
            onActivateSelected={() => setConfirmation({ ids, status: 'Active' })}
            onArchiveSelected={() => setConfirmation({ ids, status: 'Archived' })} />
        }} />
      {form && (!form.id || detail.data?.id === form.id) ?
        <{{pascalName}}FormDialog open mode={form.id ? 'edit' : 'create'} initialRecord={form.id ? detail.data : undefined}
          onOpenChange={(open) => { if (!open) setForm(null) }} onSubmit={submit}
          submitting={mutations.create.isPending || mutations.update.isPending} /> : null}
      {(form?.id || detailId) && detail.isPending ? <p role='status'>正在加载记录…</p> : null}
      {(form?.id || detailId) && detail.error ? <ErrorState description={getErrorMessage(detail.error)} onRetry={() => void detail.refetch()} /> : null}
      <{{pascalName}}DetailSheet open={Boolean(detailId && detail.data && !detail.isError)} record={detail.data ?? null}
        onOpenChange={(open) => { if (!open) setDetailId(undefined) }}
        onEdit={() => { setForm({ id: detailId }); setDetailId(undefined) }} />
      <ConfirmDialog open={Boolean(confirmation)} title='批量更新状态' description='此操作会更新当前选中的记录。'
        tone={confirmation?.status === 'Archived' ? 'destructive' : 'default'}
        onOpenChange={(open) => { if (!open) setConfirmation(null) }}
        onConfirm={() => {
          if (confirmation && !mutations.changeStatus.isPending) mutations.changeStatus.mutate(confirmation, {
            onSuccess: () => setConfirmation(null),
          })
        }} />
      {mutations.changeStatus.error ? <p role='alert' className='text-destructive'>{getErrorMessage(mutations.changeStatus.error)}</p> : null}
    </div>
  )
}
