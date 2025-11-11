import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Search as SearchIcon,
  Users,
} from 'lucide-react'
import {
  CourseCheckinStatsClass,
  CourseCheckinStatsSummary,
  CourseCheckinStatsUnit,
  StatsQueryParams,
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
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'

export const Route = createFileRoute(
  '/_authenticated/data-query/course-stats-tree'
)({
  component: CourseStatsTreePage,
})

// 树节点类型
type TreeNodeType = 'root' | 'unit' | 'class'

interface TreeNode {
  id: string
  label: string
  type: TreeNodeType
  isExpanded: boolean
  unitId?: string
  classCode?: string
  children?: TreeNode[]
}

// 视图类型
type ViewType = 'main' | 'weekly'

// 周详情视图类型
type WeeklyViewType = 'college' | 'class' | 'course' | null

// 学院周度签到统计数据
interface CollegeWeeklyAttendanceStats {
  teaching_week: number
  expected_attendance: number
  absent_count: number
  truant_count: number
  leave_count: number
  present_count: number
  absence_rate: number
  truant_rate: number
}

// 教学班周度签到统计数据
interface ClassWeeklyAttendanceStats {
  teaching_week: number
  expected_attendance: number
  absent_count: number
  truant_count: number
  leave_count: number
  present_count: number
  absence_rate: number
  truant_rate: number
}

// 课程周度签到统计数据
interface CourseWeeklyAttendanceStats {
  teaching_week: number
  expected_attendance: number
  absent_count: number
  truant_count: number
  leave_count: number
  present_count: number
  absence_rate: number
  truant_rate: number
}

// 文本截断工具函数
const truncateText = (text: string, maxLength: number = 20) => {
  if (text.length <= maxLength) return text
  return text.substring(0, 17) + '...'
}

function CourseStatsTreePage() {
  // 视图切换状态
  const [currentView, setCurrentView] = useState<ViewType>('main')
  const [weeklyViewType, setWeeklyViewType] = useState<WeeklyViewType>(null)
  const [selectedItem, setSelectedItem] = useState<{
    id: string
    name: string
    type: 'college' | 'class' | 'course'
  } | null>(null)

  // 树形结构状态
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([
    {
      id: 'root',
      label: '吉林财经',
      type: 'root',
      isExpanded: true,
      children: [],
    },
  ])

  const [selectedNode, setSelectedNode] = useState<TreeNode>({
    id: 'root',
    label: '吉林财经',
    type: 'root',
    isExpanded: true,
  })

  // 分页和筛选状态
  const [filters, setFilters] = useState<StatsQueryParams>({
    page: 1,
    pageSize: 20,
    searchKeyword: '',
    sortField: undefined,
    sortOrder: undefined,
  })

  // 周详情排序状态
  const [weeklySort, setWeeklySort] = useState<{
    field: 'absence_rate' | 'truant_rate' | null
    order: 'asc' | 'desc'
  }>({ field: null, order: 'asc' })

  // 列分组展开/收起状态
  const [columnGroupExpanded, setColumnGroupExpanded] = useState<{
    expected: boolean
    absent: boolean
    absenceRate: boolean
  }>({
    expected: false,
    absent: false,
    absenceRate: false,
  })

  // 查询当前教学周
  const { data: currentTeachingWeek } = useQuery({
    queryKey: ['current-teaching-week'],
    queryFn: async () => {
      const response = await fetch(
        '/api/icalink/v1/stats/current-teaching-week'
      )
      if (!response.ok) {
        throw new Error('获取当前教学周失败')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '获取当前教学周失败')
      }
      return result.data as { currentWeek: number; termStartDate: string }
    },
    staleTime: 1000 * 60 * 60, // 1小时内不重新获取
  })

  // 验证周次输入
  const isTeachingWeekValid =
    !filters.teachingWeek ||
    !currentTeachingWeek ||
    filters.teachingWeek <= currentTeachingWeek.currentWeek

  // 根据选中节点类型查询不同的数据
  const { data: unitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['course-stats-unit', filters],
    queryFn: () => {
      // 如果周次无效，返回空数据
      if (!isTeachingWeekValid) {
        return {
          success: true,
          data: {
            data: [],
            total: 0,
            page: 1,
            pageSize: filters.pageSize || 20,
            totalPages: 0,
          },
        }
      }
      return statsApiService.getCourseStatsUnit(filters)
    },
    enabled: selectedNode.type === 'root',
    placeholderData: (previousData) => previousData,
  })

  const { data: classData, isLoading: isLoadingClass } = useQuery({
    queryKey: ['course-stats-class', selectedNode.unitId, filters],
    queryFn: () =>
      statsApiService.getCourseStatsClass({
        ...filters,
        unitId: selectedNode.unitId,
      }),
    enabled: selectedNode.type === 'unit' && !!selectedNode.unitId,
    placeholderData: (previousData) => previousData,
  })

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['course-stats-summary', selectedNode.classCode, filters],
    queryFn: () =>
      statsApiService.getCourseStatsSummary({
        ...filters,
        classCode: selectedNode.classCode,
      }),
    enabled: selectedNode.type === 'class' && !!selectedNode.classCode,
    placeholderData: (previousData) => previousData,
  })

  // 查询学院周度签到统计数据（自动计算当前周并查询到上周）
  const { data: collegeWeeklyData, isLoading: isLoadingCollegeWeekly } =
    useQuery({
      queryKey: ['college-weekly-stats', selectedItem?.id],
      queryFn: async () => {
        const response = await fetch(
          `/api/icalink/v1/stats/college-weekly-attendance?courseUnitId=${selectedItem?.id}&fillMissingWeeks=true`
        )
        if (!response.ok) {
          throw new Error('获取学院周度统计数据失败')
        }
        const result = await response.json()
        if (!result.success) {
          throw new Error(
            result.error || result.message || '获取学院周度统计数据失败'
          )
        }
        return result.data as CollegeWeeklyAttendanceStats[]
      },
      enabled:
        currentView === 'weekly' &&
        weeklyViewType === 'college' &&
        !!selectedItem?.id,
    })

  // 查询教学班周度签到统计数据
  const { data: classWeeklyData, isLoading: isLoadingClassWeekly } = useQuery({
    queryKey: ['class-weekly-stats', selectedItem?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/icalink/v1/stats/class-weekly-attendance?teachingClassCode=${selectedItem?.id}&fillMissingWeeks=true`
      )
      if (!response.ok) {
        throw new Error('获取教学班周度统计数据失败')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(
          result.error || result.message || '获取教学班周度统计数据失败'
        )
      }
      return result.data as ClassWeeklyAttendanceStats[]
    },
    enabled:
      currentView === 'weekly' &&
      weeklyViewType === 'class' &&
      !!selectedItem?.id,
  })

  // 查询课程周度签到统计数据
  const { data: courseWeeklyData, isLoading: isLoadingCourseWeekly } = useQuery(
    {
      queryKey: ['course-weekly-stats', selectedItem?.id],
      queryFn: async () => {
        const response = await fetch(
          `/api/icalink/v1/stats/course-weekly-attendance?courseCode=${selectedItem?.id}&fillMissingWeeks=true`
        )
        if (!response.ok) {
          throw new Error('获取课程周度统计数据失败')
        }
        const result = await response.json()
        if (!result.success) {
          throw new Error(
            result.error || result.message || '获取课程周度统计数据失败'
          )
        }
        return result.data as CourseWeeklyAttendanceStats[]
      },
      enabled:
        currentView === 'weekly' &&
        weeklyViewType === 'course' &&
        !!selectedItem?.id,
    }
  )

  // 获取当前显示的数据
  const currentData =
    selectedNode.type === 'root'
      ? unitData
      : selectedNode.type === 'unit'
        ? classData
        : summaryData

  const records = currentData?.data?.data ?? []
  const total = currentData?.data?.total ?? 0
  const isLoading = isLoadingUnit || isLoadingClass || isLoadingSummary

  // 处理筛选变化
  const handleFilterChange = (key: keyof StatsQueryParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  // 切换到学院周详情视图
  const handleViewCollegeWeeklyStats = (unitId: string, unitName: string) => {
    setSelectedItem({ id: unitId, name: unitName, type: 'college' })
    setWeeklyViewType('college')
    setCurrentView('weekly')
  }

  // 切换到教学班周详情视图
  const handleViewClassWeeklyStats = (classCode: string, className: string) => {
    setSelectedItem({ id: classCode, name: className, type: 'class' })
    setWeeklyViewType('class')
    setCurrentView('weekly')
  }

  // 切换到课程周详情视图
  const handleViewCourseWeeklyStats = (
    courseCode: string,
    courseName: string
  ) => {
    setSelectedItem({ id: courseCode, name: courseName, type: 'course' })
    setWeeklyViewType('course')
    setCurrentView('weekly')
  }

  // 返回主视图
  const handleBackToMain = () => {
    setCurrentView('main')
    setWeeklyViewType(null)
    setSelectedItem(null)
  }

  // 处理排序
  const handleSort = (field: string) => {
    setFilters((prev) => {
      if (prev.sortField === field) {
        // 循环: 升序 → 降序 → 无排序
        if (prev.sortOrder === 'asc') {
          return { ...prev, sortField: field, sortOrder: 'desc' as const }
        } else if (prev.sortOrder === 'desc') {
          return { ...prev, sortField: undefined, sortOrder: undefined }
        }
      }
      // 默认升序
      return { ...prev, sortField: field, sortOrder: 'asc' as const, page: 1 }
    })
  }

  // 获取排序图标
  const getSortIcon = (field: string) => {
    if (filters.sortField !== field) {
      return <ArrowUpDown className='ml-1 inline h-4 w-4' />
    }
    if (filters.sortOrder === 'asc') {
      return <ArrowUp className='ml-1 inline h-4 w-4' />
    }
    return <ArrowDown className='ml-1 inline h-4 w-4' />
  }

  // 处理树节点点击
  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node)
    setFilters((prev) => ({ ...prev, page: 1 }))
  }

  // 切换节点展开/折叠
  const toggleNodeExpansion = (nodeId: string) => {
    const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded }
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) }
        }
        return node
      })
    }
    setTreeNodes(updateNodes(treeNodes))
  }

  // 动态更新树节点（根据API数据）
  useEffect(() => {
    if (selectedNode.type === 'root' && unitData?.data?.data) {
      const unitNodes: TreeNode[] = unitData.data.data.map((unit) => ({
        id: unit.course_unit_id,
        label: unit.course_unit,
        type: 'unit' as TreeNodeType,
        isExpanded: false,
        unitId: unit.course_unit_id,
        children: [],
      }))

      setTreeNodes([
        {
          id: 'root',
          label: '吉林财经',
          type: 'root',
          isExpanded: true,
          children: unitNodes,
        },
      ])
    }
  }, [unitData, selectedNode.type])

  useEffect(() => {
    if (selectedNode.type === 'unit' && classData?.data?.data) {
      const classNodes: TreeNode[] = classData.data.data.map((cls) => {
        // 课程名称超过20个字符时截断
        const displayName =
          cls.course_name.length > 20
            ? cls.course_name.substring(0, 17) + '...'
            : cls.course_name

        return {
          id: cls.teaching_class_code,
          label: displayName,
          type: 'class' as TreeNodeType,
          isExpanded: false,
          classCode: cls.teaching_class_code,
          children: [],
        }
      })

      // 更新树结构，将班级节点添加到对应的单位节点下
      const updateNodes = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.id === selectedNode.unitId) {
            return { ...node, children: classNodes }
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) }
          }
          return node
        })
      }
      setTreeNodes(updateNodes(treeNodes))
    }
  }, [classData, selectedNode.type, selectedNode.unitId])

  // 渲染树形导航
  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isSelected = selectedNode.id === node.id

    return (
      <div key={node.id}>
        <div
          className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md p-2 ${
            isSelected ? 'bg-accent font-medium' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            handleNodeClick(node)
            if (hasChildren) {
              toggleNodeExpansion(node.id)
            }
          }}
        >
          {hasChildren && (
            <span className='flex-shrink-0'>
              {node.isExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
            </span>
          )}
          {!hasChildren && <span className='w-4' />}
          {node.type === 'root' && (
            <Building2 className='h-4 w-4 flex-shrink-0' />
          )}
          {node.type === 'unit' && <Users className='h-4 w-4 flex-shrink-0' />}
          {node.type === 'class' && (
            <GraduationCap className='h-4 w-4 flex-shrink-0' />
          )}
          <span className='truncate'>{node.label}</span>
        </div>
        {hasChildren && node.isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // 切换列组展开/收起状态
  const toggleColumnGroup = (group: 'expected' | 'absent' | 'absenceRate') => {
    setColumnGroupExpanded((prev) => ({
      ...prev,
      [group]: !prev[group],
    }))
  }

  // 获取所有周数（从数据中提取）
  const getAllWeeks = (records: any[]): number[] => {
    const weeksSet = new Set<number>()
    records.forEach((record) => {
      if (record.weekly_stats && Array.isArray(record.weekly_stats)) {
        record.weekly_stats.forEach((stat: any) => {
          weeksSet.add(stat.week)
        })
      }
    })
    return Array.from(weeksSet).sort((a, b) => a - b)
  }

  // 渲染单位级别表格
  const renderUnitTable = () => {
    const unitRecords = records as CourseCheckinStatsUnit[]
    const weeks = getAllWeeks(unitRecords)
    const hasWeeklyData = weeks.length > 0

    return (
      <Table>
        <TableHeader>
          {/* 第一行：列组标题 */}
          <TableRow>
            <TableHead rowSpan={2} className='align-middle'>
              单位名称
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              学期
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              课程数
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              教学班数
            </TableHead>
            {/* 应到人次列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.expected
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('expected')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>应到人次</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.expected ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            {/* 缺勤人次列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.absent
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('absent')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>缺勤人次</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.absent ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            {/* 缺勤率列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.absenceRate
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('absenceRate')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>缺勤率</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.absenceRate ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              旷课人次
            </TableHead>
            <TableHead
              rowSpan={2}
              className='hover:bg-muted cursor-pointer align-middle'
              onClick={() => handleSort('truancy_rate')}
            >
              旷课率 {getSortIcon('truancy_rate')}
            </TableHead>
            <TableHead rowSpan={2} className='w-[120px] align-middle'>
              周详情
            </TableHead>
          </TableRow>
          {/* 第二行：子列标题 */}
          <TableRow>
            {/* 应到人次子列 */}
            {hasWeeklyData && columnGroupExpanded.expected ? (
              <>
                <TableHead className='text-center text-xs'>总计</TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`expected-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead className='text-center'>总计</TableHead>
            )}
            {/* 缺勤人次子列 */}
            {hasWeeklyData && columnGroupExpanded.absent ? (
              <>
                <TableHead className='text-center text-xs'>总计</TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`absent-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead className='text-center'>总计</TableHead>
            )}
            {/* 缺勤率子列 */}
            {hasWeeklyData && columnGroupExpanded.absenceRate ? (
              <>
                <TableHead
                  className='hover:bg-muted cursor-pointer text-center text-xs'
                  onClick={() => handleSort('absence_rate')}
                >
                  平均 {getSortIcon('absence_rate')}
                </TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`rate-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead
                className='hover:bg-muted cursor-pointer text-center'
                onClick={() => handleSort('absence_rate')}
              >
                平均 {getSortIcon('absence_rate')}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={12} className='h-24 text-center'>
                <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                <p className='mt-2'>正在加载...</p>
              </TableCell>
            </TableRow>
          ) : unitRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className='h-24 text-center'>
                无数据
              </TableCell>
            </TableRow>
          ) : (
            unitRecords.map((record, index) => {
              // 获取该记录的周度数据映射
              const weeklyDataMap = new Map<number, any>()
              if (record.weekly_stats) {
                record.weekly_stats.forEach((stat) => {
                  weeklyDataMap.set(stat.week, stat)
                })
              }

              return (
                <TableRow key={`${record.course_unit_id}-${index}`}>
                  <TableCell className='font-medium'>
                    <Tooltip>
                      <TooltipTrigger>
                        {truncateText(record.course_unit)}
                      </TooltipTrigger>
                      <TooltipContent>{record.course_unit}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{record.semester}</TableCell>
                  <TableCell>{record.course_code_count}</TableCell>
                  <TableCell>{record.teaching_class_code_count}</TableCell>

                  {/* 应到人次列组 */}
                  <TableCell className='text-center'>
                    {record.total_should_attend}
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.expected &&
                    weeks.map((week) => (
                      <TableCell
                        key={`expected-${week}`}
                        className='text-center text-xs'
                      >
                        {weeklyDataMap.get(week)?.expected ?? '-'}
                      </TableCell>
                    ))}

                  {/* 缺勤人次列组 */}
                  <TableCell className='text-center'>
                    {record.total_absent}
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.absent &&
                    weeks.map((week) => (
                      <TableCell
                        key={`absent-${week}`}
                        className='text-center text-xs'
                      >
                        {weeklyDataMap.get(week)?.absent ?? '-'}
                      </TableCell>
                    ))}

                  {/* 缺勤率列组 */}
                  <TableCell className='text-center'>
                    {(record.absence_rate * 100).toFixed(1)}%
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.absenceRate &&
                    weeks.map((week) => {
                      const weekData = weeklyDataMap.get(week)
                      return (
                        <TableCell
                          key={`rate-${week}`}
                          className='text-center text-xs'
                        >
                          {weekData
                            ? `${(weekData.absence_rate * 100).toFixed(1)}%`
                            : '-'}
                        </TableCell>
                      )
                    })}

                  <TableCell>{record.total_truant}</TableCell>
                  <TableCell>
                    {(record.truancy_rate * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        handleViewCollegeWeeklyStats(
                          record.course_unit_id,
                          record.course_unit
                        )
                      }
                    >
                      查看周详情
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    )
  }

  // 渲染班级级别表格
  const renderClassTable = () => {
    const classRecords = records as CourseCheckinStatsClass[]
    const weeks = getAllWeeks(classRecords)
    const hasWeeklyData = weeks.length > 0

    return (
      <Table>
        <TableHeader>
          {/* 第一行：列组标题 */}
          <TableRow>
            <TableHead rowSpan={2} className='align-middle'>
              教学班代码
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              课程名称
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              学期
            </TableHead>
            {/* 应到人次列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.expected
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('expected')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>应到人次</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.expected ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            {/* 缺勤人次列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.absent
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('absent')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>缺勤人次</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.absent ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            {/* 缺勤率列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.absenceRate
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('absenceRate')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>缺勤率</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.absenceRate ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              旷课人次
            </TableHead>
            <TableHead
              rowSpan={2}
              className='hover:bg-muted cursor-pointer align-middle'
              onClick={() => handleSort('truancy_rate')}
            >
              旷课率 {getSortIcon('truancy_rate')}
            </TableHead>
            <TableHead rowSpan={2} className='w-[120px] align-middle'>
              周详情
            </TableHead>
          </TableRow>
          {/* 第二行：子列标题 */}
          <TableRow>
            {/* 应到人次子列 */}
            {hasWeeklyData && columnGroupExpanded.expected ? (
              <>
                <TableHead className='text-center text-xs'>总计</TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`expected-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead className='text-center'>总计</TableHead>
            )}
            {/* 缺勤人次子列 */}
            {hasWeeklyData && columnGroupExpanded.absent ? (
              <>
                <TableHead className='text-center text-xs'>总计</TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`absent-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead className='text-center'>总计</TableHead>
            )}
            {/* 缺勤率子列 */}
            {hasWeeklyData && columnGroupExpanded.absenceRate ? (
              <>
                <TableHead
                  className='hover:bg-muted cursor-pointer text-center text-xs'
                  onClick={() => handleSort('absence_rate')}
                >
                  平均 {getSortIcon('absence_rate')}
                </TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`rate-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead
                className='hover:bg-muted cursor-pointer text-center'
                onClick={() => handleSort('absence_rate')}
              >
                平均 {getSortIcon('absence_rate')}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={12} className='h-24 text-center'>
                <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                <p className='mt-2'>正在加载...</p>
              </TableCell>
            </TableRow>
          ) : classRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className='h-24 text-center'>
                无数据
              </TableCell>
            </TableRow>
          ) : (
            classRecords.map((record, index) => {
              // 获取该记录的周度数据映射
              const weeklyDataMap = new Map<number, any>()
              if (record.weekly_stats) {
                record.weekly_stats.forEach((stat) => {
                  weeklyDataMap.set(stat.week, stat)
                })
              }

              return (
                <TableRow key={`${record.teaching_class_code}-${index}`}>
                  <TableCell className='font-medium'>
                    {record.teaching_class_code}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        {truncateText(record.course_name)}
                      </TooltipTrigger>
                      <TooltipContent>{record.course_name}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{record.semester}</TableCell>

                  {/* 应到人次列组 */}
                  <TableCell className='text-center'>
                    {record.total_should_attend}
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.expected &&
                    weeks.map((week) => (
                      <TableCell
                        key={`expected-${week}`}
                        className='text-center text-xs'
                      >
                        {weeklyDataMap.get(week)?.expected ?? '-'}
                      </TableCell>
                    ))}

                  {/* 缺勤人次列组 */}
                  <TableCell className='text-center'>
                    {record.total_absent}
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.absent &&
                    weeks.map((week) => (
                      <TableCell
                        key={`absent-${week}`}
                        className='text-center text-xs'
                      >
                        {weeklyDataMap.get(week)?.absent ?? '-'}
                      </TableCell>
                    ))}

                  {/* 缺勤率列组 */}
                  <TableCell className='text-center'>
                    {(record.absence_rate * 100).toFixed(1)}%
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.absenceRate &&
                    weeks.map((week) => {
                      const weekData = weeklyDataMap.get(week)
                      return (
                        <TableCell
                          key={`rate-${week}`}
                          className='text-center text-xs'
                        >
                          {weekData
                            ? `${(weekData.absence_rate * 100).toFixed(1)}%`
                            : '-'}
                        </TableCell>
                      )
                    })}

                  <TableCell>{record.total_truant}</TableCell>
                  <TableCell>
                    {(record.truancy_rate * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='link'
                      size='sm'
                      onClick={() =>
                        handleViewClassWeeklyStats(
                          record.teaching_class_code,
                          record.course_name
                        )
                      }
                    >
                      查看周详情
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    )
  }

  // 渲染课程汇总表格
  const renderSummaryTable = () => {
    const summaryRecords = records as CourseCheckinStatsSummary[]
    const weeks = getAllWeeks(summaryRecords)
    const hasWeeklyData = weeks.length > 0

    return (
      <Table>
        <TableHeader>
          {/* 第一行：列组标题 */}
          <TableRow>
            <TableHead rowSpan={2} className='align-middle'>
              课程代码
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              课程名称
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              教师姓名
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              上课地点
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              学期
            </TableHead>
            {/* 应到人次列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.expected
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('expected')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>应到人次</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.expected ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            {/* 缺勤人次列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.absent
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('absent')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>缺勤人次</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.absent ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            {/* 缺勤率列组 */}
            <TableHead
              colSpan={
                hasWeeklyData && columnGroupExpanded.absenceRate
                  ? weeks.length + 1
                  : 1
              }
              className='hover:bg-muted cursor-pointer text-center'
              onClick={() => hasWeeklyData && toggleColumnGroup('absenceRate')}
            >
              <div className='flex items-center justify-center gap-1'>
                <span>缺勤率</span>
                {hasWeeklyData &&
                  (columnGroupExpanded.absenceRate ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  ))}
              </div>
            </TableHead>
            <TableHead rowSpan={2} className='align-middle'>
              旷课人次
            </TableHead>
            <TableHead
              rowSpan={2}
              className='hover:bg-muted cursor-pointer align-middle'
              onClick={() => handleSort('truancy_rate')}
            >
              旷课率 {getSortIcon('truancy_rate')}
            </TableHead>
            <TableHead rowSpan={2} className='w-[120px] align-middle'>
              周详情
            </TableHead>
          </TableRow>
          {/* 第二行：子列标题 */}
          <TableRow>
            {/* 应到人次子列 */}
            {hasWeeklyData && columnGroupExpanded.expected ? (
              <>
                <TableHead className='text-center text-xs'>总计</TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`expected-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead className='text-center'>总计</TableHead>
            )}
            {/* 缺勤人次子列 */}
            {hasWeeklyData && columnGroupExpanded.absent ? (
              <>
                <TableHead className='text-center text-xs'>总计</TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`absent-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead className='text-center'>总计</TableHead>
            )}
            {/* 缺勤率子列 */}
            {hasWeeklyData && columnGroupExpanded.absenceRate ? (
              <>
                <TableHead
                  className='hover:bg-muted cursor-pointer text-center text-xs'
                  onClick={() => handleSort('absence_rate')}
                >
                  平均 {getSortIcon('absence_rate')}
                </TableHead>
                {weeks.map((week) => (
                  <TableHead
                    key={`rate-${week}`}
                    className='text-center text-xs'
                  >
                    第{week}周
                  </TableHead>
                ))}
              </>
            ) : (
              <TableHead
                className='hover:bg-muted cursor-pointer text-center'
                onClick={() => handleSort('absence_rate')}
              >
                平均 {getSortIcon('absence_rate')}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={12} className='h-24 text-center'>
                <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                <p className='mt-2'>正在加载...</p>
              </TableCell>
            </TableRow>
          ) : summaryRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className='h-24 text-center'>
                无数据
              </TableCell>
            </TableRow>
          ) : (
            summaryRecords.map((record, index) => {
              // 获取该记录的周度数据映射
              const weeklyDataMap = new Map<number, any>()
              if (record.weekly_stats) {
                record.weekly_stats.forEach((stat) => {
                  weeklyDataMap.set(stat.week, stat)
                })
              }

              return (
                <TableRow key={`${record.course_code}-${index}`}>
                  <TableCell className='font-medium'>
                    {record.course_code}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        {truncateText(record.course_name)}
                      </TooltipTrigger>
                      <TooltipContent>{record.course_name}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{record.teacher_name}</TableCell>
                  <TableCell>{record.class_location}</TableCell>
                  <TableCell>{record.semester}</TableCell>

                  {/* 应到人次列组 */}
                  <TableCell className='text-center'>
                    {record.total_should_attend}
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.expected &&
                    weeks.map((week) => (
                      <TableCell
                        key={`expected-${week}`}
                        className='text-center text-xs'
                      >
                        {weeklyDataMap.get(week)?.expected ?? '-'}
                      </TableCell>
                    ))}

                  {/* 缺勤人次列组 */}
                  <TableCell className='text-center'>
                    {record.total_absent}
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.absent &&
                    weeks.map((week) => (
                      <TableCell
                        key={`absent-${week}`}
                        className='text-center text-xs'
                      >
                        {weeklyDataMap.get(week)?.absent ?? '-'}
                      </TableCell>
                    ))}

                  {/* 缺勤率列组 */}
                  <TableCell className='text-center'>
                    {(record.absence_rate * 100).toFixed(1)}%
                  </TableCell>
                  {hasWeeklyData &&
                    columnGroupExpanded.absenceRate &&
                    weeks.map((week) => {
                      const weekData = weeklyDataMap.get(week)
                      return (
                        <TableCell
                          key={`rate-${week}`}
                          className='text-center text-xs'
                        >
                          {weekData
                            ? `${(weekData.absence_rate * 100).toFixed(1)}%`
                            : '-'}
                        </TableCell>
                      )
                    })}

                  <TableCell>{record.total_truant}</TableCell>
                  <TableCell>
                    {(record.truancy_rate * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='link'
                      size='sm'
                      onClick={() =>
                        handleViewCourseWeeklyStats(
                          record.course_code,
                          record.course_name
                        )
                      }
                    >
                      查看周详情
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    )
  }

  // 处理周详情排序
  const handleWeeklySort = (field: 'absence_rate' | 'truant_rate' | null) => {
    if (weeklySort.field === field) {
      setWeeklySort({
        field,
        order: weeklySort.order === 'asc' ? 'desc' : 'asc',
      })
    } else {
      setWeeklySort({ field, order: 'asc' })
    }
  }

  // 渲染周详情视图
  const renderWeeklyStatsView = () => {
    // 根据视图类型选择数据源
    const weeklyData =
      weeklyViewType === 'college'
        ? collegeWeeklyData
        : weeklyViewType === 'class'
          ? classWeeklyData
          : courseWeeklyData

    // 根据视图类型选择加载状态
    const isLoadingWeekly =
      weeklyViewType === 'college'
        ? isLoadingCollegeWeekly
        : weeklyViewType === 'class'
          ? isLoadingClassWeekly
          : isLoadingCourseWeekly

    // 排序后的数据
    const sortedWeeklyData = weeklyData ? [...weeklyData] : []
    if (weeklySort.field) {
      sortedWeeklyData.sort((a, b) => {
        const aValue = a[weeklySort.field!]
        const bValue = b[weeklySort.field!]
        return weeklySort.order === 'asc' ? aValue - bValue : bValue - aValue
      })
    }

    // 获取缺勤率颜色
    const getAbsenceRateColor = (rate: number) => {
      if (rate > 0.2) return 'text-red-600 font-semibold'
      if (rate > 0.1) return 'text-orange-600 font-semibold'
      return ''
    }

    // 获取旷课率颜色
    const getTruantRateColor = (rate: number) => {
      if (rate > 0.1) return 'text-red-600 font-semibold'
      if (rate > 0.05) return 'text-orange-600 font-semibold'
      return ''
    }

    // 根据视图类型生成标题和描述
    const getTitle = () => {
      if (weeklyViewType === 'college') {
        return `${selectedItem?.name} - 周度签到统计`
      } else if (weeklyViewType === 'class') {
        return `${selectedItem?.name} - 周度签到统计`
      } else {
        return `${selectedItem?.name} - 周度签到统计`
      }
    }

    const getDescription = () => {
      if (weeklyViewType === 'college') {
        return '查看该学院各教学周的签到统计数据'
      } else if (weeklyViewType === 'class') {
        return '查看该教学班各教学周的签到统计数据'
      } else {
        return '查看该课程各教学周的签到统计数据'
      }
    }

    return (
      <>
        {/* 返回按钮和标题 */}
        <Card>
          <CardContent className='pt-6'>
            <div className='mb-4 flex items-center gap-4'>
              <Button variant='outline' size='sm' onClick={handleBackToMain}>
                <ChevronLeft className='mr-1 h-4 w-4' />
                返回
              </Button>
              <div>
                <h2 className='text-xl font-semibold'>{getTitle()}</h2>
                <p className='text-muted-foreground text-sm'>
                  {getDescription()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 周详情表格 */}
        <Card>
          <CardContent className='pt-6'>
            {/* 使用简单的 div 容器实现垂直滚动，保留 Table 组件的横向滚动能力 */}
            <div className='max-h-[500px] overflow-y-auto'>
              <div className='min-w-max'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>教学周</TableHead>
                      <TableHead className='text-right'>应到人次</TableHead>
                      <TableHead className='text-right'>实到人次</TableHead>
                      <TableHead className='text-right'>缺勤人次</TableHead>
                      <TableHead className='text-right'>旷课人次</TableHead>
                      <TableHead className='text-right'>请假人次</TableHead>
                      <TableHead
                        className='hover:bg-muted cursor-pointer text-right'
                        onClick={() => handleWeeklySort('absence_rate')}
                      >
                        缺勤率{' '}
                        {weeklySort.field === 'absence_rate' &&
                          (weeklySort.order === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead
                        className='hover:bg-muted cursor-pointer text-right'
                        onClick={() => handleWeeklySort('truant_rate')}
                      >
                        旷课率{' '}
                        {weeklySort.field === 'truant_rate' &&
                          (weeklySort.order === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingWeekly ? (
                      <TableRow>
                        <TableCell colSpan={8} className='h-24 text-center'>
                          <SearchIcon className='mx-auto h-6 w-6 animate-pulse' />
                          <p className='mt-2'>正在加载...</p>
                        </TableCell>
                      </TableRow>
                    ) : !sortedWeeklyData || sortedWeeklyData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className='h-24 text-center'>
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedWeeklyData.map((week) => (
                        <TableRow key={week.teaching_week}>
                          <TableCell>第 {week.teaching_week} 周</TableCell>
                          <TableCell className='text-right'>
                            {week.expected_attendance}
                          </TableCell>
                          <TableCell className='text-right'>
                            {week.present_count}
                          </TableCell>
                          <TableCell className='text-right text-red-600'>
                            {week.absent_count}
                          </TableCell>
                          <TableCell className='text-right text-red-800'>
                            {week.truant_count}
                          </TableCell>
                          <TableCell className='text-right'>
                            {week.leave_count}
                          </TableCell>
                          <TableCell
                            className={`text-right ${getAbsenceRateColor(week.absence_rate)}`}
                          >
                            {(week.absence_rate * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell
                            className={`text-right ${getTruantRateColor(week.truant_rate)}`}
                          >
                            {(week.truant_rate * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <TooltipProvider>
      <>
        <Header>
          <Search />
          <div className='ml-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <UserNav />
          </div>
        </Header>

        <Main>
          <div className='space-y-0.5'>
            <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
              课程签到统计
            </h1>
            <p className='text-muted-foreground'>
              按单位→班级→课程的层级查看签到统计数据
            </p>
          </div>
          <Separator className='my-4 lg:my-6' />

          {/* 主视图：左侧树形导航 + 右侧表格 */}
          <div className='grid grid-cols-12 gap-6'>
            {/* 左侧树形导航（始终显示） */}
            <Card className='col-span-3'>
              <CardHeader>
                <CardTitle className='text-lg'>组织结构</CardTitle>
                <CardDescription>点击节点查看对应统计数据</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className='h-[600px]'>
                  {treeNodes.map((node) => renderTreeNode(node))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 右侧内容区域：根据视图类型显示不同内容 */}
            <div className='col-span-9 space-y-4'>
              {currentView === 'weekly' ? (
                // 周详情视图
                renderWeeklyStatsView()
              ) : (
                // 主视图表格
                <>
                  {/* 筛选条件 */}
                  <Card>
                    <CardContent className='space-y-4'>
                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        {selectedNode.type === 'root' ? (
                          // 根节点：显示周次搜索
                          <div className='space-y-2'>
                            <label
                              htmlFor='teachingWeek'
                              className='text-sm font-medium'
                            >
                              教学周
                            </label>
                            <Input
                              id='teachingWeek'
                              type='number'
                              min={1}
                              max={currentTeachingWeek?.currentWeek || 18}
                              placeholder={`请输入教学周（1-${currentTeachingWeek?.currentWeek || 18}）`}
                              value={filters.teachingWeek || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                                handleFilterChange('teachingWeek', value)
                              }}
                            />
                            {currentTeachingWeek && (
                              <p className='text-muted-foreground text-xs'>
                                当前为第 {currentTeachingWeek.currentWeek} 周
                              </p>
                            )}
                          </div>
                        ) : (
                          // 其他节点：显示关键词搜索
                          <div className='space-y-2'>
                            <Input
                              id='searchKeyword'
                              placeholder='输入关键词搜索'
                              value={filters.searchKeyword}
                              onChange={(e) =>
                                handleFilterChange(
                                  'searchKeyword',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        )}
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
                      {/* 周次验证错误提示 */}
                      {selectedNode.type === 'root' &&
                        filters.teachingWeek &&
                        !isTeachingWeekValid && (
                          <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
                            输入的周次不能大于当前教学周（第{' '}
                            {currentTeachingWeek?.currentWeek} 周）
                          </div>
                        )}

                      {/* 表格区域 - 使用简单的 div 容器实现垂直滚动，保留 Table 组件的横向滚动能力 */}
                      <div className='max-h-[450px] overflow-y-auto'>
                        <div className='min-w-max pb-4'>
                          {selectedNode.type === 'root' && renderUnitTable()}
                          {selectedNode.type === 'unit' && renderClassTable()}
                          {selectedNode.type === 'class' &&
                            renderSummaryTable()}
                        </div>
                      </div>

                      {/* 分页控件 */}
                      {records.length > 0 && (
                        <EnhancedPagination
                          page={filters.page!}
                          pageSize={filters.pageSize!}
                          total={total}
                          onPageChange={(newPage) =>
                            setFilters((prev) => ({ ...prev, page: newPage }))
                          }
                          onPageSizeChange={(newPageSize) =>
                            setFilters((prev) => ({
                              ...prev,
                              pageSize: newPageSize,
                              page: 1,
                            }))
                          }
                          disabled={isLoading}
                        />
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </Main>
      </>
    </TooltipProvider>
  )
}
