import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight,
  Eye,
  Folder,
  FolderOpen,
  Loader2,
  Users,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EnhancedPagination } from '@/components/ui/enhanced-pagination'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * 组织架构树节点接口
 */
interface DepartmentNode {
  id: string
  name: string
  abs_path: string
  parent_id: string
  ex_dept_id: string // 外部部门ID，用于与class_id匹配
  children?: DepartmentNode[]
  isExpanded?: boolean
  isLoading?: boolean
}

/**
 * 学生缺勤率统计数据接口
 */
interface StudentAbsenceStats {
  student_id: string
  student_name: string
  school_name: string | null
  class_name: string | null
  major_name: string | null
  grade: string | null
  total_courses: number
  total_sessions: number
  completed_sessions: number
  total_absent_count: number
  total_leave_count: number
  total_truant_count: number
  overall_absence_rate: number
  overall_leave_rate: number
  overall_truant_rate: number
}

/**
 * 学生课程缺勤详情接口
 */
interface StudentCourseDetail {
  id: number
  student_id: string
  student_name: string
  course_code: string
  course_name: string
  total_sessions: number
  completed_sessions: number
  absent_count: number
  leave_count: number
  truant_count: number
  absence_rate: number
  leave_rate: number
  truant_rate: number
}

/**
 * 学生缺勤记录详情接口
 */
interface AbsentRecord {
  id: number
  course_code: string
  course_name: string
  student_id: string
  student_name: string
  absence_type: 'absent' | 'truant' | 'leave' | 'leave_pending'
  stat_date: string
  semester: string
  teaching_week: number
  week_day: number
  periods: string | null
  time_period: string
  school_name: string | null
  class_name: string | null
  major_name: string | null
}

/**
 * 拆分 ex_dept_id 参数
 * @param exDeptId 完整的 ex_dept_id，例如 "030308202303080603080623018"
 * @returns 拆分后的参数对象，如果格式不正确则返回 null
 */
function parseExDeptId(exDeptId: string) {
  if (!exDeptId || exDeptId.length < 17) {
    return null
  }

  return {
    // type: exDeptId.substring(0, 2),        // 前2位：类型（不传给后端）
    collegeId: exDeptId.substring(2, 6), // 第3-6位：学院 ID
    grade: exDeptId.substring(6, 10), // 第7-10位：年级
    majorId: exDeptId.substring(10, 16), // 第11-16位：专业 ID
    classId: exDeptId.substring(16), // 第17位及以后：班级 ID
  }
}

/**
 * 学生缺勤统计组件
 * 左侧：组织架构树
 * 右侧：学生统计表格
 */
