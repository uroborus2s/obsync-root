/**
 * Redis相关错误定义
 */

export class RedisError extends Error {
  public readonly code: string;
  public readonly node?: string;
  public readonly command?: string;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    node?: string,
    command?: string,
    details?: any
  ) {
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
  constructor(message: string, node?: string, details?: any) {
    super(message, 'REDIS_CONNECTION_ERROR', node, undefined, details);
    this.name = 'RedisConnectionError';
  }
}

// Redis命令执行错误
export class RedisCommandError extends RedisError {
  constructor(message: string, command: string, node?: string, details?: any) {
    super(message, 'REDIS_COMMAND_ERROR', node, command, details);
    this.name = 'RedisCommandError';
  }
}

// Redis集群错误
export class RedisClusterError extends RedisError {
  constructor(message: string, details?: any) {
    super(message, 'REDIS_CLUSTER_ERROR', undefined, undefined, details);
    this.name = 'RedisClusterError';
  }
}

// Redis节点不可用错误
export class RedisNodeUnavailableError extends RedisError {
  constructor(node: string, details?: any) {
    super(
      `Redis node '${node}' is unavailable`,
      'REDIS_NODE_UNAVAILABLE',
      node,
      undefined,
      details
    );
    this.name = 'RedisNodeUnavailableError';
  }
}

// Redis内存不足错误
export class RedisOutOfMemoryError extends RedisError {
  constructor(node?: string, details?: any) {
    super(
      'Redis server is out of memory',
      'REDIS_OUT_OF_MEMORY',
      node,
      undefined,
      details
    );
    this.name = 'RedisOutOfMemoryError';
  }
}

// Redis认证错误
export class RedisAuthenticationError extends RedisError {
  constructor(node?: string, details?: any) {
    super(
      'Redis authentication failed',
      'REDIS_AUTHENTICATION_ERROR',
      node,
      undefined,
      details
    );
    this.name = 'RedisAuthenticationError';
  }
}

// Redis权限错误
export class RedisPermissionError extends RedisError {
  constructor(command: string, node?: string, details?: any) {
    super(
      `Permission denied for Redis command '${command}'`,
      'REDIS_PERMISSION_ERROR',
      node,
      command,
      details
    );
    this.name = 'RedisPermissionError';
  }
}

// Redis超时错误
export class RedisTimeoutError extends RedisError {
  constructor(operation: string, timeout: number, node?: string) {
    super(
      `Redis operation '${operation}' timed out after ${timeout}ms`,
      'REDIS_TIMEOUT_ERROR',
      node,
      operation,
      { timeout }
    );
    this.name = 'RedisTimeoutError';
  }
}

// Redis数据类型错误
export class RedisDataTypeError extends RedisError {
  constructor(key: string, expectedType: string, actualType: string, node?: string) {
    super(
      `Redis key '${key}' expected type '${expectedType}' but got '${actualType}'`,
      'REDIS_DATA_TYPE_ERROR',
      node,
      undefined,
      { key, expectedType, actualType }
    );
    this.name = 'RedisDataTypeError';
  }
}

// Redis键不存在错误
export class RedisKeyNotFoundError extends RedisError {
  constructor(key: string, node?: string) {
    super(
      `Redis key '${key}' not found`,
      'REDIS_KEY_NOT_FOUND',
      node,
      undefined,
      { key }
    );
    this.name = 'RedisKeyNotFoundError';
  }
}

// Redis脚本错误
export class RedisScriptError extends RedisError {
  constructor(script: string, error: string, node?: string) {
    super(
      `Redis script execution failed: ${error}`,
      'REDIS_SCRIPT_ERROR',
      node,
      'EVAL',
      { script, error }
    );
    this.name = 'RedisScriptError';
  }
}

// Redis事务错误
export class RedisTransactionError extends RedisError {
  constructor(message: string, node?: string, details?: any) {
    super(message, 'REDIS_TRANSACTION_ERROR', node, 'MULTI', details);
    this.name = 'RedisTransactionError';
  }
}

// Redis管道错误
export class RedisPipelineError extends RedisError {
  constructor(message: string, node?: string, details?: any) {
    super(message, 'REDIS_PIPELINE_ERROR', node, 'PIPELINE', details);
    this.name = 'RedisPipelineError';
  }
}

// Redis配置错误
export class RedisConfigurationError extends RedisError {
  constructor(message: string, details?: any) {
    super(message, 'REDIS_CONFIGURATION_ERROR', undefined, undefined, details);
    this.name = 'RedisConfigurationError';
  }
}

// Redis版本不兼容错误
export class RedisVersionError extends RedisError {
  constructor(requiredVersion: string, actualVersion: string, node?: string) {
    super(
      `Redis version '${actualVersion}' is not compatible. Required: '${requiredVersion}'`,
      'REDIS_VERSION_ERROR',
      node,
      undefined,
      { requiredVersion, actualVersion }
    );
    this.name = 'RedisVersionError';
  }
}

// Redis错误工厂函数
export const createRedisError = {
  connection: (message: string, node?: string, details?: any) => 
    new RedisConnectionError(message, node, details),
  command: (message: string, command: string, node?: string, details?: any) => 
    new RedisCommandError(message, command, node, details),
  cluster: (message: string, details?: any) => 
    new RedisClusterError(message, details),
  nodeUnavailable: (node: string, details?: any) => 
    new RedisNodeUnavailableError(node, details),
  outOfMemory: (node?: string, details?: any) => 
    new RedisOutOfMemoryError(node, details),
  authentication: (node?: string, details?: any) => 
    new RedisAuthenticationError(node, details),
  permission: (command: string, node?: string, details?: any) => 
    new RedisPermissionError(command, node, details),
  timeout: (operation: string, timeout: number, node?: string) => 
    new RedisTimeoutError(operation, timeout, node),
  dataType: (key: string, expectedType: string, actualType: string, node?: string) => 
    new RedisDataTypeError(key, expectedType, actualType, node),
  keyNotFound: (key: string, node?: string) => 
    new RedisKeyNotFoundError(key, node),
  script: (script: string, error: string, node?: string) => 
    new RedisScriptError(script, error, node),
  transaction: (message: string, node?: string, details?: any) => 
    new RedisTransactionError(message, node, details),
  pipeline: (message: string, node?: string, details?: any) => 
    new RedisPipelineError(message, node, details),
  configuration: (message: string, details?: any) => 
    new RedisConfigurationError(message, details),
  version: (requiredVersion: string, actualVersion: string, node?: string) => 
    new RedisVersionError(requiredVersion, actualVersion, node)
};

// 错误类型检查函数
export const isRedisError = (error: any): error is RedisError => {
  return error instanceof RedisError;
};

export const isRedisConnectionError = (error: any): error is RedisConnectionError => {
  return error instanceof RedisConnectionError;
};

export const isRedisCommandError = (error: any): error is RedisCommandError => {
  return error instanceof RedisCommandError;
};

export const isRedisClusterError = (error: any): error is RedisClusterError => {
  return error instanceof RedisClusterError;
};
