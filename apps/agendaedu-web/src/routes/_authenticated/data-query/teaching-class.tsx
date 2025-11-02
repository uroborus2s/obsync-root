import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search as SearchIcon,
} from 'lucide-react'
import {
  TeachingClass,
  TeachingClassQueryParams,
  statsApiService,
} from '@/lib/stats-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute(
  '/_authenticated/data-query/teaching-class'
)({
  component: TeachingClassPage,
})

function TeachingClassPage() {
  const [filters, setFilters] = useState<TeachingClassQueryParams>({
    page: 1,
    pageSize: 20,
    searchKeyword: '',
    sortField: undefined,
    sortOrder: undefined,
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['teaching-class', filters],
    queryFn: () => statsApiService.getTeachingClass(filters),
    placeholderData: (previousData) => previousData,
  })

  const records = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = data?.data?.totalPages ?? 0

  const handleFilterChange = (
    key: keyof TeachingClassQueryParams,
    value: any
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }))
    }
  }

  const handleReset = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      searchKeyword: '',
      sortField: undefined,
      sortOrder: undefined,
    })
  }

  return (
    <div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>教学班</h2>
          <p className='text-muted-foreground'>查询教学班学生名单</p>
        </div>
      </div>

      {/* 查询条件 */}
      <Card>
        <CardHeader>
          <CardTitle>查询条件</CardTitle>
          <CardDescription>
            输入关键字搜索（支持学号、姓名、学院、专业、班级、年级、课程编码、课程名称、开课单位）
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='searchKeyword'>搜索关键字</Label>
            <div className='flex gap-2'>
              <Input
                id='searchKeyword'
                placeholder='输入学号、姓名、学院、专业、班级、年级、课程编码、课程名称或开课单位'
                value={filters.searchKeyword}
                onChange={(e) =>
                  handleFilterChange('searchKeyword', e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFilters((prev) => ({ ...prev, page: 1 }))
                  }
                }}
              />
              <Button
                variant='outline'
                size='icon'
                onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
              >
                <SearchIcon className='h-4 w-4' />
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='pageSize'>每页显示</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange('pageSize', Number(value))
                }
                value={String(filters.pageSize)}
              >
                <SelectTrigger id='pageSize'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='10'>10 条</SelectItem>
                  <SelectItem value='20'>20 条</SelectItem>
                  <SelectItem value='50'>50 条</SelectItem>
                  <SelectItem value='100'>100 条</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex gap-4'>
            <Button onClick={handleReset} variant='outline'>
              <RotateCcw className='mr-2 h-4 w-4' />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 查询结果 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>查询结果</CardTitle>
              <CardDescription>找到 {total} 条记录</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>学院</TableHead>
                  <TableHead>专业</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>年级</TableHead>
                  <TableHead>课程编号</TableHead>
                  <TableHead>教学班代码</TableHead>
                  <TableHead>课程名称</TableHead>
                  <TableHead>开课单位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className='h-24 text-center'>
                      <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                      <p className='mt-2'>正在加载...</p>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className='h-24 text-center text-red-500'
                    >
                      加载数据失败: {error?.message || '未知错误'}
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='h-24 text-center'>
                      无结果
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record: TeachingClass, index: number) => (
                    <TableRow
                      key={`${record.student_id}-${record.course_code}-${index}`}
                    >
                      <TableCell className='font-medium'>
                        {record.student_id || '-'}
                      </TableCell>
                      <TableCell>{record.student_name || '-'}</TableCell>
                      <TableCell>{record.school_name || '-'}</TableCell>
                      <TableCell>{record.major_name || '-'}</TableCell>
                      <TableCell>{record.class_name || '-'}</TableCell>
                      <TableCell>{record.grade || '-'}</TableCell>
                      <TableCell>{record.course_code}</TableCell>
                      <TableCell>{record.teaching_class_code}</TableCell>
                      <TableCell>{record.course_name}</TableCell>
                      <TableCell>{record.course_unit || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-muted-foreground text-sm'>
              第 {filters.page} 页，共 {totalPages} 页 | 总计 {total} 条记录
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(filters.page! - 1)}
                disabled={filters.page === 1 || isLoading}
              >
                <ChevronLeft className='h-4 w-4' />
                上一页
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(filters.page! + 1)}
                disabled={filters.page === totalPages || isLoading}
              >
                下一页
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
