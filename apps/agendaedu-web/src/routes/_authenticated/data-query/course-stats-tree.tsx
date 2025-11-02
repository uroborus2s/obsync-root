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
  RotateCcw,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
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

// 文本截断工具函数
const truncateText = (text: string, maxLength: number = 20) => {
  if (text.length <= maxLength) return text
  return text.substring(0, 17) + '...'
}

function CourseStatsTreePage() {
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

  // 根据选中节点类型查询不同的数据
  const { data: unitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ['course-stats-unit', filters],
    queryFn: () => statsApiService.getCourseStatsUnit(filters),
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

  // 获取当前显示的数据
  const currentData =
    selectedNode.type === 'root'
      ? unitData
      : selectedNode.type === 'unit'
        ? classData
        : summaryData

  const records = currentData?.data?.data ?? []
  const total = currentData?.data?.total ?? 0
  const totalPages = currentData?.data?.totalPages ?? 0
  const isLoading = isLoadingUnit || isLoadingClass || isLoadingSummary

  // 处理筛选变化
  const handleFilterChange = (key: keyof StatsQueryParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  // 处理分页
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      searchKeyword: '',
      sortField: undefined,
      sortOrder: undefined,
    })
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

  // 渲染单位级别表格
  const renderUnitTable = () => {
    const unitRecords = records as CourseCheckinStatsUnit[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>单位名称</TableHead>
            <TableHead>学期</TableHead>
            <TableHead>课程数</TableHead>
            <TableHead>教学班数</TableHead>
            <TableHead>应到人次</TableHead>
            <TableHead>缺勤人次</TableHead>
            <TableHead
              className='hover:bg-muted cursor-pointer'
              onClick={() => handleSort('absence_rate')}
            >
              缺勤率 {getSortIcon('absence_rate')}
            </TableHead>
            <TableHead>旷课人次</TableHead>
            <TableHead
              className='hover:bg-muted cursor-pointer'
              onClick={() => handleSort('truancy_rate')}
            >
              旷课率 {getSortIcon('truancy_rate')}
            </TableHead>
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
            unitRecords.map((record, index) => (
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
                <TableCell>{record.total_should_attend}</TableCell>
                <TableCell>{record.total_absent}</TableCell>
                <TableCell>{(record.absence_rate * 100).toFixed(2)}%</TableCell>
                <TableCell>{record.total_truant}</TableCell>
                <TableCell>{(record.truancy_rate * 100).toFixed(2)}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    )
  }

  // 渲染班级级别表格
  const renderClassTable = () => {
    const classRecords = records as CourseCheckinStatsClass[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>教学班代码</TableHead>
            <TableHead>课程名称</TableHead>
            <TableHead>学期</TableHead>
            <TableHead>应到人次</TableHead>
            <TableHead>缺勤人次</TableHead>
            <TableHead
              className='hover:bg-muted cursor-pointer'
              onClick={() => handleSort('absence_rate')}
            >
              缺勤率 {getSortIcon('absence_rate')}
            </TableHead>
            <TableHead>旷课人次</TableHead>
            <TableHead
              className='hover:bg-muted cursor-pointer'
              onClick={() => handleSort('truancy_rate')}
            >
              旷课率 {getSortIcon('truancy_rate')}
            </TableHead>
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
            classRecords.map((record, index) => (
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
                <TableCell>{record.total_should_attend}</TableCell>
                <TableCell>{record.total_absent}</TableCell>
                <TableCell>{(record.absence_rate * 100).toFixed(2)}%</TableCell>
                <TableCell>{record.total_truant}</TableCell>
                <TableCell>{(record.truancy_rate * 100).toFixed(2)}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    )
  }

  // 渲染课程汇总表格
  const renderSummaryTable = () => {
    const summaryRecords = records as CourseCheckinStatsSummary[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>课程代码</TableHead>
            <TableHead>课程名称</TableHead>
            <TableHead>教师姓名</TableHead>
            <TableHead>上课地点</TableHead>
            <TableHead>学期</TableHead>
            <TableHead>应到人次</TableHead>
            <TableHead>缺勤人次</TableHead>
            <TableHead
              className='hover:bg-muted cursor-pointer'
              onClick={() => handleSort('absence_rate')}
            >
              缺勤率 {getSortIcon('absence_rate')}
            </TableHead>
            <TableHead>旷课人次</TableHead>
            <TableHead
              className='hover:bg-muted cursor-pointer'
              onClick={() => handleSort('truancy_rate')}
            >
              旷课率 {getSortIcon('truancy_rate')}
            </TableHead>
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
            summaryRecords.map((record, index) => (
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
                <TableCell>{record.total_should_attend}</TableCell>
                <TableCell>{record.total_absent}</TableCell>
                <TableCell>{(record.absence_rate * 100).toFixed(2)}%</TableCell>
                <TableCell>{record.total_truant}</TableCell>
                <TableCell>{(record.truancy_rate * 100).toFixed(2)}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    )
  }

  return (
    <TooltipProvider>
      <div className='container mx-auto space-y-6 p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>课程签到统计（树形结构）</h1>
            <p className='text-muted-foreground'>
              按单位→班级→课程的层级查看签到统计数据
            </p>
          </div>
        </div>

        <div className='grid grid-cols-12 gap-6'>
          {/* 左侧树形导航 */}
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

          {/* 右侧数据表格 */}
          <div className='col-span-9 space-y-4'>
            {/* 筛选条件 */}
            <Card>
              <CardHeader>
                <CardTitle>查询条件</CardTitle>
                <CardDescription>
                  当前查看: {selectedNode.label} (
                  {selectedNode.type === 'root'
                    ? '单位级别'
                    : selectedNode.type === 'unit'
                      ? '班级级别'
                      : '课程级别'}
                  )
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='searchKeyword'>搜索</Label>
                    <Input
                      id='searchKeyword'
                      placeholder='输入关键词搜索'
                      value={filters.searchKeyword}
                      onChange={(e) =>
                        handleFilterChange('searchKeyword', e.target.value)
                      }
                    />
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
                  {selectedNode.type === 'root' && renderUnitTable()}
                  {selectedNode.type === 'unit' && renderClassTable()}
                  {selectedNode.type === 'class' && renderSummaryTable()}
                </div>

                {/* 分页 */}
                <div className='mt-4 flex items-center justify-between'>
                  <div className='text-muted-foreground text-sm'>
                    第 {filters.page} 页，共 {totalPages} 页 | 总计 {total}{' '}
                    条记录
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
        </div>
      </div>
    </TooltipProvider>
  )
}
