import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Download } from 'lucide-react'

import { DataTable } from '@/components/admin/data-table/data-table'
import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header'
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

type AuditLogRow = {
  action: string
  actor: string
  level: '重要' | '常规' | '注意'
  source: string
  target: string
  time: string
}

const auditLogs: AuditLogRow[] = [
  {
    action: '更新了用户角色权限',
    actor: '张晨',
    level: '重要',
    source: '系统管理',
    target: '用户管理 / 王敏',
    time: '2026-03-26 15:20',
  },
  {
    action: '执行定时报表导出',
    actor: '系统任务',
    level: '常规',
    source: '数据报表',
    target: '周报任务 / 北区一部',
    time: '2026-03-26 14:55',
  },
  {
    action: '导出了审计记录',
    actor: '李冉',
    level: '注意',
    source: '审计日志',
    target: '敏感操作记录 / 三月汇总',
    time: '2026-03-26 14:12',
  },
  {
    action: '调整了登录安全策略',
    actor: '何嘉',
    level: '重要',
    source: '系统设置',
    target: '登录保护 / MFA 阈值',
    time: '2026-03-26 13:48',
  },
  {
    action: '停用了异常账号',
    actor: '安全机器人',
    level: '注意',
    source: '风控中心',
    target: '用户管理 / test-demo@wps.cn',
    time: '2026-03-26 13:05',
  },
]

const levelVariantMap: Record<
  AuditLogRow['level'],
  'destructive' | 'outline' | 'secondary'
> = {
  重要: 'destructive',
  常规: 'secondary',
  注意: 'outline',
}

const auditLogColumns: ColumnDef<AuditLogRow>[] = [
  {
    accessorKey: 'time',
    header: ({ column }) => <DataTableColumnHeader column={column} title='时间' />,
    meta: {
      pin: 'left',
      tooltip: true,
    },
  },
  {
    accessorKey: 'actor',
    header: ({ column }) => <DataTableColumnHeader column={column} title='执行人' />,
    meta: {
      maxChars: 12,
      tooltip: true,
    },
  },
  {
    accessorKey: 'action',
    header: ({ column }) => <DataTableColumnHeader column={column} title='操作内容' />,
    meta: {
      maxChars: 20,
      tooltip: true,
    },
  },
  {
    accessorKey: 'target',
    header: ({ column }) => <DataTableColumnHeader column={column} title='影响对象' />,
    meta: {
      maxChars: 24,
      tooltip: true,
    },
  },
  {
    accessorKey: 'source',
    header: ({ column }) => <DataTableColumnHeader column={column} title='来源模块' />,
    meta: {
      maxChars: 12,
      tooltip: true,
    },
  },
  {
    accessorKey: 'level',
    header: ({ column }) => <DataTableColumnHeader column={column} title='级别' />,
    meta: {
      pin: 'right',
    },
    cell: ({ row }) => <Badge variant={levelVariantMap[row.original.level]}>{row.original.level}</Badge>,
  },
]

export function AuditLogsPage() {
  const [levelFilter, setLevelFilter] = React.useState<'all' | AuditLogRow['level']>('all')

  const filteredLogs = React.useMemo(
    () =>
      levelFilter === 'all'
        ? auditLogs
        : auditLogs.filter((item) => item.level === levelFilter),
    [levelFilter]
  )

  return (
    <div className='flex min-h-[calc(100svh-11.5rem)] flex-col gap-4'>
      <section className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
            审计日志
          </h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            审计页在工作区模式下直接围绕检索、筛选和列表本体组织，不再用大卡片包裹表格。
          </p>
        </div>
        <Button className='rounded-xl px-4' variant='ghost'>
          <Download className='size-4' />
          导出日志
        </Button>
      </section>

      <DataTable
        columns={auditLogColumns}
        data={filteredLogs}
        defaultCellMaxChars={18}
        fillHeight
        renderToolbar={() => (
          <FilterBar variant='workspace'>
            <Select
              onValueChange={(value) =>
                setLevelFilter(value as 'all' | AuditLogRow['level'])
              }
              value={levelFilter}
            >
              <SelectTrigger
                className='h-10 w-[160px] rounded-2xl border border-border/70 bg-background px-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] focus-visible:ring-0'
                size='sm'
              >
                <SelectValue placeholder='风险级别' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部级别</SelectItem>
                <SelectItem value='重要'>重要</SelectItem>
                <SelectItem value='注意'>注意</SelectItem>
                <SelectItem value='常规'>常规</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        )}
        searchColumn='actor'
        searchPlaceholder='搜索执行人...'
        toolbarVariant='workspace'
      />
    </div>
  )
}
