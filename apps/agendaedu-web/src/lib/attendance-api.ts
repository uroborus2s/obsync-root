import {
  ApiResponse,
  AttendanceDataQueryParams,
  AttendanceDetailRecord,
  AttendanceQueryParams,
  AttendanceRecord,
  AttendanceStats,
  CourseAttendanceDetail,
  CourseAttendanceStatsQuery,
  CourseAttendanceStatsResponse,
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
    // 开发环境使用本地API地址，生产环境使用kwps.jlufe.edu.cn
    this.baseUrl =
      baseUrl ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:8090'
        : 'https://kwps.jlufe.edu.cn')
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

  // ========== 数据库集成接口（所有数据从数据库获取） ==========

  /**
   * 获取课程考勤记录列表
   */
  async getCourseAttendanceRecords(
    params: AttendanceQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AttendanceRecord>>> {
    // 调用后端真实接口获取课程考勤数据
    const queryString = new URLSearchParams()

    if (params.xnxq) queryString.append('semester', params.xnxq)
    if (params.start_date) queryString.append('start_date', params.start_date)
    if (params.end_date) queryString.append('end_date', params.end_date)
    if (params.page) queryString.append('page', params.page.toString())
    if (params.page_size)
      queryString.append('page_size', params.page_size.toString())

    const endpoint = `/api/icalink/v1/attendance/stats/courses${queryString.toString() ? `?${queryString.toString()}` : ''}`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data) {
        // 转换数据格式为前端期望的格式
        const courseData = response.data.data || []
        const items: AttendanceRecord[] = courseData.map((course: any) => ({
          id: course.course_code,
          kkh: course.course_code,
          course_name: course.course_name,
          semester: course.semester,
          teacher_name: course.teacher_names,
          class_count: course.class_count,
          total_students: course.total_should_attend,
          attendance_count: course.actual_attended,
          attendance_rate: course.attendance_rate,
          last_class_time: course.last_class_time || new Date().toISOString(),
        }))

        return {
          success: true,
          message: '获取课程考勤记录成功',
          data: {
            items,
            total: response.data.total || items.length,
            page: response.data.page || 1,
            page_size: response.data.page_size || 20,
            total_pages: Math.ceil(
              (response.data.total || items.length) /
                (response.data.page_size || 20)
            ),
            has_next:
              (response.data.page || 1) * (response.data.page_size || 20) <
              (response.data.total || items.length),
            has_prev: (response.data.page || 1) > 1,
          },
        }
      }

      return {
        success: false,
        message: '获取课程考勤记录失败',
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
    } catch (error) {
      return {
        success: false,
        message: `获取课程考勤记录失败: ${error}`,
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
  }

  /**
   * 获取课程考勤详情
   */
  async getCourseAttendanceDetail(
    recordId: string
  ): Promise<ApiResponse<CourseAttendanceDetail>> {
    // 基于课程代码获取详细考勤信息
    const endpoint = `/api/icalink/v1/attendance/stats/courses?course_code=${recordId}&page_size=1`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data && response.data.data.length > 0) {
        const course = response.data.data[0]

        const detail: CourseAttendanceDetail = {
          course: {
            kcmc: course.course_name,
            kkh: course.course_code,
            xnxq: course.semester,
            rq:
              course.last_class_time || new Date().toISOString().split('T')[0],
            jc_s: '1-2',
            sj_f: '08:00',
            sj_t: '09:40',
            room_s: '',
            xm_s: course.teacher_names,
            status: 'finished' as any,
            course_start_time: '08:00',
            course_end_time: '09:40',
          },
          attendance_record: {
            id: course.course_code,
            kkh: course.course_code,
            xnxq: course.semester,
            rq:
              course.last_class_time || new Date().toISOString().split('T')[0],
            jc_s: '1-2',
            kcmc: course.course_name,
            sj_f: '08:00',
            sj_t: '09:40',
            sjd: 'am' as any,
            total_count: course.total_should_attend,
            checkin_count: course.actual_attended,
            absent_count: course.absent_count,
            leave_count: course.leave_count,
            status: 'closed' as any,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          student_attendances: [],
          stats: {
            total_count: course.total_should_attend,
            checkin_count: course.actual_attended,
            late_count: 0,
            absent_count: course.absent_count,
            leave_count: course.leave_count,
            attendance_rate: course.attendance_rate,
          },
        }

        return {
          success: true,
          message: '获取课程考勤详情成功',
          data: detail,
        }
      }

      return {
        success: false,
        message: '课程不存在或无考勤数据',
      }
    } catch (error) {
      return {
        success: false,
        message: `获取课程考勤详情失败: ${error}`,
      }
    }
  }

  /**
   * 获取课程历史考勤统计
   */
  async getCourseHistoricalStats(
    kkh: string,
    xnxq: string
  ): Promise<ApiResponse<HistoricalAttendanceRecord[]>> {
    // 调用课程统计接口获取历史数据
    const endpoint = `/api/icalink/v1/attendance/stats/courses?course_code=${kkh}&semester=${xnxq}&page_size=100`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data) {
        const historyData: HistoricalAttendanceRecord[] = (
          response.data.data || []
        ).map((course: any) => ({
          id: course.course_code,
          date: course.last_class_time || new Date().toISOString(),
          course_name: course.course_name,
          teacher_name: course.teacher_names,
          total_students: course.total_should_attend,
          attendance_count: course.actual_attended,
          attendance_rate: course.attendance_rate,
          semester: course.semester,
        }))

        return {
          success: true,
          message: '获取历史考勤统计成功',
          data: historyData,
        }
      }

      return {
        success: false,
        message: '获取历史考勤统计失败',
        data: [],
      }
    } catch (error) {
      return {
        success: false,
        message: `获取历史考勤统计失败: ${error}`,
        data: [],
      }
    }
  }

  // ========== 学生维度查询 ==========

  /**
   * 获取学生个人考勤统计
   */
  async getStudentPersonalStats(
    studentId: string,
    params?: Partial<AttendanceQueryParams>
  ): Promise<ApiResponse<StudentPersonalStats>> {
    // 调用学生统计接口获取个人统计数据
    const queryString = new URLSearchParams()
    queryString.append('student_id', studentId)

    if (params?.xnxq) queryString.append('semester', params.xnxq)
    if (params?.start_date) queryString.append('start_date', params.start_date)
    if (params?.end_date) queryString.append('end_date', params.end_date)
    queryString.append('page_size', '1')

    const endpoint = `/api/icalink/v1/attendance/stats/students?${queryString.toString()}`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data && response.data.data.length > 0) {
        const student = response.data.data[0]

        const stats: StudentPersonalStats = {
          student: {
            xh: student.student_id,
            xm: student.student_name,
            bjmc: student.class_name,
            zymc: student.major_name,
          },
          total_courses: student.course_count,
          present_count: student.actual_attended,
          leave_count: student.leave_count,
          absent_count: student.absent_count,
          attendance_rate: student.attendance_rate,
        }

        return {
          success: true,
          message: '获取学生个人统计成功',
          data: stats,
        }
      }

      return {
        success: false,
        message: '学生不存在或无考勤数据',
      }
    } catch (error) {
      return {
        success: false,
        message: `获取学生个人统计失败: ${error}`,
      }
    }
  }

  /**
   * 获取学生考勤记录列表
   */
  async getStudentAttendanceRecords(
    studentId: string,
    params?: AttendanceQueryParams
  ): Promise<ApiResponse<PaginatedResponse<StudentAttendanceRecord>>> {
    // 调用学生统计接口获取考勤记录
    const queryString = new URLSearchParams()
    queryString.append('student_id', studentId)

    if (params?.xnxq) queryString.append('semester', params.xnxq)
    if (params?.start_date) queryString.append('start_date', params.start_date)
    if (params?.end_date) queryString.append('end_date', params.end_date)
    if (params?.page) queryString.append('page', params.page.toString())
    if (params?.page_size)
      queryString.append('page_size', params.page_size.toString())

    const endpoint = `/api/icalink/v1/attendance/stats/students?${queryString.toString()}`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data) {
        const items: StudentAttendanceRecord[] = (response.data.data || []).map(
          (student: any) => ({
            id: student.student_id,
            student_id: student.student_id,
            student_name: student.student_name,
            course_name: '', // 需要从课程接口获取
            class_date: student.last_checkin_time || new Date().toISOString(),
            status:
              student.actual_attended > 0
                ? 'present'
                : student.leave_count > 0
                  ? 'leave'
                  : 'absent',
            checkin_time: student.last_checkin_time,
            attendance_rate: student.attendance_rate,
          })
        )

        return {
          success: true,
          message: '获取学生考勤记录成功',
          data: {
            items,
            total: response.data.total || items.length,
            page: response.data.page || 1,
            page_size: response.data.page_size || 20,
            total_pages: Math.ceil(
              (response.data.total || items.length) /
                (response.data.page_size || 20)
            ),
            has_next:
              (response.data.page || 1) * (response.data.page_size || 20) <
              (response.data.total || items.length),
            has_prev: (response.data.page || 1) > 1,
          },
        }
      }

      return {
        success: false,
        message: '获取学生考勤记录失败',
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
    } catch (error) {
      return {
        success: false,
        message: `获取学生考勤记录失败: ${error}`,
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
  }

  // ========== 统计维度查询 ==========

  /**
   * 获取课程维度出勤统计
   */
  async getCourseAttendanceStats(params?: {
    semester?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
    sort_by?: 'attendance_rate' | 'class_count' | 'last_class_time'
    sort_order?: 'asc' | 'desc'
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.semester) queryString.append('semester', params.semester)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
      if (params.sort_by) queryString.append('sort_by', params.sort_by)
      if (params.sort_order) queryString.append('sort_order', params.sort_order)
    }

    const endpoint = `/api/icalink/v1/attendance/stats/courses${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<any>>(endpoint)
  }

  /**
   * 获取教师维度出勤统计
   */
  async getTeacherAttendanceStats(params?: {
    semester?: string
    start_date?: string
    end_date?: string
    teacher_code?: string
    page?: number
    page_size?: number
    sort_by?: 'attendance_rate' | 'class_count' | 'course_count'
    sort_order?: 'asc' | 'desc'
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.semester) queryString.append('semester', params.semester)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
      if (params.teacher_code)
        queryString.append('teacher_code', params.teacher_code)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
      if (params.sort_by) queryString.append('sort_by', params.sort_by)
      if (params.sort_order) queryString.append('sort_order', params.sort_order)
    }

    const endpoint = `/api/icalink/v1/attendance/stats/teachers${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<any>>(endpoint)
  }

  /**
   * 获取学生维度出勤统计
   */
  async getStudentAttendanceStats(params?: {
    semester?: string
    start_date?: string
    end_date?: string
    course_code?: string
    student_id?: string
    page?: number
    page_size?: number
    sort_by?: 'attendance_rate' | 'course_count'
    sort_order?: 'asc' | 'desc'
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.semester) queryString.append('semester', params.semester)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
      if (params.course_code)
        queryString.append('course_code', params.course_code)
      if (params.student_id) queryString.append('student_id', params.student_id)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
      if (params.sort_by) queryString.append('sort_by', params.sort_by)
      if (params.sort_order) queryString.append('sort_order', params.sort_order)
    }

    const endpoint = `/api/icalink/v1/attendance/stats/students${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<any>>(endpoint)
  }

  /**
   * 获取整体出勤统计概览
   */
  async getOverallAttendanceStats(params?: {
    semester?: string
    start_date?: string
    end_date?: string
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.semester) queryString.append('semester', params.semester)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
    }

    const endpoint = `/api/icalink/v1/attendance/stats/overview${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<any>>(endpoint)
  }

  /**
   * 获取出勤率计算说明
   */
  async getAttendanceRateExplanation(): Promise<ApiResponse<any>> {
    const endpoint = `/api/icalink/v1/attendance/stats/explanation`
    return this.makeRequest<ApiResponse<any>>(endpoint)
  }

  /**
   * 获取学生出勤率排行榜
   */
  async getStudentAttendanceRankings(params?: {
    semester?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.semester) queryString.append('semester', params.semester)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
    }

    const endpoint = `/api/icalink/v1/attendance/stats/rankings/students${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<any>>(endpoint)
  }

  /**
   * 获取课程出勤率排行榜
   */
  async getCourseAttendanceRankings(params?: {
    semester?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.semester) queryString.append('semester', params.semester)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
    }

    const endpoint = `/api/icalink/v1/attendance/stats/rankings/courses${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<ApiResponse<any>>(endpoint)
  }

  /**
   * 获取整体考勤统计（使用学生统计接口聚合数据）
   * 注意：原 /api/icalink/v1/attendance/overall-stats 接口已废弃
   * 现改为调用 /api/icalink/v1/stats/student-stats 并在前端聚合数据
   */
  async getOverallStats(
    params?: Partial<AttendanceQueryParams>
  ): Promise<ApiResponse<AttendanceStats>> {
    const queryString = new URLSearchParams()

    // 映射参数：xnxq -> semester
    if (params) {
      if (params.xnxq) queryString.append('semester', params.xnxq)
      if (params.start_date) queryString.append('start_date', params.start_date)
      if (params.end_date) queryString.append('end_date', params.end_date)
    }

    // 获取足够多的数据用于统计（使用最大允许值100）
    queryString.append('page', '1')
    queryString.append('pageSize', '100')

    const endpoint = `/api/icalink/v1/stats/student-stats${queryString.toString() ? `?${queryString.toString()}` : ''}`

    try {
      const response = await this.makeRequest<any>(endpoint)

      if (response.success && response.data) {
        const studentStats = response.data.data || []
        const totalStudents = response.data.total || 0

        // 如果没有数据，返回空统计
        if (studentStats.length === 0) {
          return {
            success: true,
            message: '暂无统计数据',
            data: {
              total_courses: 0,
              class_size: 0,
              average_attendance_rate: 0,
              total_leave_count: 0,
              total_absent_count: 0,
            },
          }
        }

        // 聚合计算整体统计数据
        let totalSessions = 0
        let totalCompleted = 0
        let totalAbsent = 0
        let totalLeave = 0
        let totalTruant = 0

        studentStats.forEach((student: any) => {
          totalSessions += student.total_sessions || 0
          totalCompleted += student.completed_sessions || 0
          totalAbsent += student.absent_count || 0
          totalLeave += student.leave_count || 0
          totalTruant += student.truant_count || 0
        })

        // 计算平均出勤率
        const averageAttendanceRate =
          totalCompleted > 0
            ? (totalCompleted - totalAbsent) / totalCompleted
            : 0

        // 估算课程数（基于总课节数和平均每门课的课节数）
        // 假设每门课平均有 16 个课节（一学期）
        const estimatedCourses = Math.ceil(totalSessions / 16)

        return {
          success: true,
          message: '获取整体统计成功',
          data: {
            total_courses: estimatedCourses,
            class_size: totalStudents,
            average_attendance_rate: averageAttendanceRate,
            total_leave_count: totalLeave,
            total_absent_count: totalAbsent,
          },
        }
      }

      return {
        success: false,
        message: response.message || '获取统计数据失败',
        data: null,
      }
    } catch (error) {
      console.error('获取整体统计失败:', error)
      return {
        success: false,
        message: `获取统计数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        data: null,
      }
    }
  }

  /**
   * 获取班级考勤排名
   */
  async getClassAttendanceRanking(params: {
    xnxq?: string
    kkh?: string
    bjmc?: string
    limit?: number
  }): Promise<ApiResponse<StudentPersonalStats[]>> {
    // 调用学生排行榜接口获取班级排名数据
    const queryString = new URLSearchParams()

    if (params.xnxq) queryString.append('semester', params.xnxq)
    if (params.limit) queryString.append('page_size', params.limit.toString())
    else queryString.append('page_size', '50') // 默认50条

    const endpoint = `/api/icalink/v1/attendance/stats/rankings/students?${queryString.toString()}`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data) {
        const rankings: StudentPersonalStats[] = (response.data.data || []).map(
          (ranking: any) => ({
            student_id: ranking.id,
            student_name: ranking.name,
            class_name: ranking.extra_info?.split(' - ')[0] || '',
            major_name: ranking.extra_info?.split(' - ')[1] || '',
            total_courses: ranking.total_count,
            total_classes: ranking.total_count,
            attendance_count: Math.round(
              (ranking.total_count * ranking.attendance_rate) / 100
            ),
            leave_count: 0, // 排行榜接口中没有详细数据
            absent_count:
              ranking.total_count -
              Math.round((ranking.total_count * ranking.attendance_rate) / 100),
            attendance_rate: ranking.attendance_rate,
            last_checkin_time: null,
          })
        )

        // 如果指定了班级名称，进行过滤
        let filteredRankings = rankings
        if (params.bjmc) {
          filteredRankings = rankings.filter((student) =>
            student.student.bjmc?.includes(params.bjmc || '')
          )
        }

        return {
          success: true,
          message: '获取班级排名成功',
          data: filteredRankings,
        }
      }

      return {
        success: false,
        message: '获取班级排名失败',
        data: [],
      }
    } catch (error) {
      return {
        success: false,
        message: `获取班级排名失败: ${error}`,
        data: [],
      }
    }
  }

  /**
   * 导出考勤数据（兼容现有代码）
   */
  async exportAttendanceData(
    params: AttendanceQueryParams & { format?: 'xlsx' | 'csv' }
  ): Promise<Blob> {
    const queryString = new URLSearchParams()

    if (params.xnxq) queryString.append('xnxq', params.xnxq)
    if (params.start_date) queryString.append('start_date', params.start_date)
    if (params.end_date) queryString.append('end_date', params.end_date)
    if (params.format) queryString.append('format', params.format)

    const url = `${this.baseUrl}/api/icalink/v1/attendance/export${queryString.toString() ? `?${queryString.toString()}` : ''}`

    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 处理401未授权错误
    if (response.status === 401) {
      this.handleUnauthorized()
      throw new Error('需要重新授权')
    }

    if (!response.ok) {
      throw new Error(`导出失败: ${response.status} ${response.statusText}`)
    }

    return await response.blob()
  }

  /**
   * 搜索学生
   */
  async searchStudents(
    query: string
  ): Promise<ApiResponse<StudentPersonalStats[]>> {
    // 通过学生统计接口搜索学生
    const queryString = new URLSearchParams()
    queryString.append('page_size', '20') // 限制搜索结果数量

    // 这里可以根据查询条件调用不同接口
    // 暂时调用学生排行榜接口获取学生列表，然后在前端过滤
    const endpoint = `/api/icalink/v1/attendance/stats/rankings/students?${queryString.toString()}`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data) {
        const allStudents: StudentPersonalStats[] = (
          response.data.data || []
        ).map((ranking: any) => ({
          student_id: ranking.id,
          student_name: ranking.name,
          class_name: ranking.extra_info?.split(' - ')[0] || '',
          major_name: ranking.extra_info?.split(' - ')[1] || '',
          total_courses: ranking.total_count,
          total_classes: ranking.total_count,
          attendance_count: Math.round(
            (ranking.total_count * ranking.attendance_rate) / 100
          ),
          leave_count: 0,
          absent_count:
            ranking.total_count -
            Math.round((ranking.total_count * ranking.attendance_rate) / 100),
          attendance_rate: ranking.attendance_rate,
          last_checkin_time: null,
        }))

        // 前端过滤搜索结果
        const filteredStudents = allStudents.filter(
          (student) =>
            student.student.xm.includes(query) ||
            student.student.xh.includes(query) ||
            (student.student.bjmc && student.student.bjmc.includes(query)) ||
            (student.student.zymc && student.student.zymc.includes(query))
        )

        return {
          success: true,
          message: '搜索学生成功',
          data: filteredStudents.slice(0, 10), // 限制返回前10条结果
        }
      }

      return {
        success: false,
        message: '搜索学生失败',
        data: [],
      }
    } catch (error) {
      return {
        success: false,
        message: `搜索学生失败: ${error}`,
        data: [],
      }
    }
  }

  /**
   * 搜索课程
   */
  async searchCourses(query: string): Promise<ApiResponse<AttendanceRecord[]>> {
    // 通过课程统计接口搜索课程
    const queryString = new URLSearchParams()
    queryString.append('page_size', '20') // 限制搜索结果数量

    const endpoint = `/api/icalink/v1/attendance/stats/courses?${queryString.toString()}`

    try {
      const response = await this.makeRequest<ApiResponse<any>>(endpoint)

      if (response.success && response.data) {
        const allCourses: AttendanceRecord[] = (response.data.data || []).map(
          (course: any) => ({
            id: course.course_code,
            kkh: course.course_code,
            course_name: course.course_name,
            semester: course.semester,
            teacher_name: course.teacher_names,
            class_count: course.class_count,
            total_students: course.total_should_attend,
            attendance_count: course.actual_attended,
            attendance_rate: course.attendance_rate,
            last_class_time: course.last_class_time || new Date().toISOString(),
          })
        )

        // 前端过滤搜索结果
        const filteredCourses = allCourses.filter(
          (course) => course.kcmc.includes(query) || course.kkh.includes(query)
        )

        return {
          success: true,
          message: '搜索课程成功',
          data: filteredCourses.slice(0, 10), // 限制返回前10条结果
        }
      }

      return {
        success: false,
        message: '搜索课程失败',
        data: [],
      }
    } catch (error) {
      return {
        success: false,
        message: `搜索课程失败: ${error}`,
        data: [],
      }
    }
  }

  // ========== 课程维度签到统计接口 ==========

  /**
   * 获取课程维度签到统计（新接口）
   * 对应后端 /api/icalink/v1/attendance/course-statistics 接口
   */
  async getCourseAttendanceStatistics(
    params?: CourseAttendanceStatsQuery
  ): Promise<ApiResponse<CourseAttendanceStatsResponse>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.semester) queryString.append('semester', params.semester)
      if (params.start_time) queryString.append('start_time', params.start_time)
      if (params.end_time) queryString.append('end_time', params.end_time)
      if (params.teacher_code)
        queryString.append('teacher_code', params.teacher_code)
      if (params.course_name)
        queryString.append('course_name', params.course_name)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
      if (params.sort_by) queryString.append('sort_by', params.sort_by)
      if (params.sort_order) queryString.append('sort_order', params.sort_order)
    }

    const endpoint = `/api/icalink/v1/attendance/course-statistics${queryString.toString() ? `?${queryString.toString()}` : ''}`

    try {
      const response =
        await this.makeRequest<ApiResponse<CourseAttendanceStatsResponse>>(
          endpoint
        )

      if (response.success && response.data) {
        return {
          success: true,
          message: '获取课程维度签到统计成功',
          data: response.data,
        }
      }

      return {
        success: false,
        message: response.message || '获取课程维度签到统计失败',
        data: {
          data: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `获取课程维度签到统计失败: ${error}`,
        data: {
          data: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      }
    }
  }

  /**
   * 获取失败的签到队列任务
   * @param page 页码
   * @param pageSize 每页数量
   */
  async getFailedCheckinJobs(
    page: number = 1,
    pageSize: number = 20
  ): Promise<
    ApiResponse<{
      total: number
      page: number
      pageSize: number
      data: Array<{
        id: string
        data: any
        failedReason: string
        processedOn: number
      }>
    }>
  > {
    const queryString = new URLSearchParams()
    queryString.append('page', page.toString())
    queryString.append('pageSize', pageSize.toString())

    const endpoint = `/api/icalink/v1/attendance/failed-checkin-jobs?${queryString.toString()}`
    return this.makeRequest<
      ApiResponse<{
        total: number
        page: number
        pageSize: number
        data: Array<{
          id: string
          data: any
          failedReason: string
          processedOn: number
        }>
      }>
    >(endpoint)
  }
}

// 导出单例实例
export const attendanceApi = new AttendanceApiService('http://localhost:8090')
