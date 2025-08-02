import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { AttendanceApiService } from '@/lib/attendance-api';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, FileSpreadsheet, RotateCcw, Save, Search, } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
export const Route = createFileRoute('/_authenticated/data-query')({
    component: DataQuery,
});
const attendanceApiService = new AttendanceApiService();
function DataQuery() {
    const [filters, setFilters] = useState({
        studentId: '',
        teacherName: '',
        week: undefined,
        startTime: undefined,
        endTime: undefined,
        page: 1,
        pageSize: 10,
    });
    // Format dates before passing to the API
    const queryFilters = {
        ...filters,
        startTime: filters.startTime
            ? format(filters.startTime, 'yyyy-MM-dd HH:mm:ss')
            : undefined,
        endTime: filters.endTime
            ? format(filters.endTime, 'yyyy-MM-dd HH:mm:ss')
            : undefined,
    };
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['data-query', queryFilters],
        queryFn: () => attendanceApiService.queryData(queryFilters),
        placeholderData: (previousData) => previousData,
        retry: false,
    });
    const results = data?.records ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / filters.pageSize);
    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };
    const handleDateChange = (key, date) => {
        setFilters((prev) => ({ ...prev, [key]: date, page: 1 }));
    };
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setFilters((prev) => ({ ...prev, page: newPage }));
        }
    };
    const handleReset = () => {
        setFilters({
            studentId: '',
            teacherName: '',
            week: undefined,
            startTime: undefined,
            endTime: undefined,
            page: 1,
            pageSize: 10,
        });
    };
    const handleExport = () => {
        toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
            loading: '正在导出数据...',
            success: '数据导出成功！',
            error: '导出失败，请重试。',
        });
    };
    const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
        const hour = Math.floor(i / 2)
            .toString()
            .padStart(2, '0');
        const minute = i % 2 === 0 ? '00' : '30';
        return `${hour}:${minute}`;
    });
    return (<div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>数据查询</h2>
          <p className='text-muted-foreground'>多维度查询学生出勤数据</p>
        </div>
      </div>

      {/* 查询条件 */}
      <Card>
        <CardHeader>
          <CardTitle>查询条件</CardTitle>
          <CardDescription>选择查询维度和筛选条件</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label htmlFor='studentId'>学号</Label>
              <Input id='studentId' placeholder='输入学号' value={filters.studentId} onChange={(e) => handleFilterChange('studentId', e.target.value)}/>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='teacherName'>教师</Label>
              <Input id='teacherName' placeholder='输入教师姓名' value={filters.teacherName} onChange={(e) => handleFilterChange('teacherName', e.target.value)}/>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='week'>周次</Label>
              <Select onValueChange={(value) => handleFilterChange('week', value === 'all' ? undefined : Number(value))} value={filters.week ? String(filters.week) : 'all'}>
                <SelectTrigger id='week'>
                  <SelectValue placeholder='选择周次'/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>所有周次</SelectItem>
                  {Array.from({ length: 20 }, (_, i) => (<SelectItem key={i + 1} value={String(i + 1)}>
                      第 {i + 1} 周
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 时间范围 */}
          <div className='space-y-2'>
            <Label>上课时间范围</Label>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='flex items-center gap-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='outline' className={cn('w-full justify-start text-left font-normal', !filters.startTime && 'text-muted-foreground')}>
                      <CalendarIcon className='mr-2 h-4 w-4'/>
                      {filters.startTime ? (format(filters.startTime, 'PPP', { locale: zhCN })) : (<span>开始日期</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <Calendar mode='single' selected={filters.startTime} onSelect={(date) => handleDateChange('startTime', date)} initialFocus/>
                  </PopoverContent>
                </Popover>
                <Select value={filters.startTime ? format(filters.startTime, 'HH:mm') : ''} onValueChange={(value) => {
            if (!value) {
                handleDateChange('startTime', undefined);
            }
            else {
                const newDate = new Date(filters.startTime || Date.now());
                const [hours, minutes] = value.split(':').map(Number);
                newDate.setHours(hours, minutes);
                handleDateChange('startTime', newDate);
            }
        }}>
                  <SelectTrigger className='w-[120px]'>
                    <SelectValue placeholder='时间'/>
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (<SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className='flex items-center gap-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='outline' className={cn('w-full justify-start text-left font-normal', !filters.endTime && 'text-muted-foreground')}>
                      <CalendarIcon className='mr-2 h-4 w-4'/>
                      {filters.endTime ? (format(filters.endTime, 'PPP', { locale: zhCN })) : (<span>结束日期</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <Calendar mode='single' selected={filters.endTime} onSelect={(date) => handleDateChange('endTime', date)} initialFocus/>
                  </PopoverContent>
                </Popover>
                <Select value={filters.endTime ? format(filters.endTime, 'HH:mm') : ''} onValueChange={(value) => {
            if (!value) {
                handleDateChange('endTime', undefined);
            }
            else {
                const newDate = new Date(filters.endTime || Date.now());
                const [hours, minutes] = value.split(':').map(Number);
                newDate.setHours(hours, minutes);
                handleDateChange('endTime', newDate);
            }
        }}>
                  <SelectTrigger className='w-[120px]'>
                    <SelectValue placeholder='时间'/>
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (<SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className='flex gap-4'>
            <Button onClick={handleReset} disabled={isLoading}>
              {isLoading ? (<RotateCcw className='mr-2 h-4 w-4 animate-spin'/>) : (<Search className='mr-2 h-4 w-4'/>)}
              重置
            </Button>
            <Button variant='outline'>
              <Save className='mr-2 h-4 w-4'/>
              保存条件
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
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={handleExport}>
                <Download className='mr-2 h-4 w-4'/>
                导出Excel
              </Button>
              <Button variant='outline' size='sm'>
                <FileSpreadsheet className='mr-2 h-4 w-4'/>
                导出PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12'>
                  <Checkbox />
                </TableHead>
                <TableHead>学号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>课程名称</TableHead>
                <TableHead>上课时间</TableHead>
                <TableHead>出勤状态</TableHead>
                <TableHead>学院</TableHead>
                <TableHead>班级</TableHead>
                <TableHead>专业</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (<TableRow>
                  <TableCell colSpan={10} className='h-24 text-center'>
                    正在加载...
                  </TableCell>
                </TableRow>) : isError ? (<TableRow>
                  <TableCell colSpan={10} className='h-24 text-center text-red-500'>
                    加载数据失败: {error.message}
                  </TableCell>
                </TableRow>) : results.length === 0 ? (<TableRow>
                  <TableCell colSpan={10} className='h-24 text-center'>
                    无结果。
                  </TableCell>
                </TableRow>) : (results.map((record) => (<TableRow key={record.id}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell className='font-medium'>
                      {record.student.xh}
                    </TableCell>
                    <TableCell>{record.student.xm}</TableCell>
                    <TableCell>{record.course.kcmc}</TableCell>
                    <TableCell>{record.course.start_time}</TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'present'
                ? 'default'
                : record.status === 'leave'
                    ? 'secondary'
                    : 'destructive'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.student.college_name}</TableCell>
                    <TableCell>{record.student.bjmc}</TableCell>
                    <TableCell>{record.student.major_name}</TableCell>
                  </TableRow>)))}
            </TableBody>
          </Table>
          <div className='flex items-center justify-between px-2'>
            <div className='text-muted-foreground text-sm'>
              已选择 {0} 项，共 {total} 项
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href='#' onClick={(e) => {
            e.preventDefault();
            handlePageChange(filters.page - 1);
        }} className={filters.page <= 1 ? 'pointer-events-none opacity-50' : ''}/>
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (<PaginationItem key={i}>
                    <PaginationLink href='#' isActive={filters.page === i + 1} onClick={(e) => {
                e.preventDefault();
                handlePageChange(i + 1);
            }}>
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>))}
                <PaginationItem>
                  <PaginationNext href='#' onClick={(e) => {
            e.preventDefault();
            handlePageChange(filters.page + 1);
        }} className={filters.page >= totalPages
            ? 'pointer-events-none opacity-50'
            : ''}/>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>);
}
// --- Pagination Components ---
// Copied directly here to resolve import issues.
const Pagination = ({ className, ...props }) => (<nav role='navigation' aria-label='pagination' className={cn('mx-auto flex w-full justify-center', className)} {...props}/>);
Pagination.displayName = 'Pagination';
const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (<ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props}/>));
PaginationContent.displayName = 'PaginationContent';
const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (<li ref={ref} className={cn('', className)} {...props}/>));
PaginationItem.displayName = 'PaginationItem';
const PaginationLink = ({ className, isActive, size = 'icon', ...props }) => (<a aria-current={isActive ? 'page' : undefined} className={cn(buttonVariants({
        variant: isActive ? 'outline' : 'ghost',
        size,
    }), className)} {...props}/>);
PaginationLink.displayName = 'PaginationLink';
const PaginationPrevious = ({ className, ...props }) => (<PaginationLink aria-label='Go to previous page' size='default' className={cn('gap-1 pl-2.5', className)} {...props}>
    <ChevronLeft className='h-4 w-4'/>
    <span>Previous</span>
  </PaginationLink>);
PaginationPrevious.displayName = 'PaginationPrevious';
const PaginationNext = ({ className, ...props }) => (<PaginationLink aria-label='Go to next page' size='default' className={cn('gap-1 pr-2.5', className)} {...props}>
    <span>Next</span>
    <ChevronRight className='h-4 w-4'/>
  </PaginationLink>);
PaginationNext.displayName = 'PaginationNext';
//# sourceMappingURL=data-query.js.map