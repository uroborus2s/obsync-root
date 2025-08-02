/**
 * Redis相关错误定义
 */
export declare class RedisError extends Error {
    readonly code: string;
    readonly node?: string;
    readonly command?: string;
    readonly details?: any;
    constructor(message: string, code: string, node?: string, command?: string, details?: any);
    toJSON(): {
        name: string;
        message: string;
        code: string;
        node: string | undefined;
        command: string | undefined;
        details: any;
        stack: string | undefined;
    };
}
export declare class RedisConnectionError extends RedisError {
    constructor(message: string, node?: string, details?: any);
}
export declare class RedisCommandError extends RedisError {
    constructor(message: string, command: string, node?: string, details?: any);
}
export declare class RedisClusterError extends RedisError {
    constructor(message: string, details?: any);
}
export declare class RedisNodeUnavailableError extends RedisError {
    constructor(node: string, details?: any);
}
export declare class RedisOutOfMemoryError extends RedisError {
    constructor(node?: string, details?: any);
}
export declare class RedisAuthenticationError extends RedisError {
    constructor(node?: string, details?: any);
}
export declare class RedisPermissionError extends RedisError {
    constructor(command: string, node?: string, details?: any);
}
export declare class RedisTimeoutError extends RedisError {
    constructor(operation: string, timeout: number, node?: string);
}
export declare class RedisDataTypeError extends RedisError {
    constructor(key: string, expectedType: string, actualType: string, node?: string);
}
export declare class RedisKeyNotFoundError extends RedisError {
    constructor(key: string, node?: string);
}
export declare class RedisScriptError extends RedisError {
    constructor(script: string, error: string, node?: string);
}
export declare class RedisTransactionError extends RedisError {
    constructor(message: string, node?: string, details?: any);
}
export declare class RedisPipelineError extends RedisError {
    constructor(message: string, node?: string, details?: any);
}
export declare class RedisConfigurationError extends RedisError {
    constructor(message: string, details?: any);
}
export declare class RedisVersionError extends RedisError {
    constructor(requiredVersion: string, actualVersion: string, node?: string);
}
export declare const createRedisError: {
    connection: (message: string, node?: string, details?: any) => RedisConnectionError;
    command: (message: string, command: string, node?: string, details?: any) => RedisCommandError;
    cluster: (message: string, details?: any) => RedisClusterError;
    nodeUnavailable: (node: string, details?: any) => RedisNodeUnavailableError;
    outOfMemory: (node?: string, details?: any) => RedisOutOfMemoryError;
    authentication: (node?: string, details?: any) => RedisAuthenticationError;
    permission: (command: string, node?: string, details?: any) => RedisPermissionError;
    timeout: (operation: string, timeout: number, node?: string) => RedisTimeoutError;
    dataType: (key: string, expectedType: string, actualType: string, node?: string) => RedisDataTypeError;
    keyNotFound: (key: string, node?: string) => RedisKeyNotFoundError;
    script: (script: string, error: string, node?: string) => RedisScriptError;
    transaction: (message: string, node?: string, details?: any) => RedisTransactionError;
    pipeline: (message: string, node?: string, details?: any) => RedisPipelineError;
    configuration: (message: string, details?: any) => RedisConfigurationError;
    version: (requiredVersion: string, actualVersion: string, node?: string) => RedisVersionError;
};
export declare const isRedisError: (error: any) => error is RedisError;
export declare const isRedisConnectionError: (error: any) => error is RedisConnectionError;
export declare const isRedisCommandError: (error: any) => error is RedisCommandError;
export declare const isRedisClusterError: (error: any) => error is RedisClusterError;
//# sourceMappingURL=redis-error.d.ts.map