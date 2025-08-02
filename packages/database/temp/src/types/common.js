// @stratix/database 通用类型定义
// 定义插件中使用的通用类型和接口
/**
 * 数据库错误类型
 */
export class DatabaseError extends Error {
    constructor(message, code, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'DatabaseError';
    }
}
/**
 * 连接错误
 */
export class ConnectionError extends DatabaseError {
    constructor(message, connectionName, cause) {
        super(message, 'CONNECTION_ERROR', cause);
        this.connectionName = connectionName;
        this.name = 'ConnectionError';
    }
}
/**
 * 配置错误
 */
export class ConfigurationError extends DatabaseError {
    constructor(message, cause) {
        super(message, 'CONFIGURATION_ERROR', cause);
        this.name = 'ConfigurationError';
    }
}
/**
 * 查询错误
 */
export class QueryError extends DatabaseError {
    constructor(message, query, params, cause) {
        super(message, 'QUERY_ERROR', cause);
        this.query = query;
        this.params = params;
        this.name = 'QueryError';
    }
}
/**
 * 事务错误
 */
export class TransactionError extends DatabaseError {
    constructor(message, cause) {
        super(message, 'TRANSACTION_ERROR', cause);
        this.name = 'TransactionError';
    }
}
