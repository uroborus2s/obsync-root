// @stratix/database 错误处理系统
// 基于 @stratix/utils 函数式错误处理
import { withRetry, withTimeout } from '@stratix/utils/async';
/**
 * 数据库错误类型枚举
 */
export var DatabaseErrorType;
(function (DatabaseErrorType) {
    DatabaseErrorType["CONNECTION_ERROR"] = "CONNECTION_ERROR";
    DatabaseErrorType["QUERY_ERROR"] = "QUERY_ERROR";
    DatabaseErrorType["TRANSACTION_ERROR"] = "TRANSACTION_ERROR";
    DatabaseErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    DatabaseErrorType["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
    DatabaseErrorType["PERMISSION_ERROR"] = "PERMISSION_ERROR";
    DatabaseErrorType["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
})(DatabaseErrorType || (DatabaseErrorType = {}));
/**
 * 连接错误
 */
export class ConnectionError {
    constructor(message, connectionName, cause, code) {
        this.message = message;
        this.connectionName = connectionName;
        this.cause = cause;
        this.code = code;
        this.type = DatabaseErrorType.CONNECTION_ERROR;
        this.timestamp = new Date();
        this.retryable = true;
    }
    static create(message, connectionName, cause) {
        return new ConnectionError(message, connectionName, cause);
    }
}
/**
 * 查询错误
 */
export class QueryError {
    constructor(message, query, parameters, cause) {
        this.message = message;
        this.query = query;
        this.parameters = parameters;
        this.cause = cause;
        this.type = DatabaseErrorType.QUERY_ERROR;
        this.timestamp = new Date();
        this.retryable = false;
    }
    static create(message, query, parameters) {
        return new QueryError(message, query, parameters);
    }
}
/**
 * 事务错误
 */
export class TransactionError {
    constructor(message, cause) {
        this.message = message;
        this.cause = cause;
        this.type = DatabaseErrorType.TRANSACTION_ERROR;
        this.timestamp = new Date();
        this.retryable = true;
    }
    static create(message, cause) {
        return new TransactionError(message, cause);
    }
}
/**
 * 验证错误
 */
export class ValidationError {
    constructor(message, field, value) {
        this.message = message;
        this.field = field;
        this.value = value;
        this.type = DatabaseErrorType.VALIDATION_ERROR;
        this.timestamp = new Date();
        this.retryable = false;
    }
    static create(message, field, value) {
        return new ValidationError(message, field, value);
    }
}
/**
 * 超时错误
 */
export class TimeoutError {
    constructor(message, timeoutMs, operation) {
        this.message = message;
        this.timeoutMs = timeoutMs;
        this.operation = operation;
        this.type = DatabaseErrorType.TIMEOUT_ERROR;
        this.timestamp = new Date();
        this.retryable = true;
    }
    static create(message, timeoutMs, operation) {
        return new TimeoutError(message, timeoutMs, operation);
    }
}
/**
 * 权限错误
 */
export class PermissionError {
    constructor(message, operation, resource) {
        this.message = message;
        this.operation = operation;
        this.resource = resource;
        this.type = DatabaseErrorType.PERMISSION_ERROR;
        this.timestamp = new Date();
        this.retryable = false;
    }
    static create(message, operation, resource) {
        return new PermissionError(message, operation, resource);
    }
}
/**
 * 配置错误
 */
export class ConfigurationError {
    constructor(message, configPath) {
        this.message = message;
        this.configPath = configPath;
        this.type = DatabaseErrorType.CONFIGURATION_ERROR;
        this.timestamp = new Date();
        this.retryable = false;
    }
    static create(message, configPath) {
        return new ConfigurationError(message, configPath);
    }
}
/**
 * 错误分类器 - 使用纯函数
 */
export const ErrorClassifier = {
    /**
     * 分类错误
     */
    classify: (error) => {
        if (error instanceof Error) {
            const errorInfo = {
                message: error.message.toLowerCase(),
                code: error.code,
                error: error
            };
            // 超时错误优先判断
            if (errorInfo.code === 'ETIMEDOUT' ||
                errorInfo.message.includes('timeout') ||
                errorInfo.message.includes('timed out')) {
                return TimeoutError.create(errorInfo.error.message);
            }
            // 连接错误
            if (errorInfo.code === 'ECONNRESET' ||
                errorInfo.code === 'ECONNREFUSED' ||
                errorInfo.message.includes('connection') ||
                errorInfo.message.includes('connect')) {
                return ConnectionError.create(errorInfo.error.message);
            }
            // 权限错误
            if (errorInfo.message.includes('access denied') ||
                errorInfo.message.includes('permission') ||
                errorInfo.message.includes('unauthorized')) {
                return PermissionError.create(errorInfo.error.message);
            }
            // 验证错误
            if (errorInfo.message.includes('constraint') ||
                errorInfo.message.includes('validation') ||
                errorInfo.message.includes('invalid')) {
                return ValidationError.create(errorInfo.error.message);
            }
            // 事务错误
            if (errorInfo.message.includes('transaction') ||
                errorInfo.message.includes('rollback')) {
                return TransactionError.create(errorInfo.error.message);
            }
            // 默认为查询错误
            return QueryError.create(errorInfo.error.message);
        }
        if (typeof error === 'string') {
            return QueryError.create(error);
        }
        return QueryError.create('Unknown error occurred');
    },
    isRetryable: (error) => error.retryable,
    isConnectionError: (error) => error.type === DatabaseErrorType.CONNECTION_ERROR,
    isTemporaryError: (error) => [
        DatabaseErrorType.CONNECTION_ERROR,
        DatabaseErrorType.TIMEOUT_ERROR,
        DatabaseErrorType.TRANSACTION_ERROR
    ].includes(error.type)
};
/**
 * 数据库错误处理器 - 使用 @stratix/utils 函数
 */
export const DatabaseErrorHandler = {
    /**
     * 创建成功结果
     */
    success: (data) => ({
        success: true,
        data
    }),
    /**
     * 创建失败结果
     */
    failure: (error) => ({
        success: false,
        error
    }),
    /**
     * 执行操作并处理错误
     */
    execute: async (operation, _context) => {
        try {
            const data = await operation();
            return DatabaseErrorHandler.success(data);
        }
        catch (error) {
            const classifiedError = ErrorClassifier.classify(error);
            return DatabaseErrorHandler.failure(classifiedError);
        }
    },
    /**
     * 带重试的执行
     */
    executeWithRetry: async (operation, options = { retries: 3, delay: 1000 }, context) => {
        const retryableOperation = async () => {
            const result = await DatabaseErrorHandler.execute(operation, context);
            if (result.success) {
                return result.data;
            }
            // 如果不可重试，直接抛出
            if (!ErrorClassifier.isRetryable(result.error)) {
                throw result.error;
            }
            throw result.error;
        };
        try {
            const result = await withRetry(retryableOperation, options);
            if (result._tag === 'Right') {
                return DatabaseErrorHandler.success(result.right);
            }
            else {
                const classifiedError = ErrorClassifier.classify(result.left);
                return DatabaseErrorHandler.failure(classifiedError);
            }
        }
        catch (error) {
            const classifiedError = ErrorClassifier.classify(error);
            return DatabaseErrorHandler.failure(classifiedError);
        }
    },
    /**
     * 带超时的执行
     */
    executeWithTimeout: async (operation, timeoutMs, context) => {
        try {
            const data = await withTimeout(operation(), timeoutMs, `Operation timeout: ${context}`);
            return DatabaseErrorHandler.success(data);
        }
        catch (error) {
            const classifiedError = ErrorClassifier.classify(error);
            return DatabaseErrorHandler.failure(classifiedError);
        }
    }
};
/**
 * 连接恢复策略
 */
export class ConnectionRecoveryStrategy {
    constructor(fallbackOperation) {
        this.fallbackOperation = fallbackOperation;
    }
    canRecover(error) {
        return ErrorClassifier.isConnectionError(error);
    }
    async recover(_error) {
        return await this.fallbackOperation();
    }
}
/**
 * 带恢复策略的错误处理器
 */
export const RecoverableErrorHandler = {
    executeWithRecovery: async (operation, recoveryStrategy, context) => {
        const result = await DatabaseErrorHandler.execute(operation, context);
        if (result.success) {
            return result;
        }
        // 尝试恢复
        if (recoveryStrategy.canRecover(result.error)) {
            return await DatabaseErrorHandler.execute(() => recoveryStrategy.recover(result.error), `recovery:${context || 'unknown'}`);
        }
        return result;
    }
};
