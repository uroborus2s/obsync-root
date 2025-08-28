/**
 * 用户信息相关的TypeScript类型定义
 */

/**
 * 用户类型枚举
 */
export type UserType = 'teacher' | 'student' | 'admin' | 'staff'

/**
 * 用户角色类型
 */
export type UserRole = 'teacher' | 'student' | 'admin' | 'staff' | 'super_admin'

/**
 * 用户权限类型
 */
export type UserPermission = 
  | 'read'
  | 'write'
  | 'admin'
  | 'teacher:profile'
  | 'teacher:courses'
  | 'teacher:students'
  | 'student:profile'
  | 'student:courses'
  | 'admin:users'
  | 'admin:system'

/**
 * JWT Payload中的用户信息
 */
export interface JWTUserPayload {
  /** 用户ID */
  userId: string
  /** 用户姓名 */
  username: string
  /** 用户编号 */
  userNumber: string
  /** 用户类型 */
  userType: UserType
  /** 学院名称 */
  collegeName: string
  /** 角色列表 */
  roles: UserRole[]
  /** 权限列表 */
  permissions: UserPermission[]
  /** 工号 */
  employeeNumber: string
  /** 部门名称 */
  departmentName: string
  /** 职称 */
  title: string
  /** 学历 */
  education: string
  /** JWT签发时间 */
  iat: number
  /** JWT过期时间 */
  exp: number
  /** 受众 */
  aud: string
  /** 签发者 */
  iss: string
}

/**
 * 用户信息接口
 */
export interface UserInfo {
  /** 用户ID */
  id: string
  /** 用户姓名 */
  name: string
  /** 用户编号 */
  number: string
  /** 用户类型 */
  type: UserType
  /** 学院名称 */
  college: string
  /** 角色列表 */
  roles: UserRole[]
  /** 权限列表 */
  permissions: UserPermission[]
  /** 工号 */
  employeeNumber: string
  /** 部门名称 */
  department: string
  /** 职称 */
  title: string
  /** 学历 */
  education: string
  /** 用户头像URL（可选） */
  avatar?: string
  /** 邮箱（可选） */
  email?: string
  /** 电话（可选） */
  phone?: string
}

/**
 * JWT解析结果
 */
export interface JWTParseResult {
  /** 是否解析成功 */
  success: boolean
  /** 用户信息（解析成功时） */
  user?: UserInfo
  /** 错误信息（解析失败时） */
  error?: string
  /** 是否已过期 */
  expired?: boolean
}

/**
 * 用户认证状态
 */
export interface AuthState {
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 用户信息 */
  user: UserInfo | null
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: string | null
}
