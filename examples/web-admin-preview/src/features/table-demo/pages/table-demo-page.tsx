import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/admin/data-table/data-table'
import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header'
import { PageHeader } from '@/components/admin/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type RecordRow = {
  id: string
  name: string
  department: string
  completed: number
  pending: number
  total: number
  status: '正常' | '待处理'
}

// Deterministic local data keeps pagination, sorting and scroll checks reproducible.
const records: RecordRow[] = Array.from({ length: 10000 }, (_, index) => {
  const completed = (index * 17) % 300
  const pending = (index * 7) % 20
  return {
    id: `REC-${String(index + 1).padStart(5, '0')}`,
    name: `示例记录 ${String(index + 1).padStart(5, '0')}`,
    department: ['运营一组', '运营二组', '客户服务', '财务支持'][index % 4],
    completed,
    pending,
    total: completed + pending,
    status: pending > 10 ? '待处理' : '正常',
  }
})
const columns: ColumnDef<RecordRow>[] = [
  { accessorKey: 'id', header: '编号', size: 140, meta: { pin: 'left' } },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='名称' />
    ),
    size: 240,
  },
  { accessorKey: 'department', header: '所属团队', size: 160 },
  {
    id: 'work',
    header: '处理情况',
    meta: {
      expandableGroup: { keepVisibleLeafIds: ['total'] },
      headerClassName: 'text-center',
    },
    columns: [
      {
        accessorKey: 'total',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='总计' />
        ),
        size: 120,
      },
      { accessorKey: 'completed', header: '已完成', size: 120 },
      { accessorKey: 'pending', header: '待处理', size: 120 },
    ],
  },
  {
    accessorKey: 'status',
    header: '状态',
    size: 120,
    meta: { pin: 'right' },
    cell: ({ row }) => (
      <Badge variant={row.original.status === '正常' ? 'secondary' : 'outline'}>
        {row.original.status}
      </Badge>
    ),
  },
]

export function TableDemoPage() {
  const [virtual, setVirtual] = React.useState(true)
  return (
    <div className='flex min-w-0 flex-col gap-4'>
      <PageHeader
        title='大数据表格'
        description='10,000 条本地示例记录，支持搜索、排序、固定列和折叠分组。'
        actions={
          <div aria-label='表格显示方式' className='flex gap-2' role='group'>
            <Button
              aria-pressed={virtual}
              onClick={() => setVirtual(true)}
              variant={virtual ? 'default' : 'outline'}
            >
              滚动浏览
            </Button>
            <Button
              aria-pressed={!virtual}
              onClick={() => setVirtual(false)}
              variant={!virtual ? 'default' : 'outline'}
            >
              分页浏览
            </Button>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={records}
        enablePagination={!virtual}
        getRowId={(row) => row.id}
        key={virtual ? 'virtual' : 'paged'}
        pageSizeOptions={[10, 25, 50, 100]}
        searchColumn='name'
        searchPlaceholder='搜索记录名称…'
        toolbarVariant='workspace'
        virtualHeight={480}
        virtualizeRows={virtual}
      />
    </div>
  )
}
