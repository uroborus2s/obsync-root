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
