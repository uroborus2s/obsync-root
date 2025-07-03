/**
 * 基础Repository类
 * 提供通用的数据库操作方法
 */

import { Logger } from '@stratix/core';

/**
 * 基础Repository实现
 */
export abstract class BaseRepository {
  protected log: Logger;
  constructor(log: Logger) {
    this.log = log;
  }

  /**
   * 生成UUID
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 获取当前时间
   */
  protected getCurrentTime(): Date {
    return new Date();
  }

  /**
   * 安全的JSON解析
   */
  protected safeJsonParse<T>(jsonString: string | null): T | null {
    if (!jsonString) {
      return null;
    }

    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.log.warn({ jsonString, error }, 'JSON解析失败');
      return null;
    }
  }

  /**
   * 安全的JSON字符串化
   */
  protected safeJsonStringify(obj: any): string | null {
    if (obj === null || obj === undefined) {
      return null;
    }

    try {
      return JSON.stringify(obj);
    } catch (error) {
      this.log.warn({ obj, error }, 'JSON字符串化失败');
      return null;
    }
  }

  /**
   * 记录操作日志
   */
  protected logOperation(
    operation: string,
    data: Record<string, any>,
    message?: string
  ): void {
    this.log.debug({ operation, ...data }, message || `${operation}操作完成`);
  }

  /**
   * 记录错误日志
   */
  protected logError(
    operation: string,
    error: Error,
    data?: Record<string, any>
  ): void {
    this.log.error(
      { operation, error: error.message, ...data },
      `${operation}操作失败`
    );
  }

  /**
   * 处理数据库操作错误
   */
  protected handleDatabaseError(
    operation: string,
    error: unknown,
    context?: Record<string, any>
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logError(operation, new Error(errorMessage), context);
    throw new Error(`${operation}失败: ${errorMessage}`);
  }

  /**
   * 验证必需字段
   */
  protected validateRequired(
    data: Record<string, any>,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      throw new Error(`缺少必需字段: ${missingFields.join(', ')}`);
    }
  }

  /**
   * 构建分页查询
   */
  protected buildPagination(page?: number, pageSize?: number) {
    if (!page || !pageSize) {
      return {};
    }

    const offset = (page - 1) * pageSize;
    return {
      limit: pageSize,
      offset
    };
  }

  /**
   * 构建排序条件
   */
  protected buildOrderBy(
    sortField?: string,
    sortOrder?: 'asc' | 'desc'
  ): { field: string; order: 'asc' | 'desc' } | null {
    if (!sortField) {
      return null;
    }

    return {
      field: sortField,
      order: sortOrder || 'asc'
    };
  }
}
