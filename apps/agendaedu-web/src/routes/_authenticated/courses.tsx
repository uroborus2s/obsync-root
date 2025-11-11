import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BookOpen,
  Calendar,
  Clock,
  Edit,
  Plus,
  Search,
  Trash,
  Users,
} from 'lucide-react'
import { createTeacherRouteCheck } from '@/utils/route-permission'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/_authenticated/courses')({
  beforeLoad: createTeacherRouteCheck(),
  component: Courses,
})

function Courses() {
  // 分页状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 模拟课程数据（扩展为更多数据以演示分页）
  const allCourses = Array.from({ length: 156 }, (_, i) => ({
    id: `CS${String(i + 1).padStart(3, '0')}`,
    name: ['高等数学', '数据结构', '操作系统', '计算机网络', '数据库原理'][
      i % 5
    ],
    teacher: ['李教授', '王老师', '张老师', '刘老师', '陈老师'][i % 5],
    college: ['理学院', '计算机学院', '软件学院'][i % 3],
    credits: [3, 4, 2][i % 3],
    students: 80 + (i % 50),
    schedule: `周${['一', '二', '三', '四', '五'][i % 5]} ${(i % 4) + 1}-${(i % 4) + 2}节`,
    classroom: `${['A', 'B', 'C'][i % 3]}${String((i % 5) + 1).padStart(2, '0')}1`,
    status: i % 10 === 0 ? '已结束' : '进行中',
  }))

  // 计算分页数据
  const total = allCourses.length
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const courses = allCourses.slice(startIndex, endIndex)

  return (
    <div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>课程管理</h2>
          <p className='text-muted-foreground'>管理课程信息和课表安排</p>
        </div>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          添加课程
        </Button>
      </div>

      {/* 课程概览 */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>总课程数</CardTitle>
            <BookOpen className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>156</div>
            <p className='text-muted-foreground text-xs'>
              <span className='text-green-600'>↗ 本学期新增 12门</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>进行中课程</CardTitle>
            <Calendar className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>132</div>
            <p className='text-muted-foreground text-xs'>占总课程的84.6%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>授课教师</CardTitle>
            <Users className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>89</div>
            <p className='text-muted-foreground text-xs'>平均每人1.75门课程</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>总学时</CardTitle>
            <Clock className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>2,448</div>
            <p className='text-muted-foreground text-xs'>本学期总学时数</p>
          </CardContent>
        </Card>
      </div>

      {/* 课程列表 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>课程列表</CardTitle>
              <CardDescription>当前学期所有课程信息</CardDescription>
            </div>
            <div className='flex items-center space-x-2'>
              <div className='relative'>
                <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
                <Input placeholder='搜索课程...' className='w-[300px] pl-8' />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>课程编号</TableHead>
                  <TableHead>课程名称</TableHead>
                  <TableHead>授课教师</TableHead>
                  <TableHead>所属学院</TableHead>
                  <TableHead>学分</TableHead>
                  <TableHead>学生数</TableHead>
                  <TableHead>上课时间</TableHead>
                  <TableHead>教室</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className='font-medium'>{course.id}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.teacher}</TableCell>
                    <TableCell>{course.college}</TableCell>
                    <TableCell>{course.credits}</TableCell>
                    <TableCell>{course.students}</TableCell>
                    <TableCell>{course.schedule}</TableCell>
                    <TableCell>{course.classroom}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          course.status === '进行中' ? 'default' : 'secondary'
                        }
                      >
                        {course.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        <Button variant='ghost' size='sm'>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm'>
                          <Trash className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页控件 */}
          <EnhancedPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  )
}
