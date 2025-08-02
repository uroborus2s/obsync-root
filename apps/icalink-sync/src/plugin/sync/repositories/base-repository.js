/**
 * 基础Repository类
 * 提供通用的数据库操作方法
 */
/**
 * 基础Repository实现
 */
export class BaseRepository {
    log;
    constructor(log) {
        this.log = log;
    }
    /**
     * 生成UUID
     */
    generateId() {
        return crypto.randomUUID();
    }
    /**
     * 获取当前时间
     */
    getCurrentTime() {
        return new Date();
    }
    /**
     * 安全的JSON解析
     */
    safeJsonParse(jsonString) {
        if (!jsonString) {
            return null;
        }
        try {
            return JSON.parse(jsonString);
        }
        catch (error) {
            this.log.warn({ jsonString, error }, 'JSON解析失败');
            return null;
        }
    }
    /**
     * 安全的JSON字符串化
     */
    safeJsonStringify(obj) {
        if (obj === null || obj === undefined) {
            return null;
        }
        try {
            return JSON.stringify(obj);
        }
        catch (error) {
            this.log.warn({ obj, error }, 'JSON字符串化失败');
            return null;
        }
    }
    /**
     * 记录操作日志
     */
    logOperation(operation, data, message) {
        this.log.debug({ operation, ...data }, message || `${operation}操作完成`);
    }
    /**
     * 记录错误日志
     */
    logError(operation, error, data) {
        this.log.error({ operation, error: error.message, ...data }, `${operation}操作失败`);
    }
    /**
     * 处理数据库操作错误
     */
    handleDatabaseError(operation, error, context) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logError(operation, new Error(errorMessage), context);
        throw new Error(`${operation}失败: ${errorMessage}`);
    }
    /**
     * 验证必需字段
     */
    validateRequired(data, requiredFields) {
        const missingFields = requiredFields.filter((field) => data[field] === undefined || data[field] === null);
        if (missingFields.length > 0) {
            throw new Error(`缺少必需字段: ${missingFields.join(', ')}`);
        }
    }
    /**
     * 构建分页查询
     */
    buildPagination(page, pageSize) {
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
    buildOrderBy(sortField, sortOrder) {
        if (!sortField) {
            return null;
        }
        return {
            field: sortField,
            order: sortOrder || 'asc'
        };
    }
}
//# sourceMappingURL=base-repository.js.map