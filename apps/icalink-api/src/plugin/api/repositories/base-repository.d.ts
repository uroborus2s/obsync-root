/**
 * 基础Repository类
 * 提供通用的数据库操作方法
 */
import { Logger } from '@stratix/core';
/**
 * 基础Repository实现
 */
export declare abstract class BaseRepository {
    protected log: Logger;
    constructor(log: Logger);
    /**
     * 生成UUID
     */
    protected generateId(): string;
    /**
     * 获取当前时间
     */
    protected getCurrentTime(): Date;
    /**
     * 安全的JSON解析
     */
    protected safeJsonParse<T>(jsonString: string | null): T | null;
    /**
     * 安全的JSON字符串化
     */
    protected safeJsonStringify(obj: any): string | null;
    /**
     * 记录操作日志
     */
    protected logOperation(operation: string, data: Record<string, any>, message?: string): void;
    /**
     * 记录错误日志
     */
    protected logError(operation: string, error: Error, data?: Record<string, any>): void;
    /**
     * 处理数据库操作错误
     */
    protected handleDatabaseError(operation: string, error: unknown, context?: Record<string, any>): never;
    /**
     * 验证必需字段
     */
    protected validateRequired(data: Record<string, any>, requiredFields: string[]): void;
    /**
     * 构建分页查询
     */
    protected buildPagination(page?: number, pageSize?: number): {
        limit?: undefined;
        offset?: undefined;
    } | {
        limit: number;
        offset: number;
    };
    /**
     * 构建排序条件
     */
    protected buildOrderBy(sortField?: string, sortOrder?: 'asc' | 'desc'): {
        field: string;
        order: 'asc' | 'desc';
    } | null;
}
//# sourceMappingURL=base-repository.d.ts.map