export function StudentAbsenceStats() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedExDeptId, setSelectedExDeptId] = useState<string | null>(null) // 保存选中节点的ex_dept_id
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [treeData, setTreeData] = useState<Map<string, DepartmentNode[]>>(
    new Map()
  )
  const [nodeMap, setNodeMap] = useState<Map<string, DepartmentNode>>(new Map()) // 存储所有节点信息，用于获取父节点的 ex_dept_id
  const [leafNodes, setLeafNodes] = useState<Set<string>>(new Set()) // 记录叶子节点
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set()) // 记录正在加载的节点
  const [treeError, setTreeError] = useState<string | null>(null) // 记录树加载错误
  const [searchKeyword, setSearchKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState<string>('overall_absence_rate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 视图状态管理：'list' 显示学生列表，'course-detail' 显示课程详情，'absent-record' 显示缺勤记录
  const [viewMode, setViewMode] = useState<
    'list' | 'course-detail' | 'absent-record'
  >('list')
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string
    name: string
    schoolName: string | null
    className: string | null
    majorName: string | null
    grade: string | null
  } | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<{
    code: string
    name: string
    absenceType?: 'absent' | 'leave' | 'truant'
  } | null>(null)

  // 获取根部门
  const { data: rootDept, isLoading: isLoadingRoot } = useQuery({
    queryKey: ['department-root'],
    queryFn: async (): Promise<DepartmentNode> => {
      const result = await apiClient.get<{
        success: boolean
        data: DepartmentNode
      }>('/api/icalink/v1/depts/root')
      return result.data
    },
  })

  // 获取子部门（支持分页）
  const fetchChildren = async (
    deptId: string,
    parentExDeptId?: string
  ): Promise<DepartmentNode[]> => {
    // 检查缓存
    if (treeData.has(deptId)) {
      return treeData.get(deptId)!
    }

    try {
      const allChildren: DepartmentNode[] = []
      let pageToken: string | undefined = undefined

      // 循环获取所有页的数据
      do {
        // 构建查询参数
        const params: Record<string, string> = {
          page_size: '50',
        }
        if (pageToken) {
          params.page_token = pageToken
        }
        // 性能优化：传递根部门ID，避免后端额外的API调用
        if (rootDept?.id) {
          params.root_dept_id = rootDept.id
        }
        // 权限过滤：传递父部门的 ex_dept_id，用于学院级别权限过滤
        if (parentExDeptId) {
          params.parent_ex_dept_id = parentExDeptId
        }

        console.log('🔗 请求参数:', params)

        const result = await apiClient.get<{
          success: boolean
          data?: {
            items: DepartmentNode[]
            next_page_token?: string
          }
          error?: string
        }>(`/api/icalink/v1/depts/${deptId}/children`, { params })

        console.log('📥 收到响应:', result)

        // 处理业务错误
        if (!result.success) {
          throw new Error(result.error || '获取子部门失败')
        }

        // 收集子部门数据
        const items = result.data?.items || []
        allChildren.push(...items)

        // 获取下一页标记
        pageToken = result.data?.next_page_token
      } while (pageToken)

      // 标记叶子节点（没有子部门的节点）
      if (allChildren.length === 0) {
        setLeafNodes((prev) => new Set(prev).add(deptId))
      }

      // 缓存结果
      setTreeData((prev) => new Map(prev).set(deptId, allChildren))

      // 更新节点映射表，存储所有子节点信息
      setNodeMap((prev) => {
        const newMap = new Map(prev)
        allChildren.forEach((child) => {
          newMap.set(child.id, child)
        })
        return newMap
      })

      return allChildren
    } catch (error) {
      // 处理网络错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络')
      }
      // 重新抛出其他错误
      throw error
    }
  }

  // 获取学生统计数据
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: [
      'student-absence-stats',
      selectedExDeptId,
      searchKeyword,
      page,
      sortField,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      // 拆分 ex_dept_id 并传递给后端
      if (selectedExDeptId) {
        const parsed = parseExDeptId(selectedExDeptId)
        if (parsed) {
          params.append('collegeId', parsed.collegeId)
          params.append('grade', parsed.grade)
          params.append('majorId', parsed.majorId)
          params.append('classId', parsed.classId)
        }
      }

      if (searchKeyword) {
        params.append('searchKeyword', searchKeyword)
      }

      if (sortField) {
        params.append('sortField', sortField)
      }

      if (sortOrder) {
        params.append('sortOrder', sortOrder)
      }

      const result = await apiClient.get<{
        success: boolean
        data: {
          data: StudentAbsenceStats[]
          total: number
          page: number
          pageSize: number
        }
      }>(`/api/icalink/v1/stats/student-absence-summary?${params}`)
      return result.data
    },
    // 只有当选中的节点是叶子节点（班级）时，才启用查询
    enabled:
      !!selectedExDeptId && !!selectedNodeId && leafNodes.has(selectedNodeId),
  })

  // 获取学生课程详情
  const { data: courseDetails, isLoading: isLoadingCourseDetails } = useQuery({
    queryKey: ['student-course-details', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return null

      const result = await apiClient.get<{
        success: boolean
        data: StudentCourseDetail[]
      }>(`/api/icalink/v1/stats/student-course-details/${selectedStudent.id}`)
      return result.data
    },
    enabled: !!selectedStudent?.id && viewMode === 'course-detail',
  })

  // 获取学生缺勤记录详情
  const { data: absentRecords, isLoading: isLoadingAbsentRecords } = useQuery({
    queryKey: [
      'student-absent-records',
      selectedStudent?.id,
      selectedCourse?.code,
      selectedCourse?.absenceType,
    ],
    queryFn: async () => {
      if (!selectedStudent?.id || !selectedCourse?.code) return null

      // 构建查询参数
      const params = new URLSearchParams({
        studentId: selectedStudent.id,
        courseCode: selectedCourse.code,
      })

      // 添加缺勤类型过滤
      if (selectedCourse.absenceType) {
        // 请假类型需要查询 leave 和 leave_pending
        const absenceType =
          selectedCourse.absenceType === 'leave'
            ? 'leave_and_pending'
            : selectedCourse.absenceType
        params.append('absenceType', absenceType)
      }

      const result = await apiClient.get<{
        success: boolean
        data: AbsentRecord[]
      }>(`/api/icalink/v1/stats/student-absent-records?${params.toString()}`)
      return result.data
    },
    enabled:
      !!selectedStudent?.id &&
      !!selectedCourse?.code &&
      viewMode === 'absent-record',
  })

  // 切换节点展开/折叠
  const toggleNode = async (nodeId: string) => {
    console.log('toggleNode called with nodeId:', nodeId)
    console.log('treeData.has(nodeId):', treeData.has(nodeId))
    console.log('expandedNodes.has(nodeId):', expandedNodes.has(nodeId))

    const newExpanded = new Set(expandedNodes)

    // 如果节点已展开，则折叠
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
      setExpandedNodes(newExpanded)
      return
    }

    // 展开节点
    newExpanded.add(nodeId)
    setExpandedNodes(newExpanded)

    // 如果节点还没有加载子节点，则加载
    if (!treeData.has(nodeId)) {
      // 从 nodeMap 中获取当前节点的 ex_dept_id
      const currentNode = nodeMap.get(nodeId) || rootDept
      const parentExDeptId = currentNode?.ex_dept_id

      // 设置加载状态
      setLoadingNodes((prev) => new Set(prev).add(nodeId))

      try {
        await fetchChildren(nodeId, parentExDeptId)
        // 清除之前的错误
        setTreeError(null)
      } catch (error) {
        // 加载失败时移除展开状态
        newExpanded.delete(nodeId)
        setExpandedNodes(newExpanded)

        // 设置错误信息
        const errorMessage =
          error instanceof Error ? error.message : '获取子部门失败'
        setTreeError(errorMessage)
      } finally {
        // 清除加载状态
        setLoadingNodes((prev) => {
          const next = new Set(prev)
          next.delete(nodeId)
          return next
        })
      }
    } else {
      console.log('Children already loaded for nodeId:', nodeId)
    }
  }

  // 选择节点并展开/折叠（合并逻辑）
  const handleNodeClick = async (node: DepartmentNode) => {
    console.log('�️ 点击节点行:', {
      nodeId: node.id,
      nodeName: node.name,
      exDeptId: node.ex_dept_id,
      isLeaf: leafNodes.has(node.id),
    })

    // 1. 选中节点
    setSelectedNodeId(node.id)

    // 2. 判断是否为班级节点（叶子节点）
    const isLeaf = leafNodes.has(node.id)
    const isLoading = loadingNodes.has(node.id)

    if (isLeaf) {
      // 是班级节点，设置 ex_dept_id 用于查询学生统计数据
      setSelectedExDeptId(node.ex_dept_id)
      setPage(1) // 重置页码
    } else {
      // 不是班级节点，清空 ex_dept_id，阻止查询
      setSelectedExDeptId(null)

      // 如果不在加载中，则展开/折叠
      if (!isLoading) {
        await toggleNode(node.id)
      }
    }
  }

  // 渲染树节点
  const renderTreeNode = (node: DepartmentNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeId === node.id
    const isLoading = loadingNodes.has(node.id)
    const children = treeData.get(node.id) || []

    // 判断是否有子节点
    // 1. 如果是叶子节点（已确认没有子部门），则 hasChildren = false
    // 2. 如果已加载且有子部门，则 hasChildren = true
    // 3. 如果未加载，则假设有子节点（允许用户点击展开）
    const isLeaf = leafNodes.has(node.id)
    const hasChildren =
      !isLeaf && (children.length > 0 || !treeData.has(node.id))

    return (
      <div key={node.id}>
        <div
          className={cn(
            'hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
            isSelected && 'bg-accent',
            (isLoading || isLeaf) && 'cursor-default'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {/* 左侧图标 */}
          <div className='flex h-6 w-6 items-center justify-center'>
            {isLoading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpen className='h-4 w-4' />
              ) : (
                <Folder className='h-4 w-4' />
              )
            ) : (
              <Users className='h-4 w-4' />
            )}
          </div>

          {/* 节点名称 */}
          <span className='flex-1 text-sm'>{node.name}</span>

          {/* 右侧展开/折叠指示器 */}
          {hasChildren && !isLoading && (
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          )}
        </div>

        {/* 子节点 */}
        {isExpanded && hasChildren && !isLoading && (
          <div>{children.map((child) => renderTreeNode(child, level + 1))}</div>
        )}
      </div>
    )
  }

  // 格式化百分比
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  return (
    <div className='grid grid-cols-12 gap-4'>
      {/* 左侧：组织架构树 */}
      <div className='col-span-3 space-y-3'>
        <div className='max-h-[600px] overflow-y-auto rounded-lg border p-4'>
          <h3 className='mb-4 font-semibold'>组织架构</h3>
          {isLoadingRoot ? (
            <div className='space-y-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : rootDept ? (
            renderTreeNode(rootDept)
          ) : (
            <p className='text-muted-foreground text-sm'>暂无数据</p>
          )}
        </div>

        {/* 错误提示 */}
        {treeError && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
            <div className='flex items-start gap-2'>
              <div className='text-red-600'>⚠️</div>
              <div className='flex-1'>
                <p className='text-sm font-medium text-red-800'>加载失败</p>
                <p className='text-sm text-red-600'>{treeError}</p>
              </div>
              <button
                type='button'
                onClick={() => setTreeError(null)}
                className='text-red-400 hover:text-red-600'
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 右侧：学生统计表格或课程详情 */}
      <div className='col-span-9 space-y-4'>
        {viewMode === 'list' ? (
          <>
            {/* 搜索框 */}
            <div className='flex items-center gap-4'>
              <div className='flex-1'>
                <Input
                  id='search'
                  placeholder='输入学生ID或姓名搜索...'
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </div>

            {/* 统计表格 */}
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生ID</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        课程数
                        <Eye className='text-muted-foreground h-3.5 w-3.5' />
                      </div>
                    </TableHead>
                    <TableHead className='text-right'>总课次</TableHead>
                    <TableHead className='text-right'>已完成课次</TableHead>
                    <TableHead className='text-right'>缺勤次数</TableHead>
                    <TableHead className='text-right'>请假次数</TableHead>
                    <TableHead className='text-right'>旷课次数</TableHead>
                    <TableHead
                      className='hover:bg-accent cursor-pointer text-right'
                      onClick={() => {
                        if (sortField === 'overall_absence_rate') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('overall_absence_rate')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      <div className='flex items-center justify-end gap-1'>
                        缺勤率
                        {sortField === 'overall_absence_rate' && (
                          <span className='text-xs'>
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className='hover:bg-accent cursor-pointer text-right'
                      onClick={() => {
                        if (sortField === 'overall_leave_rate') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('overall_leave_rate')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      <div className='flex items-center justify-end gap-1'>
                        请假率
                        {sortField === 'overall_leave_rate' && (
                          <span className='text-xs'>
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className='hover:bg-accent cursor-pointer text-right'
                      onClick={() => {
                        if (sortField === 'overall_truant_rate') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('overall_truant_rate')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      <div className='flex items-center justify-end gap-1'>
                        旷课率
                        {sortField === 'overall_truant_rate' && (
                          <span className='text-xs'>
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingStats ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 11 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className='h-4 w-full' />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : statsData?.data && statsData.data.length > 0 ? (
                    statsData.data.map((student: StudentAbsenceStats) => (
                      <TableRow key={student.student_id}>
                        <TableCell className='font-mono text-sm'>
                          {student.student_id}
                        </TableCell>
                        <TableCell>{student.student_name}</TableCell>
                        <TableCell
                          className='group cursor-pointer text-right text-blue-600 transition-colors hover:text-blue-800'
                          onClick={() => {
                            setSelectedStudent({
                              id: student.student_id,
                              name: student.student_name,
                              schoolName: student.school_name,
                              className: student.class_name,
                              majorName: student.major_name,
                              grade: student.grade,
                            })
                            setViewMode('course-detail')
                          }}
                        >
                          <div className='flex items-center justify-end gap-1'>
                            <span className='group-hover:underline'>
                              {student.total_courses}
                            </span>
                            <Eye className='h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100' />
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          {student.total_sessions}
                        </TableCell>
                        <TableCell className='text-right'>
                          {student.completed_sessions}
                        </TableCell>
                        <TableCell className='text-right'>
                          {student.total_absent_count}
                        </TableCell>
                        <TableCell className='text-right'>
                          {student.total_leave_count}
                        </TableCell>
                        <TableCell className='text-right'>
                          {student.total_truant_count}
                        </TableCell>
                        <TableCell className='text-right font-semibold'>
                          {formatPercentage(student.overall_absence_rate)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatPercentage(student.overall_leave_rate)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatPercentage(student.overall_truant_rate)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className='text-muted-foreground text-center'
                      >
                        {!selectedNodeId
                          ? '请选择组织架构节点'
                          : !leafNodes.has(selectedNodeId)
                            ? '请选择具体班级查看学生统计'
                            : '暂无数据'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {statsData && statsData.total > 0 && (
              <EnhancedPagination
                page={page}
                pageSize={pageSize}
                total={statsData.total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                disabled={isLoadingStats}
              />
            )}
          </>
        ) : viewMode === 'course-detail' ? (
          <>
            {/* 课程详情视图 */}
            <div className='space-y-4'>
              {/* 返回按钮和学生信息 */}
              <div className='space-y-3'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setViewMode('list')
                    setSelectedStudent(null)
                  }}
                  className='gap-2'
                >
                  <ChevronRight className='h-4 w-4 rotate-180' />
                  返回学生列表
                </Button>
                <div className='bg-muted/50 rounded-lg border p-4'>
                  <h3 className='mb-3 text-lg font-semibold'>
                    {selectedStudent?.name} 的课程缺勤详情
                  </h3>
                  <div className='text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3'>
                    <div>
                      <span className='font-medium'>学号：</span>
                      {selectedStudent?.id}
                    </div>
                    {selectedStudent?.schoolName && (
                      <div>
                        <span className='font-medium'>学院：</span>
                        {selectedStudent.schoolName}
                      </div>
                    )}
                    {selectedStudent?.majorName && (
                      <div>
                        <span className='font-medium'>专业：</span>
                        {selectedStudent.majorName}
                      </div>
                    )}
                    {selectedStudent?.className && (
                      <div>
                        <span className='font-medium'>班级：</span>
                        {selectedStudent.className}
                      </div>
                    )}
                    {selectedStudent?.grade && (
                      <div>
                        <span className='font-medium'>年级：</span>
                        {selectedStudent.grade}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 课程详情表格 */}
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>课程代码</TableHead>
                      <TableHead>课程名称</TableHead>
                      <TableHead className='text-right'>总课次</TableHead>
                      <TableHead className='text-right'>已完成课次</TableHead>
                      <TableHead className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          缺勤次数
                          <Eye className='text-muted-foreground h-3.5 w-3.5' />
                        </div>
                      </TableHead>
                      <TableHead className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          请假次数
                          <Eye className='text-muted-foreground h-3.5 w-3.5' />
                        </div>
                      </TableHead>
                      <TableHead className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          旷课次数
                          <Eye className='text-muted-foreground h-3.5 w-3.5' />
                        </div>
                      </TableHead>
                      <TableHead className='text-right'>缺勤率</TableHead>
                      <TableHead className='text-right'>请假率</TableHead>
                      <TableHead className='text-right'>旷课率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCourseDetails ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 10 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className='h-4 w-full' />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : courseDetails && courseDetails.length > 0 ? (
                      courseDetails.map((course: StudentCourseDetail) => (
                        <TableRow key={course.id}>
                          <TableCell className='font-mono text-sm'>
                            {course.course_code}
                          </TableCell>
                          <TableCell>{course.course_name}</TableCell>
                          <TableCell className='text-right'>
                            {course.total_sessions}
                          </TableCell>
                          <TableCell className='text-right'>
                            {course.completed_sessions}
                          </TableCell>
                          <TableCell
                            className='group cursor-pointer text-right text-blue-600 transition-colors hover:text-blue-800'
                            onClick={() => {
                              setSelectedCourse({
                                code: course.course_code,
                                name: course.course_name,
                                absenceType: 'absent',
                              })
                              setViewMode('absent-record')
                            }}
                          >
                            <div className='flex items-center justify-end gap-1'>
                              <span className='group-hover:underline'>
                                {course.absent_count}
                              </span>
                              <Eye className='h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100' />
                            </div>
                          </TableCell>
                          <TableCell
                            className='group cursor-pointer text-right text-blue-600 transition-colors hover:text-blue-800'
                            onClick={() => {
                              setSelectedCourse({
                                code: course.course_code,
                                name: course.course_name,
                                absenceType: 'leave',
                              })
                              setViewMode('absent-record')
                            }}
                          >
                            <div className='flex items-center justify-end gap-1'>
                              <span className='group-hover:underline'>
                                {course.leave_count}
                              </span>
                              <Eye className='h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100' />
                            </div>
                          </TableCell>
                          <TableCell
                            className='group cursor-pointer text-right text-blue-600 transition-colors hover:text-blue-800'
                            onClick={() => {
                              setSelectedCourse({
                                code: course.course_code,
                                name: course.course_name,
                                absenceType: 'truant',
                              })
                              setViewMode('absent-record')
                            }}
                          >
                            <div className='flex items-center justify-end gap-1'>
                              <span className='group-hover:underline'>
                                {course.truant_count}
                              </span>
                              <Eye className='h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100' />
                            </div>
                          </TableCell>
                          <TableCell className='text-right font-semibold'>
                            {formatPercentage(course.absence_rate)}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatPercentage(course.leave_rate)}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatPercentage(course.truant_rate)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className='text-muted-foreground text-center'
                        >
                          暂无课程详情数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 缺勤记录详情视图 */}
            <div className='space-y-4'>
              {/* 返回按钮和课程信息 */}
              <div className='space-y-3'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setViewMode('course-detail')
                    setSelectedCourse(null)
                  }}
                  className='gap-2'
                >
                  <ChevronRight className='h-4 w-4 rotate-180' />
                  返回课程列表
                </Button>
                <div className='bg-muted/50 rounded-lg border p-4'>
                  <h3 className='mb-3 text-lg font-semibold'>
                    {selectedStudent?.name} - {selectedCourse?.name}{' '}
                    {selectedCourse?.absenceType === 'absent'
                      ? '缺勤记录'
                      : selectedCourse?.absenceType === 'leave'
                        ? '请假记录'
                        : selectedCourse?.absenceType === 'truant'
                          ? '旷课记录'
                          : '缺勤记录'}
                  </h3>
                  <div className='text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3'>
                    <div>
                      <span className='font-medium'>学号：</span>
                      {selectedStudent?.id}
                    </div>
                    <div>
                      <span className='font-medium'>课程代码：</span>
                      {selectedCourse?.code}
                    </div>
                    {selectedStudent?.schoolName && (
                      <div>
                        <span className='font-medium'>学院：</span>
                        {selectedStudent.schoolName}
                      </div>
                    )}
                    {selectedStudent?.majorName && (
                      <div>
                        <span className='font-medium'>专业：</span>
                        {selectedStudent.majorName}
                      </div>
                    )}
                    {selectedStudent?.className && (
                      <div>
                        <span className='font-medium'>班级：</span>
                        {selectedStudent.className}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 缺勤记录表格 */}
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学期</TableHead>
                      <TableHead className='text-right'>教学周</TableHead>
                      <TableHead className='text-right'>星期</TableHead>
                      <TableHead>节次</TableHead>
                      <TableHead>时间段</TableHead>
                      <TableHead>缺勤类型</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAbsentRecords ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className='h-4 w-full' />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : absentRecords && absentRecords.length > 0 ? (
                      absentRecords.map((record: AbsentRecord) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.semester}</TableCell>
                          <TableCell className='text-right'>
                            {record.teaching_week}
                          </TableCell>
                          <TableCell className='text-right'>
                            {record.week_day}
                          </TableCell>
                          <TableCell>{record.periods || '-'}</TableCell>
                          <TableCell>
                            {record.time_period === 'am' ? '上午' : '下午'}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                record.absence_type === 'truant'
                                  ? 'bg-red-100 text-red-800'
                                  : record.absence_type === 'leave'
                                    ? 'bg-blue-100 text-blue-800'
                                    : record.absence_type === 'leave_pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {record.absence_type === 'truant'
                                ? '旷课'
                                : record.absence_type === 'leave'
                                  ? '请假'
                                  : record.absence_type === 'leave_pending'
                                    ? '待审批'
                                    : '缺勤'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className='text-muted-foreground text-center'
                        >
                          暂无缺勤记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
