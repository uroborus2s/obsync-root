/**
 * 课程时间表配置相关类型定义
 */

// ==================== 数据库表类型 ====================

/**
 * 学期配置
 */
export interface SystemConfigTerm {
  id: number
  term_code: string
  name: string
  start_date: string // YYYY-MM-DD
  end_date: string | null // YYYY-MM-DD
  is_active: boolean
  remark: string | null
  created_at: string
  updated_at: string
}

/**
 * 新增学期
 */
export interface NewSystemConfigTerm {
  term_code: string
  name: string
  start_date: string
  end_date?: string | null
  is_active?: boolean
  remark?: string | null
}

/**
 * 更新学期
 */
export interface UpdateSystemConfigTerm {
  term_code?: string
  name?: string
  start_date?: string
  end_date?: string | null
  is_active?: boolean
  remark?: string | null
}

/**
 * 课节默认时间配置
 */
export interface CoursePeriod {
  id: number
  term_id: number
  period_no: number
  name: string | null
  default_start_time: string // HH:mm:ss
  default_end_time: string // HH:mm:ss
  is_active: boolean
  remark: string | null
  created_at: string
  updated_at: string
}

/**
 * 新增课节
 */
export interface NewCoursePeriod {
  term_id: number
  period_no: number
  name?: string | null
  default_start_time: string
  default_end_time: string
  is_active?: boolean
  remark?: string | null
}

/**
 * 更新课节
 */
export interface UpdateCoursePeriod {
  period_no?: number
  name?: string | null
  default_start_time?: string
  default_end_time?: string
  is_active?: boolean
  remark?: string | null
}

/**
 * 课节规则
 */
export interface CoursePeriodRule {
  id: number
  period_id: number
  priority: number
  rule_name: string | null
  start_time: string // HH:mm:ss
  end_time: string // HH:mm:ss
  effective_start_date: string | null // YYYY-MM-DD
  effective_end_date: string | null // YYYY-MM-DD
  enabled: boolean
  remark: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

/**
 * 新增规则
 */
export interface NewCoursePeriodRule {
  period_id: number
  priority: number
  rule_name?: string | null
  start_time: string
  end_time: string
  effective_start_date?: string | null
  effective_end_date?: string | null
  enabled?: boolean
  remark?: string | null
  created_by?: string | null
}

/**
 * 更新规则
 */
export interface UpdateCoursePeriodRule {
  priority?: number
  rule_name?: string | null
  start_time?: string
  end_time?: string
  effective_start_date?: string | null
  effective_end_date?: string | null
  enabled?: boolean
  remark?: string | null
  updated_by?: string | null
}

/**
 * 条件运算符
 */
export type ConditionOperator =
  | '='
  | '!='
  | 'in'
  | 'not_in'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'between'

/**
 * 条件组连接符
 */
export type GroupConnector = 'AND' | 'OR'

/**
 * 条件维度
 */
export type ConditionDimension =
  | 'school_name'
  | 'school_id'
  | 'major_name'
  | 'major_id'
  | 'class_name'
  | 'class_id'
  | 'grade'
  | 'course_unit'
  | 'course_unit_id'
  | 'class_location'
  | 'teaching_week'
  | 'week_day'
  | 'time_period'

/**
 * 条件值（JSON格式）
 */
export interface ConditionValue {
  value?:
    | string
    | number
    | string[]
    | number[]
    | { min: string | number; max: string | number } // 单值或复杂值
  values?: Array<
    string | number | { min: string | number; max: string | number }
  > // 多值（用于 in, not_in）
  min?: string | number // 最小值（用于 between）
  max?: string | number // 最大值（用于 between）
  pattern?: string // 模糊匹配模式（用于 like）
}

/**
 * 规则条件
 */
export interface CoursePeriodRuleCondition {
  id: number
  rule_id: number
  group_no: number
  group_connector: GroupConnector
  dimension: ConditionDimension
  operator: ConditionOperator
  value_json: ConditionValue
  created_at: string
  updated_at: string
}

/**
 * 新增条件
 */
export interface NewCoursePeriodRuleCondition {
  rule_id: number
  group_no: number
  group_connector: GroupConnector
  dimension: ConditionDimension
  operator: ConditionOperator
  value_json: ConditionValue
}

/**
 * 更新条件
 */
export interface UpdateCoursePeriodRuleCondition {
  group_no?: number
  group_connector?: GroupConnector
  dimension?: ConditionDimension
  operator?: ConditionOperator
  value_json?: ConditionValue
}

// ==================== 业务类型 ====================

/**
 * 规则及其条件（用于展示和编辑）
 */
export interface CoursePeriodRuleWithConditions {
  rule: CoursePeriodRule
  conditions: CoursePeriodRuleCondition[]
}

/**
 * 课节及其规则（用于展示）
 */
export interface CoursePeriodWithRules {
  period: CoursePeriod
  rules: CoursePeriodRuleWithConditions[]
}

/**
 * 课程上下文（用于条件匹配）
 */
export interface CourseContext {
  school_id?: string
  school_name?: string
  major_id?: string
  major_name?: string
  class_id?: string
  class_name?: string
  grade?: string
  course_unit_id?: string
  course_unit?: string
  class_location?: string
  teaching_week?: number
  week_day?: number
  time_period?: 'am' | 'pm'
}

/**
 * 课节时间结果（条件匹配后的结果）
 */
export interface PeriodTimeResult {
  period_no: number
  start_time: string // HH:mm:ss
  end_time: string // HH:mm:ss
  source: 'default' | 'rule' // 时间来源
  rule_id?: number // 如果是规则，记录规则ID
  rule_name?: string // 规则名称
}

// ==================== 表单类型 ====================

/**
 * 学期表单数据
 */
export interface TermFormData {
  term_code: string
  name: string
  start_date: Date | null
  end_date: Date | null
  is_active: boolean
  remark: string
}

/**
 * 课节表单数据
 */
export interface PeriodFormData {
  period_no: number
  name: string
  default_start_time: string // HH:mm
  default_end_time: string // HH:mm
  is_active: boolean
  remark: string
}

/**
 * 规则表单数据
 */
export interface RuleFormData {
  rule_name: string
  priority: number
  start_time: string // HH:mm
  end_time: string // HH:mm
  effective_start_date: Date | null
  effective_end_date: Date | null
  enabled: boolean
  remark: string
  conditions: ConditionGroupFormData[]
}

/**
 * 条件组表单数据
 */
export interface ConditionGroupFormData {
  group_no: number
  group_connector: GroupConnector
  conditions: ConditionFormData[]
}

/**
 * 条件表单数据
 */
export interface ConditionFormData {
  dimension: ConditionDimension | ''
  operator: ConditionOperator | ''
  value:
    | string
    | number
    | string[]
    | number[]
    | Array<string | number | { min: string | number; max: string | number }>
    | { min: string | number; max: string | number }
}

// ==================== API 响应类型 ====================

/**
 * API 响应基础类型
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  code?: string
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
