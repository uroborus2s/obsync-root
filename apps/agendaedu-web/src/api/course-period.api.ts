/**
 * 课程时间表配置API服务
 */
import type {
  ApiResponse,
  CourseContext,
  CoursePeriod,
  CoursePeriodRuleWithConditions,
  CoursePeriodWithRules,
  NewCoursePeriod,
  NewCoursePeriodRule,
  NewCoursePeriodRuleCondition,
  NewSystemConfigTerm,
  PeriodTimeResult,
  SystemConfigTerm,
  UpdateCoursePeriod,
  UpdateCoursePeriodRule,
  UpdateSystemConfigTerm,
} from '@/types/course-period.types'
import { apiClient } from '@/lib/api-client'

// ==================== 学期管理 API ====================

/**
 * 获取所有学期
 */
export async function getAllTerms(): Promise<SystemConfigTerm[]> {
  const response = await apiClient.get<ApiResponse<SystemConfigTerm[]>>(
    '/api/icalink/v1/course-periods/terms'
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取学期列表失败')
  }
  return response.data
}

/**
 * 获取当前激活学期
 */
export async function getActiveTerm(): Promise<SystemConfigTerm | null> {
  const response = await apiClient.get<ApiResponse<SystemConfigTerm | null>>(
    '/api/icalink/v1/course-periods/terms/active'
  )
  if (!response.success) {
    throw new Error(response.message || '获取当前学期失败')
  }
  return response.data || null
}

/**
 * 创建学期
 */
export async function createTerm(term: NewSystemConfigTerm): Promise<number> {
  const response = await apiClient.post<ApiResponse<number>>(
    '/api/icalink/v1/course-periods/terms',
    term
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '创建学期失败')
  }
  return response.data
}

/**
 * 更新学期
 */
export async function updateTerm(
  id: number,
  term: UpdateSystemConfigTerm
): Promise<boolean> {
  const response = await apiClient.put<ApiResponse<boolean>>(
    `/api/icalink/v1/course-periods/terms/${id}`,
    term
  )
  if (!response.success) {
    throw new Error(response.message || '更新学期失败')
  }
  return response.data || false
}

/**
 * 删除学期
 */
export async function deleteTerm(id: number): Promise<boolean> {
  const response = await apiClient.delete<ApiResponse<boolean>>(
    `/api/icalink/v1/course-periods/terms/${id}`
  )
  if (!response.success) {
    throw new Error(response.message || '删除学期失败')
  }
  return response.data || false
}

/**
 * 设置为当前学期
 */
export async function setActiveTerm(id: number): Promise<boolean> {
  const response = await apiClient.post<ApiResponse<boolean>>(
    `/api/icalink/v1/course-periods/terms/${id}/activate`
  )
  if (!response.success) {
    throw new Error(response.message || '设置当前学期失败')
  }
  return response.data || false
}

// ==================== 课节管理 API ====================

/**
 * 获取学期的所有课节
 */
export async function getPeriodsByTerm(
  termId: number
): Promise<CoursePeriod[]> {
  const response = await apiClient.get<ApiResponse<CoursePeriod[]>>(
    `/api/icalink/v1/course-periods/periods?term_id=${termId}`
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取课节列表失败')
  }
  return response.data
}

/**
 * 获取课节及其规则
 */
export async function getPeriodsWithRules(
  termId: number
): Promise<CoursePeriodWithRules[]> {
  const response = await apiClient.get<ApiResponse<CoursePeriodWithRules[]>>(
    `/api/icalink/v1/course-periods/periods-with-rules?term_id=${termId}`
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取课节及规则失败')
  }
  return response.data
}

/**
 * 创建课节
 */
export async function createPeriod(period: NewCoursePeriod): Promise<number> {
  const response = await apiClient.post<ApiResponse<number>>(
    '/api/icalink/v1/course-periods/periods',
    period
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '创建课节失败')
  }
  return response.data
}

/**
 * 更新课节
 */
export async function updatePeriod(
  id: number,
  period: UpdateCoursePeriod
): Promise<boolean> {
  const response = await apiClient.put<ApiResponse<boolean>>(
    `/api/icalink/v1/course-periods/periods/${id}`,
    period
  )
  if (!response.success) {
    throw new Error(response.message || '更新课节失败')
  }
  return response.data || false
}

