/**
 * 分页工具函数
 * 
 * 提供通用的分页参数解析和验证功能
 * 版本: v3.0.0-utils
 */

import type { PaginationOptions } from '../types/index.js';

/**
 * 分页参数解析结果
 */
export interface ParsedPaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 分页参数解析选项
 */
export interface PaginationParseOptions {
  /** 默认页码，默认为1 */
  defaultPage?: number;
  /** 默认每页大小，默认为20 */
  defaultPageSize?: number;
  /** 最大每页大小，默认为100 */
  maxPageSize?: number;
  /** 最小每页大小，默认为1 */
  minPageSize?: number;
}

/**
 * 解析分页参数，确保类型正确
 * 
 * 从HTTP查询参数中解析分页参数，处理类型转换和边界验证
 * 
 * @param query - HTTP查询参数对象
 * @param options - 解析选项
 * @returns 解析后的分页参数
 */
export function parsePaginationParams(
  query: any,
  options: PaginationParseOptions = {}
): ParsedPaginationParams {
  const {
    defaultPage = 1,
    defaultPageSize = 20,
    maxPageSize = 100,
    minPageSize = 1
  } = options;

  // 解析页码，确保为正整数
  const page = Math.max(
    defaultPage,
    parseInt(query.page as string) || defaultPage
  );

  // 解析每页大小，确保在合理范围内
  const pageSize = Math.max(
    minPageSize,
    Math.min(
      maxPageSize,
      parseInt(query.pageSize as string) || defaultPageSize
    )
  );

  return { page, pageSize };
}

/**
 * 创建PaginationOptions对象
 * 
 * @param query - HTTP查询参数对象
 * @param options - 解析选项
 * @returns PaginationOptions对象
 */
export function createPaginationOptions(
  query: any,
  options: PaginationParseOptions = {}
): PaginationOptions {
  const { page, pageSize } = parsePaginationParams(query, options);
  return { page, pageSize };
}

/**
 * 验证分页参数
 * 
 * @param page - 页码
 * @param pageSize - 每页大小
 * @param maxPageSize - 最大每页大小
 * @returns 验证结果
 */
export function validatePaginationParams(
  page: number,
  pageSize: number,
  maxPageSize: number = 100
): { valid: boolean; error?: string } {
  if (!Number.isInteger(page) || page < 1) {
    return {
      valid: false,
      error: 'Page must be a positive integer'
    };
  }

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return {
      valid: false,
      error: 'PageSize must be a positive integer'
    };
  }

  if (pageSize > maxPageSize) {
    return {
      valid: false,
      error: `PageSize cannot exceed ${maxPageSize}`
    };
  }

  return { valid: true };
}

/**
 * 计算分页偏移量
 * 
 * @param page - 页码（从1开始）
 * @param pageSize - 每页大小
 * @returns 偏移量（从0开始）
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * 计算总页数
 * 
 * @param total - 总记录数
 * @param pageSize - 每页大小
 * @returns 总页数
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

/**
 * 检查是否有下一页
 * 
 * @param page - 当前页码
 * @param totalPages - 总页数
 * @returns 是否有下一页
 */
export function hasNextPage(page: number, totalPages: number): boolean {
  return page < totalPages;
}

/**
 * 检查是否有上一页
 * 
 * @param page - 当前页码
 * @returns 是否有上一页
 */
export function hasPreviousPage(page: number): boolean {
  return page > 1;
}

/**
 * 创建完整的分页信息
 * 
 * @param page - 当前页码
 * @param pageSize - 每页大小
 * @param total - 总记录数
 * @returns 完整的分页信息
 */
export function createPaginationInfo(
  page: number,
  pageSize: number,
  total: number
) {
  const totalPages = calculateTotalPages(total, pageSize);
  const hasNext = hasNextPage(page, totalPages);
  const hasPrev = hasPreviousPage(page);
  const offset = calculateOffset(page, pageSize);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
    offset
  };
}
