import {
  ApiResponse,
  AttendanceDataQueryParams,
  AttendanceDetailRecord,
  AttendanceQueryParams,
  AttendanceRecord,
  AttendanceStats,
  CourseAttendanceDetail,
  DataQueryParams,
  DataQueryRecord,
  HistoricalAttendanceRecord,
  PaginatedResponse,
  StudentAttendanceRecord,
  StudentPersonalStats,
  TaskDetail,
  TaskListQueryParams,
} from '@/types/attendance.types'

/**
 * 考勤API服务类
 * 提供所有考勤相关的API调用方法，对接icalink-sync服务
 */
export class AttendanceApiService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    // 统一使用kwps.jlufe.edu.cn的API地址
    this.baseUrl = baseUrl || 'https://kwps.jlufe.edu.cn'
  }

  /**
   * 创建请求配置，包含401错误处理和自动重定向
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      // 处理401未授权错误
      if (response.status === 401) {
        this.handleUnauthorized()
        throw new Error('需要重新授权')
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败: ${response.status} ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络连接')
      }
      throw error
    }
  }

  /**
   * 处理401未授权响应 - 使用统一的认证管理器重定向到WPS授权页面
   */
  private handleUnauthorized(): void {
    // 动态导入认证管理器以避免循环依赖
    import('./gateway-auth-manager')
      .then(({ authManager }) => {
        // 保存当前页面URL，授权后返回
        const currentUrl = window.location.href

        // 使用统一的认证管理器进行重定向
        authManager.redirectToAuth(currentUrl)
      })
      .catch((error) => {
        console.error('Failed to load auth manager:', error)
        // 降级处理：直接使用配置文件的重定向方法
        import('@/config/wps-auth-config').then(({ redirectToWpsAuth }) => {
          redirectToWpsAuth(window.location.href)
        })
      })
  }

  // ========== 新的数据查询接口 ==========

  /**
   * 按条件查询出勤数据
   */
  async queryAttendanceData(
    params: AttendanceDataQueryParams
  ): Promise<ApiResponse<PaginatedResponse<DataQueryRecord>>> {
    const query = new URLSearchParams()
    if (params.student_id) query.append('student_id', params.student_id)
    if (params.teacher_id) query.append('teacher_id', params.teacher_id)
    if (params.kkh) query.append('kkh', params.kkh)
    if (params.xnxq) query.append('xnxq', params.xnxq)
    if (params.status && params.status !== 'all')
      query.append('status', params.status)
    if (params.page) query.append('page', params.page.toString())
    if (params.page_size) query.append('page_size', params.page_size.toString())
    if (params.start_date) query.append('start_date', params.start_date)
    if (params.end_date) query.append('end_date', params.end_date)

    const response = await fetch(
      `${this.baseUrl}/api/v1/attendance/data?${query}`
    )
    if (!response.ok) {
      throw new Error('网络响应错误')
    }
    return response.json()
  }

  async queryData(
    params: DataQueryParams
  ): Promise<{ records: DataQueryRecord[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/apiv2/attendance/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || '获取数据失败')
    }

    const result = await response.json()
    // Assuming the API returns { success: boolean, data: { records: [], total: number } }
    return result.data
  }

  // ========== 任务列表相关接口 ==========

  /**
   * 获取任务列表（课程安排）
   * 对应后端 /apiv2/tasks 接口
   */
  async getTaskList(
    params?: TaskListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<TaskDetail>>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.teacher_id) queryString.append('teacher_id', params.teacher_id)
      if (params.student_id) queryString.append('student_id', params.student_id)
      if (params.xnxq) queryString.append('xnxq', params.xnxq)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
      if (params.status) queryString.append('status', params.status)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
    }

    const endpoint = `/apiv2/tasks${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<PaginatedResponse<TaskDetail>>>(
      endpoint
    )
  }

  /**
   * 获取任务详情
   * 对应后端 /apiv2/tasks/:task_id 接口
   */
  async getTaskDetail(taskId: string): Promise<ApiResponse<TaskDetail>> {
    return this.makeRequest<ApiResponse<TaskDetail>>(`/apiv2/tasks/${taskId}`)
  }

  // ========== 打卡数据相关接口 ==========

  /**
   * 获取打卡记录列表
   * 对应后端 /apiv2/attendance-data 接口
   */
  async getAttendanceData(
    params?: AttendanceDataQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AttendanceDetailRecord>>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.attendance_record_id)
        queryString.append('attendance_record_id', params.attendance_record_id)
      if (params.kkh) queryString.append('kkh', params.kkh)
      if (params.xnxq) queryString.append('xnxq', params.xnxq)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
      if (params.student_id) queryString.append('student_id', params.student_id)
      if (params.teacher_id) queryString.append('teacher_id', params.teacher_id)
      if (params.status) queryString.append('status', params.status)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
    }

    const endpoint = `/apiv2/attendance-data${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<
      ApiResponse<PaginatedResponse<AttendanceDetailRecord>>
    >(endpoint)
  }

  /**
   * 获取考勤统计信息
   * 对应后端 /apiv2/attendance-stats 接口
   */
  async getAttendanceStats(params?: {
    xnxq?: string
    start_date?: string
    end_date?: string
  }): Promise<ApiResponse<AttendanceStats>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.xnxq) queryString.append('xnxq', params.xnxq)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
    }

    const endpoint = `/apiv2/attendance-stats${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<AttendanceStats>>(endpoint)
  }

  // ========== 兼容性接口（返回模拟数据） ==========

  /**
   * 获取课程考勤记录列表（兼容现有代码）
   */
  async getCourseAttendanceRecords(
    _params: AttendanceQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AttendanceRecord>>> {
    // 返回模拟数据结构，实际使用时建议直接调用 getTaskList
    return {
      success: true,
      message: '请使用 getTaskList 方法获取任务列表',
      data: {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
        has_next: false,
        has_prev: false,
      },
    }
  }

  /**
   * 获取课程考勤详情（兼容现有代码）
   */
  async getCourseAttendanceDetail(
    _recordId: string
  ): Promise<ApiResponse<CourseAttendanceDetail>> {
    // 返回模拟数据结构，实际使用时建议直接调用 getTaskDetail
    throw new Error(
      '请使用 getTaskDetail 和 getAttendanceData 方法获取详细信息'
    )
  }

  /**
   * 获取课程历史考勤统计（兼容现有代码）
   */
  async getCourseHistoricalStats(
    _kkh: string,
    _xnxq: string
  ): Promise<ApiResponse<HistoricalAttendanceRecord[]>> {
    // 返回模拟数据结构，实际使用时建议直接调用 getTaskList
    throw new Error('请使用 getTaskList 方法获取历史数据')
  }

  // ========== 学生维度查询 ==========

  /**
   * 获取学生个人考勤统计（兼容现有代码）
   */
  async getStudentPersonalStats(
    _studentId: string,
    _params?: Partial<AttendanceQueryParams>
  ): Promise<ApiResponse<StudentPersonalStats>> {
    // 返回模拟数据结构，实际使用时建议直接调用 getAttendanceData
    throw new Error('请使用 getAttendanceData 方法获取学生考勤数据')
  }

  /**
   * 获取学生考勤记录列表（兼容现有代码）
   */
  async getStudentAttendanceRecords(
    _studentId: string,
    _params?: AttendanceQueryParams
  ): Promise<ApiResponse<PaginatedResponse<StudentAttendanceRecord>>> {
    // 返回模拟数据结构，实际使用时建议直接调用 getAttendanceData
    throw new Error('请使用 getAttendanceData 方法获取学生考勤记录')
  }

  // ========== 统计维度查询 ==========

  /**
   * 获取整体考勤统计（兼容现有代码）
   */
  async getOverallStats(
    params?: Partial<AttendanceQueryParams>
  ): Promise<ApiResponse<AttendanceStats>> {
    return this.getAttendanceStats({
      xnxq: params?.xnxq,
      start_date: params?.start_date,
      end_date: params?.end_date,
    })
  }

  /**
   * 获取班级考勤排名（兼容现有代码）
   */
  async getClassAttendanceRanking(_params: {
    xnxq?: string
    kkh?: string
    bjmc?: string
    limit?: number
  }): Promise<ApiResponse<StudentPersonalStats[]>> {
    throw new Error('班级考勤排名功能需要后端实现专门接口')
  }

  /**
   * 导出考勤数据（兼容现有代码）
   */
  async exportAttendanceData(
    _params: AttendanceQueryParams & { format?: 'xlsx' | 'csv' }
  ): Promise<Blob> {
    throw new Error('考勤数据导出功能需要后端实现专门接口')
  }

  /**
   * 搜索学生（兼容现有代码）
   */
  async searchStudents(
    _query: string
  ): Promise<ApiResponse<StudentPersonalStats[]>> {
    throw new Error('学生搜索功能需要后端实现专门接口')
  }

  /**
   * 搜索课程（兼容现有代码）
   */
  async searchCourses(
    _query: string
  ): Promise<ApiResponse<AttendanceRecord[]>> {
    throw new Error('课程搜索功能需要后端实现专门接口')
  }
}

// 导出单例实例
export const attendanceApi = new AttendanceApiService()
