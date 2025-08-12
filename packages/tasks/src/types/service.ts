/**
 * 服务层通用类型定义
 */

/**
 * 统一的服务结果类型
 */
export interface ServiceResult<T> {
  /** 操作是否成功 */
  success: boolean;
  /** 返回的数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 警告信息 */
  warnings?: string[];
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * ServiceResult 工具类
 */
export namespace ServiceResult {
  /**
   * 创建成功结果
   */
  export function success<T>(data?: T, metadata?: Record<string, any>): ServiceResult<T> {
    const result: ServiceResult<T> = {
      success: true
    };
    
    if (data !== undefined) {
      result.data = data;
    }
    
    if (metadata !== undefined) {
      result.metadata = metadata;
    }
    
    return result;
  }

  /**
   * 创建失败结果
   */
  export function failure<T>(
    error: string,
    errorCode?: string,
    errorDetails?: any
  ): ServiceResult<T> {
    const result: ServiceResult<T> = {
      success: false,
      error: error
    };
    
    if (errorCode !== undefined) {
      result.errorCode = errorCode;
    }
    
    if (errorDetails !== undefined) {
      result.errorDetails = errorDetails;
    }
    
    return result;
  }

  /**
   * 创建带警告的成功结果
   */
  export function successWithWarnings<T>(
    data: T,
    warnings: string[],
    metadata?: Record<string, any>
  ): ServiceResult<T> {
    const result: ServiceResult<T> = {
      success: true,
      data: data,
      warnings: warnings
    };
    
    if (metadata !== undefined) {
      result.metadata = metadata;
    }
    
    return result;
  }

  /**
   * 从Promise包装结果
   */
  export async function fromPromise<T>(
    promise: Promise<T>,
    errorCode?: string
  ): Promise<ServiceResult<T>> {
    try {
      const data = await promise;
      return ServiceResult.success(data);
    } catch (error) {
      return ServiceResult.failure(
        error instanceof Error ? error.message : String(error),
        errorCode,
        error
      );
    }
  }

  /**
   * 检查结果是否成功
   */
  export function isSuccess<T>(result: ServiceResult<T>): result is ServiceResult<T> & { success: true; data: T } {
    return result.success && result.data !== undefined;
  }

  /**
   * 检查结果是否失败
   */
  export function isFailure<T>(result: ServiceResult<T>): result is ServiceResult<T> & { success: false; error: string } {
    return !result.success;
  }

  /**
   * 转换结果数据类型
   */
  export function map<T, U>(
    result: ServiceResult<T>,
    mapper: (data: T) => U
  ): ServiceResult<U> {
    if (result.success && result.data !== undefined) {
      try {
        const mappedData = mapper(result.data);
        return ServiceResult.success(mappedData, result.metadata);
      } catch (error) {
        return ServiceResult.failure(
          `数据转换失败: ${error instanceof Error ? error.message : String(error)}`,
          'DATA_MAPPING_ERROR',
          error
        );
      }
    }
    
    const failureResult: ServiceResult<U> = {
      success: false
    };
    
    if (result.error !== undefined) {
      failureResult.error = result.error;
    }
    
    if (result.errorCode !== undefined) {
      failureResult.errorCode = result.errorCode;
    }
    
    if (result.errorDetails !== undefined) {
      failureResult.errorDetails = result.errorDetails;
    }
    
    return failureResult;
  }

  /**
   * 链式处理结果
   */
  export async function flatMap<T, U>(
    result: ServiceResult<T>,
    mapper: (data: T) => Promise<ServiceResult<U>>
  ): Promise<ServiceResult<U>> {
    if (result.success && result.data !== undefined) {
      try {
        return await mapper(result.data);
      } catch (error) {
        return ServiceResult.failure(
          `链式处理失败: ${error instanceof Error ? error.message : String(error)}`,
          'CHAIN_PROCESSING_ERROR',
          error
        );
      }
    }
    
    const failureResult: ServiceResult<U> = {
      success: false
    };
    
    if (result.error !== undefined) {
      failureResult.error = result.error;
    }
    
    if (result.errorCode !== undefined) {
      failureResult.errorCode = result.errorCode;
    }
    
    if (result.errorDetails !== undefined) {
      failureResult.errorDetails = result.errorDetails;
    }
    
    return failureResult;
  }

  /**
   * 合并多个结果
   */
  export function combine<T>(results: ServiceResult<T>[]): ServiceResult<T[]> {
    const data: T[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const result of results) {
      if (result.success && result.data !== undefined) {
        data.push(result.data);
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } else {
        if (result.error) {
          errors.push(result.error);
        }
      }
    }

    if (errors.length > 0) {
      return ServiceResult.failure(
        `批量操作失败: ${errors.join('; ')}`,
        'BATCH_OPERATION_ERROR',
        { errors, partialData: data }
      );
    }

    const finalResult = ServiceResult.success(data);
    if (warnings.length > 0) {
      finalResult.warnings = warnings;
    }
    
    return finalResult;
  }
}

/**
 * 分页结果类型
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
}

/**
 * 分页查询选项
 */
export interface PaginationOptions {
  /** 页码（从1开始） */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 偏移量 */
  offset?: number;
  /** 限制数量 */
  limit?: number;
}

/**
 * 排序选项
 */
export interface SortOptions {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/**
 * 查询选项基类
 */
export interface BaseQueryOptions {
  /** 分页选项 */
  pagination?: PaginationOptions;
  /** 排序选项 */
  sort?: SortOptions[];
  /** 过滤条件 */
  filters?: Record<string, any>;
  /** 包含字段 */
  include?: string[];
  /** 排除字段 */
  exclude?: string[];
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  /** 总数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 跳过数 */
  skipped: number;
  /** 失败的项目 */
  failedItems?: Array<{
    item: any;
    error: string;
    errorCode?: string;
  }>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 字段名 */
  field: string;
  /** 字段值 */
  value: any;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
  /** 约束条件 */
  constraint?: string;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 字段名 */
  field: string;
  /** 字段值 */
  value: any;
  /** 警告消息 */
  message: string;
  /** 警告代码 */
  code: string;
}

/**
 * 操作上下文
 */
export interface OperationContext {
  /** 操作ID */
  operationId: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 请求ID */
  requestId?: string;
  /** 时间戳 */
  timestamp: Date;
  /** 额外数据 */
  metadata?: Record<string, any>;
}

/**
 * 错误代码常量
 */
export const ErrorCodes = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  
  // 数据库错误
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // 业务逻辑错误
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // 外部服务错误
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];