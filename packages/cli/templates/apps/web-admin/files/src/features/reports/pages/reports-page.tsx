import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, FileBarChart2 } from 'lucide-react'

import { DataTable } from '@/components/admin/data-table/data-table'
import { DataTableColumnHeader } from '@/components/admin/data-table/data-table-column-header'
import { FilterBar } from '@/components/admin/filters/filter-bar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ReportRow = {
  absenceTotal: number
  absenceWeek1: number
  absenceWeek2: number
  absenceWeek3: number
  attendanceTotal: number
  attendanceWeek1: number
  attendanceWeek2: number
  attendanceWeek3: number
  campus: string
}

const reportsData: ReportRow[] = [
  {
    absenceTotal: 18,
    absenceWeek1: 5,
    absenceWeek2: 4,
    absenceWeek3: 9,
    attendanceTotal: 450,
    attendanceWeek1: 150,
    attendanceWeek2: 150,
    attendanceWeek3: 150,
    campus: '北区一部',
  },
  {
    absenceTotal: 182,
    absenceWeek1: 60,
    absenceWeek2: 54,
    absenceWeek3: 68,
    attendanceTotal: 16058,
    attendanceWeek1: 4576,
    attendanceWeek2: 4566,
    attendanceWeek3: 4664,
    campus: '北区二部',
  },
  {
    absenceTotal: 624,
    absenceWeek1: 205,
    absenceWeek2: 194,
    absenceWeek3: 225,
    attendanceTotal: 57868,
    attendanceWeek1: 15726,
    attendanceWeek2: 15754,
    attendanceWeek3: 15706,
    campus: '南区中心校',
  },
  {
    absenceTotal: 591,
    absenceWeek1: 201,
    absenceWeek2: 187,
    absenceWeek3: 203,
    attendanceTotal: 48577,
    attendanceWeek1: 14046,
    attendanceWeek2: 13863,
    attendanceWeek3: 13942,
    campus: '西区实验校',
  },
  {
    absenceTotal: 716,
    absenceWeek1: 228,
    absenceWeek2: 241,
    absenceWeek3: 247,
    attendanceTotal: 64774,
    attendanceWeek1: 17990,
    attendanceWeek2: 18722,
    attendanceWeek3: 18972,
    campus: '东区示范校',
  },
]

const reportColumns: ColumnDef<ReportRow>[] = [
  {
    accessorKey: 'campus',
    header: ({ column }) => <DataTableColumnHeader column={column} title='校区 / 班级' />,
    meta: {
      maxChars: 18,
      pin: 'left',
      tooltip: true,
    },
  },
  {
    id: 'attendance',
    header: '应到人次',
    meta: {
      expandableGroup: {
        defaultExpanded: true,
        keepVisibleLeafIds: ['attendanceTotal'],
      },
      headerClassName: 'text-center',
    },
    columns: [
      {
        accessorKey: 'attendanceTotal',
        header: '总计',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
      {
        accessorKey: 'attendanceWeek1',
        header: '第1周',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
      {
        accessorKey: 'attendanceWeek2',
        header: '第2周',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
      {
        accessorKey: 'attendanceWeek3',
        header: '第3周',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
    ],
  },
  {
    id: 'absence',
    header: '缺勤人次',
    meta: {
      expandableGroup: {
        defaultExpanded: false,
        keepVisibleLeafIds: ['absenceTotal'],
      },
      headerClassName: 'text-center',
    },
    columns: [
      {
        accessorKey: 'absenceTotal',
        header: '总计',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
      {
        accessorKey: 'absenceWeek1',
        header: '第1周',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
      {
        accessorKey: 'absenceWeek2',
        header: '第2周',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
      {
        accessorKey: 'absenceWeek3',
        header: '第3周',
        meta: {
          cellClassName: 'text-center tabular-nums',
          headerClassName: 'text-center',
        },
      },
    ],
  },
]

export function ReportsPage() {
  const [period, setPeriod] = React.useState('month')

  return (
    <div className='flex min-h-[calc(100svh-11.5rem)] flex-col gap-4'>
      <section className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
            数据报表
          </h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            报表页也切到工作区模式，并直接演示“分组列展开 / 折叠”的列交互。
          </p>
        </div>
        <Button className='rounded-xl px-4' variant='ghost'>
          <Download className='size-4' />
          导出快照
        </Button>
      </section>

      <DataTable
        columns={reportColumns}
        data={reportsData}
        fillHeight
        renderToolbar={() => (
          <FilterBar
            actions={
              <Button size='sm' variant='ghost'>
                <FileBarChart2 className='size-4' />
                报表视图
              </Button>
            }
            variant='workspace'
          >
            <Select onValueChange={setPeriod} value={period}>
              <SelectTrigger
                className='h-10 w-[160px] rounded-2xl border border-border/70 bg-background px-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] focus-visible:ring-0'
                size='sm'
              >
                <SelectValue placeholder='统计周期' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='week'>本周</SelectItem>
                <SelectItem value='month'>本月</SelectItem>
                <SelectItem value='quarter'>本季度</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        )}
        searchColumn='campus'
        searchPlaceholder='搜索校区或班级...'
        toolbarVariant='workspace'
      />
    </div>
  )
}