/**
 * 删除课节
 */
export async function deletePeriod(id: number): Promise<boolean> {
  const response = await apiClient.delete<ApiResponse<boolean>>(
    `/api/icalink/v1/course-periods/periods/${id}`
  )
  if (!response.success) {
    throw new Error(response.message || '删除课节失败')
  }
  return response.data || false
}

/**
 * 批量创建课节
 */
export async function batchCreatePeriods(
  periods: NewCoursePeriod[]
): Promise<number[]> {
  const response = await apiClient.post<ApiResponse<number[]>>(
    '/api/icalink/v1/course-periods/periods/batch',
    { periods }
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '批量创建课节失败')
  }
  return response.data
}

/**
 * 复制课节到新学期
 */
export async function copyPeriodsToTerm(
  sourceTermId: number,
  targetTermId: number
): Promise<number> {
  const response = await apiClient.post<ApiResponse<number>>(
    '/api/icalink/v1/course-periods/periods/copy',
    { sourceTermId, targetTermId }
  )
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || '复制课节失败')
  }
  return response.data
}

// ==================== 规则管理 API ====================

/**
 * 获取课节的所有规则
 */
export async function getRulesByPeriod(
  periodId: number
): Promise<CoursePeriodRuleWithConditions[]> {
  const response = await apiClient.get<
    ApiResponse<CoursePeriodRuleWithConditions[]>
  >(`/api/icalink/v1/course-periods/rules?period_id=${periodId}`)
  if (!response.success || !response.data) {
    throw new Error(response.message || '获取规则列表失败')
  }
  return response.data
}

/**
 * 创建规则（包含条件）
 */
export async function createRule(
  rule: NewCoursePeriodRule,
  conditions: NewCoursePeriodRuleCondition[]
): Promise<number> {
  const response = await apiClient.post<ApiResponse<number>>(
    '/api/icalink/v1/course-periods/rules',
    { rule, conditions }
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '创建规则失败')
  }
  return response.data
}

/**
 * 更新规则（包含条件）
 */
export async function updateRule(
  id: number,
  rule: UpdateCoursePeriodRule,
  conditions?: NewCoursePeriodRuleCondition[]
): Promise<boolean> {
  const response = await apiClient.put<ApiResponse<boolean>>(
    `/api/icalink/v1/course-periods/rules/${id}`,
    { rule, conditions }
  )
  if (!response.success) {
    throw new Error(response.message || '更新规则失败')
  }
  return response.data || false
}

/**
 * 删除规则
 */
export async function deleteRule(id: number): Promise<boolean> {
  const response = await apiClient.delete<ApiResponse<boolean>>(
    `/api/icalink/v1/course-periods/rules/${id}`
  )
  if (!response.success) {
    throw new Error(response.message || '删除规则失败')
  }
  return response.data || false
}

// ==================== 条件匹配 API ====================

/**
 * 匹配课节时间
 */
export async function matchCoursePeriodTime(
  termId: number,
  periodNo: number,
  courseContext: CourseContext
): Promise<PeriodTimeResult> {
  const response = await apiClient.post<ApiResponse<PeriodTimeResult>>(
    '/api/icalink/v1/course-periods/match',
    { term_id: termId, period_no: periodNo, course_context: courseContext }
  )
  if (!response.success || !response.data) {
    throw new Error(response.message || '匹配课节时间失败')
  }
  return response.data
}

/**
 * 批量匹配课节时间
 */
export async function batchMatchCoursePeriodTimes(
  termId: number,
  periodNos: number[],
  courseContext: CourseContext
): Promise<Map<number, PeriodTimeResult>> {
  const response = await apiClient.post<
    ApiResponse<Record<number, PeriodTimeResult>>
  >('/api/icalink/v1/course-periods/batch-match', {
    term_id: termId,
    period_nos: periodNos,
    course_context: courseContext,
  })
  if (!response.success || !response.data) {
    throw new Error(response.message || '批量匹配课节时间失败')
  }
  return new Map(Object.entries(response.data).map(([k, v]) => [Number(k), v]))
}
