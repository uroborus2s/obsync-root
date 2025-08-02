/**
 * Redis相关错误定义
 */
export class RedisError extends Error {
    code;
    node;
    command;
    details;
    constructor(message, code, node, command, details) {
        super(message);
        this.name = 'RedisError';
        this.code = code;
        this.node = node;
        this.command = command;
        this.details = details;
        // 确保错误堆栈正确
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RedisError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            node: this.node,
            command: this.command,
            details: this.details,
            stack: this.stack
        };
    }
}
// Redis连接错误
export class RedisConnectionError extends RedisError {
    constructor(message, node, details) {
        super(message, 'REDIS_CONNECTION_ERROR', node, undefined, details);
        this.name = 'RedisConnectionError';
    }
}
// Redis命令执行错误
export class RedisCommandError extends RedisError {
    constructor(message, command, node, details) {
        super(message, 'REDIS_COMMAND_ERROR', node, command, details);
        this.name = 'RedisCommandError';
    }
}
// Redis集群错误
export class RedisClusterError extends RedisError {
    constructor(message, details) {
        super(message, 'REDIS_CLUSTER_ERROR', undefined, undefined, details);
        this.name = 'RedisClusterError';
    }
}
// Redis节点不可用错误
export class RedisNodeUnavailableError extends RedisError {
    constructor(node, details) {
        super(`Redis node '${node}' is unavailable`, 'REDIS_NODE_UNAVAILABLE', node, undefined, details);
        this.name = 'RedisNodeUnavailableError';
    }
}
// Redis内存不足错误
export class RedisOutOfMemoryError extends RedisError {
    constructor(node, details) {
        super('Redis server is out of memory', 'REDIS_OUT_OF_MEMORY', node, undefined, details);
        this.name = 'RedisOutOfMemoryError';
    }
}
// Redis认证错误
export class RedisAuthenticationError extends RedisError {
    constructor(node, details) {
        super('Redis authentication failed', 'REDIS_AUTHENTICATION_ERROR', node, undefined, details);
        this.name = 'RedisAuthenticationError';
    }
}
// Redis权限错误
export class RedisPermissionError extends RedisError {
    constructor(command, node, details) {
        super(`Permission denied for Redis command '${command}'`, 'REDIS_PERMISSION_ERROR', node, command, details);
        this.name = 'RedisPermissionError';
    }
}
// Redis超时错误
export class RedisTimeoutError extends RedisError {
    constructor(operation, timeout, node) {
        super(`Redis operation '${operation}' timed out after ${timeout}ms`, 'REDIS_TIMEOUT_ERROR', node, operation, { timeout });
        this.name = 'RedisTimeoutError';
    }
}
// Redis数据类型错误
export class RedisDataTypeError extends RedisError {
    constructor(key, expectedType, actualType, node) {
        super(`Redis key '${key}' expected type '${expectedType}' but got '${actualType}'`, 'REDIS_DATA_TYPE_ERROR', node, undefined, { key, expectedType, actualType });
        this.name = 'RedisDataTypeError';
    }
}
// Redis键不存在错误
export class RedisKeyNotFoundError extends RedisError {
    constructor(key, node) {
        super(`Redis key '${key}' not found`, 'REDIS_KEY_NOT_FOUND', node, undefined, { key });
        this.name = 'RedisKeyNotFoundError';
    }
}
// Redis脚本错误
export class RedisScriptError extends RedisError {
    constructor(script, error, node) {
        super(`Redis script execution failed: ${error}`, 'REDIS_SCRIPT_ERROR', node, 'EVAL', { script, error });
        this.name = 'RedisScriptError';
    }
}
// Redis事务错误
export class RedisTransactionError extends RedisError {
    constructor(message, node, details) {
        super(message, 'REDIS_TRANSACTION_ERROR', node, 'MULTI', details);
        this.name = 'RedisTransactionError';
    }
}
// Redis管道错误
export class RedisPipelineError extends RedisError {
    constructor(message, node, details) {
        super(message, 'REDIS_PIPELINE_ERROR', node, 'PIPELINE', details);
        this.name = 'RedisPipelineError';
    }
}
// Redis配置错误
export class RedisConfigurationError extends RedisError {
    constructor(message, details) {
        super(message, 'REDIS_CONFIGURATION_ERROR', undefined, undefined, details);
        this.name = 'RedisConfigurationError';
    }
}
// Redis版本不兼容错误
export class RedisVersionError extends RedisError {
    constructor(requiredVersion, actualVersion, node) {
        super(`Redis version '${actualVersion}' is not compatible. Required: '${requiredVersion}'`, 'REDIS_VERSION_ERROR', node, undefined, { requiredVersion, actualVersion });
        this.name = 'RedisVersionError';
    }
}
// Redis错误工厂函数
export const createRedisError = {
    connection: (message, node, details) => new RedisConnectionError(message, node, details),
    command: (message, command, node, details) => new RedisCommandError(message, command, node, details),
    cluster: (message, details) => new RedisClusterError(message, details),
    nodeUnavailable: (node, details) => new RedisNodeUnavailableError(node, details),
    outOfMemory: (node, details) => new RedisOutOfMemoryError(node, details),
    authentication: (node, details) => new RedisAuthenticationError(node, details),
    permission: (command, node, details) => new RedisPermissionError(command, node, details),
    timeout: (operation, timeout, node) => new RedisTimeoutError(operation, timeout, node),
    dataType: (key, expectedType, actualType, node) => new RedisDataTypeError(key, expectedType, actualType, node),
    keyNotFound: (key, node) => new RedisKeyNotFoundError(key, node),
    script: (script, error, node) => new RedisScriptError(script, error, node),
    transaction: (message, node, details) => new RedisTransactionError(message, node, details),
    pipeline: (message, node, details) => new RedisPipelineError(message, node, details),
    configuration: (message, details) => new RedisConfigurationError(message, details),
    version: (requiredVersion, actualVersion, node) => new RedisVersionError(requiredVersion, actualVersion, node)
};
// 错误类型检查函数
export const isRedisError = (error) => {
    return error instanceof RedisError;
};
export const isRedisConnectionError = (error) => {
    return error instanceof RedisConnectionError;
};
export const isRedisCommandError = (error) => {
    return error instanceof RedisCommandError;
};
export const isRedisClusterError = (error) => {
    return error instanceof RedisClusterError;
};
//# sourceMappingURL=redis-error.js.map