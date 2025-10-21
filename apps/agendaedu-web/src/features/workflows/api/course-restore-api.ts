/**
 * 课表重建 API 服务
 */
import { apiClient } from '@/lib/api-client'

export interface CourseRestoreRequest {
  /** 学号或工号 */
  xgh: string
  /** 用户类型：student（学生）或 teacher（教师） */
  userType: 'student' | 'teacher'
  /** 学年学期，格式：YYYY-YYYY-S（如：2024-2025-1） */
  xnxq?: string
  /** 是否为测试运行模式，默认false */
  dryRun?: boolean
}

export interface CourseRestoreInstance {
  instanceId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  userType: 'student' | 'teacher'
  xgh: string
  xnxq?: string
  startTime: string
  endTime?: string
  totalCourses?: number
  successCount?: number
  failureCount?: number
  executionTime?: number
  errors?: string[]
}

export interface CourseRestoreInstancesResponse {
  items: CourseRestoreInstance[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CourseRestoreStartResponse {
  instanceId: string
  status: string
  workflowName: string
  config: {
    xgh: string
    userType: string
    xnxq?: string
    dryRun: boolean
  }
  details?: any
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errorDetails?: any
  timestamp: string
}

export class CourseRestoreApiService {
  private readonly baseUrl = '/api/workflows/icasync/course-restore'

  /**
   * 启动课表重建工作流
   */
  async startCourseRestore(request: CourseRestoreRequest): Promise<CourseRestoreStartResponse> {
    const response = await apiClient.post<ApiResponse<CourseRestoreStartResponse>>(
      `${this.baseUrl}/start`,
      request
    )

    if (!response.success) {
      throw new Error(response.error || '启动课表重建工作流失败')
    }

    return response.data!
  }

  /**
   * 获取课表重建工作流实例列表
   */
  async getCourseRestoreInstances(params?: {
    status?: 'pending' | 'running' | 'completed' | 'failed'
    userType?: 'student' | 'teacher'
    xgh?: string
    page?: number
    pageSize?: number
  }): Promise<CourseRestoreInstancesResponse> {
    const queryParams = new URLSearchParams()

    if (params?.status) queryParams.append('status', params.status)
    if (params?.userType) queryParams.append('userType', params.userType)
    if (params?.xgh) queryParams.append('xgh', params.xgh)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())

    const url = `${this.baseUrl}/instances${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiClient.get<ApiResponse<CourseRestoreInstancesResponse>>(url)

    if (!response.success) {
      throw new Error(response.error || '获取课表重建工作流实例列表失败')
    }

    return response.data!
  }

  /**
   * 获取课表重建工作流实例详情
   */
  async getCourseRestoreInstance(instanceId: string): Promise<CourseRestoreInstance> {
    const response = await apiClient.get<ApiResponse<{ instance: CourseRestoreInstance }>>(
      `${this.baseUrl}/instances/${instanceId}`
    )

    if (!response.success) {
      throw new Error(response.error || '获取课表重建工作流实例详情失败')
    }

    return response.data!.instance
  }
}

// 导出单例实例
export const courseRestoreApi = new CourseRestoreApiService()