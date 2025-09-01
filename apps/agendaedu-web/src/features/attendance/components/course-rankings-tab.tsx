import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/attendance-api'
import { Trophy, Medal, Award, BookOpen, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface RankingItem {
  rank: number
  id: string
  name: string
  attendance_rate: number
  total_count: number
  extra_info?: string
}

interface RankingsResponse {
  data: RankingItem[]
  total: number
  page: number
  page_size: number
}

export function CourseRankingsTab() {
  const [filters, setFilters] = useState({
    semester: 'all',
    start_date: '',
    end_date: '',
    page: 1,
    page_size: 50
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-rankings', filters],
    queryFn: async (): Promise<RankingsResponse> => {
      const response = await attendanceApi.getCourseAttendanceRankings({
        semester: filters.semester === 'all' ? undefined : filters.semester,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        page: filters.page,
        page_size: filters.page_size
      })
      
      if (!response.success) {
        throw new Error(response.message || '获取课程排行榜数据失败')
      }
      
      return response.data
    },
    enabled: true
  })

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : Number(value)
    }))
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 95) return <Badge className="bg-green-100 text-green-800">{rate}%</Badge>
    if (rate >= 90) return <Badge className="bg-blue-100 text-blue-800">{rate}%</Badge>
    if (rate >= 85) return <Badge className="bg-yellow-100 text-yellow-800">{rate}%</Badge>
    if (rate >= 80) return <Badge className="bg-orange-100 text-orange-800">{rate}%</Badge>
    return <Badge className="bg-red-100 text-red-800">{rate}%</Badge>
  }

  const getRowClassName = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200"
    if (rank === 2) return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
    if (rank === 3) return "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200"
    return ""
  }

  return (
    <div className="space-y-6">
      {/* 筛选条件 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="semester">学期</Label>
          <Select value={filters.semester} onValueChange={(value) => handleFilterChange('semester', value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择学期" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部学期</SelectItem>
              <SelectItem value="2024-2025-1">2024-2025-1</SelectItem>
              <SelectItem value="2024-2025-2">2024-2025-2</SelectItem>
              <SelectItem value="2023-2024-1">2023-2024-1</SelectItem>
              <SelectItem value="2023-2024-2">2023-2024-2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">开始日期</Label>
          <Input
            id="start_date"
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">结束日期</Label>
          <Input
            id="end_date"
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page_size">显示数量</Label>
          <Select value={filters.page_size.toString()} onValueChange={(value) => handleFilterChange('page_size', parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">前20名</SelectItem>
              <SelectItem value="50">前50名</SelectItem>
              <SelectItem value="100">前100名</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 统计概览卡片 */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">参与排名课程</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最高出勤率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.data.length > 0 ? `${Math.max(...data.data.map(item => item.attendance_rate))}%` : '0%'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均出勤率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.data.length > 0 
                  ? `${Math.round(data.data.reduce((sum, item) => sum + item.attendance_rate, 0) / data.data.length)}%`
                  : '0%'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">优秀课程</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.data.filter(item => item.attendance_rate >= 90).length}
              </div>
              <p className="text-xs text-muted-foreground">出勤率≥90%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 排行榜表格 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">排名</TableHead>
              <TableHead>课程信息</TableHead>
              <TableHead>教师学期</TableHead>
              <TableHead className="text-center">课次数</TableHead>
              <TableHead className="text-center">出勤率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 5 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-red-500">
                  加载失败：{error.message}
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((course) => (
                <TableRow key={course.id} className={getRowClassName(course.rank)}>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      {getRankIcon(course.rank)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{course.name}</div>
                      <div className="text-sm text-muted-foreground">{course.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{course.extra_info || '-'}</div>
                  </TableCell>
                  <TableCell className="text-center">{course.total_count}</TableCell>
                  <TableCell className="text-center">
                    {getAttendanceRateBadge(course.attendance_rate)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {data && data.total > filters.page_size && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            显示前 {Math.min(filters.page_size, data.total)} 名，共 {data.total} 门课程
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', filters.page - 1)}
              disabled={filters.page <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', filters.page + 1)}
              disabled={filters.page >= Math.ceil(data.total / filters.page_size)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
