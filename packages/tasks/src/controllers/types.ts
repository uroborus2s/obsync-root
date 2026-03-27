/**
 * Controller类型定义
 * 
 * 定义Controller相关的请求和响应类型
 * 版本: v3.0.0-controllers
 */

/**
 * 统一响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: any;
  timestamp: string;
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 工作流定义查询参数
 */
export interface WorkflowDefinitionQueryParams {
  /** 页码，默认1 */
  page?: number;
  /** 每页大小，默认20 */
  pageSize?: number;
  /** 状态过滤 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 分类过滤 */
  category?: string;
  /** 是否活跃 */
  isActive?: boolean;
  /** 搜索关键词 */
  search?: string;
}

/**
 * 创建工作流定义请求体
 */
export interface CreateWorkflowDefinitionRequest {
  /** 工作流名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 显示名称 */
  displayName?: string;
  /** 描述 */
  description?: string;
  /** 工作流定义结构 */
  definition: any;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 状态 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 是否活跃 */
  isActive?: boolean;
  /** 超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（秒） */
  retryDelaySeconds?: number;
}

/**
 * 更新工作流定义请求体
 */
export interface UpdateWorkflowDefinitionRequest {
  /** 显示名称 */
  displayName?: string;
  /** 描述 */
  description?: string;
  /** 工作流定义结构 */
  definition?: any;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 状态 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 是否活跃 */
  isActive?: boolean;
  /** 超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（秒） */
  retryDelaySeconds?: number;
}

/**
 * 工作流定义验证请求体
 */
export interface ValidateWorkflowDefinitionRequest {
  /** 工作流定义结构 */
  definition: any;
}
