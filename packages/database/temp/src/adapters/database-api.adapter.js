// @stratix/database 数据库 API 适配器
// 提供统一的数据库访问接口，支持事务管理和错误处理
import { DatabaseErrorHandler } from '../utils/error-handler.js';
/**
 * 数据库管理器适配器实现
 * 注册名称：database.manager
 */
class ApiAdapter {
    constructor(container) {
        console.log(container.registrations);
        this.databaseManager = container.resolve('databaseManager');
    }
    /**
     * 执行单个查询操作
     */
    async executeQuery(operation, context = {}) {
        return await DatabaseErrorHandler.execute(async () => {
            const connectionResult = await this.getConnection(context.connectionName);
            if (!connectionResult.success) {
                throw connectionResult.error;
            }
            const db = connectionResult.data;
            // 设置超时
            if (context.timeout) {
                // 注意：这里简化实现，实际应该设置查询超时
            }
            return await operation(db);
        }, 'database-query-execution');
    }
    /**
     * 执行批量操作
     */
    async executeBatch(operations, context = {}) {
        return await DatabaseErrorHandler.execute(async () => {
            const connectionResult = await this.getConnection(context.connectionName);
            if (!connectionResult.success) {
                throw connectionResult.error;
            }
            const db = connectionResult.data;
            const results = [];
            // 顺序执行批量操作
            for (const operation of operations) {
                const result = await operation(db);
                results.push(result);
            }
            return results;
        }, 'database-batch-execution');
    }
    /**
     * 执行并行操作
     */
    async executeParallel(operations, context = {}) {
        return await DatabaseErrorHandler.execute(async () => {
            const connectionResult = await this.getConnection(context.connectionName);
            if (!connectionResult.success) {
                throw connectionResult.error;
            }
            const db = connectionResult.data;
            // 并行执行操作
            const promises = operations.map((operation) => operation(db));
            return await Promise.all(promises);
        }, 'database-parallel-execution');
    }
    /**
     * 执行事务
     */
    async transaction(operation, context = {}) {
        return await DatabaseErrorHandler.execute(async () => {
            const connectionResult = await this.getConnection();
            if (!connectionResult.success) {
                throw connectionResult.error;
            }
            const db = connectionResult.data;
            return await db.transaction().execute(async (trx) => {
                // 设置隔离级别
                if (context.isolationLevel) {
                    // 注意：这里简化实现，实际应该设置事务隔离级别
                }
                return await operation(trx);
            });
        }, 'database-transaction-execution');
    }
    /**
     * 获取连接（使用 DatabaseManager 预创建的连接）
     */
    async getConnection(connectionName) {
        return await DatabaseErrorHandler.execute(async () => {
            const name = connectionName || 'default';
            // 直接从 DatabaseManager 获取预创建的连接
            const connection = this.databaseManager.getConnection(name);
            return connection;
        }, 'database-connection-retrieval');
    }
    /**
     * 获取读连接（支持读写分离）
     */
    async getReadConnection(connectionName) {
        return await DatabaseErrorHandler.execute(async () => {
            const name = connectionName || 'default';
            // 尝试获取专用的读连接，如果不存在则回退到默认连接
            if (this.databaseManager.hasConnection(`${name}-read`)) {
                return this.databaseManager.getConnection(`${name}-read`);
            }
            // 回退到默认连接
            return this.databaseManager.getConnection(name);
        }, 'database-read-connection-retrieval');
    }
    /**
     * 获取写连接（支持读写分离）
     */
    async getWriteConnection(connectionName) {
        return await DatabaseErrorHandler.execute(async () => {
            const name = connectionName || 'default';
            // 尝试获取专用的写连接，如果不存在则回退到默认连接
            if (this.databaseManager.hasConnection(`${name}-write`)) {
                return this.databaseManager.getConnection(`${name}-write`);
            }
            // 回退到默认连接
            return this.databaseManager.getConnection(name);
        }, 'database-write-connection-retrieval');
    }
    /**
     * 健康检查
     */
    async healthCheck(connectionName) {
        return await DatabaseErrorHandler.execute(async () => {
            const connectionResult = await this.getConnection(connectionName);
            if (!connectionResult.success) {
                return false;
            }
            const db = connectionResult.data;
            // 执行简单的健康检查查询
            await db
                .selectFrom('information_schema.tables')
                .select('table_name')
                .limit(1)
                .execute();
            return true;
        }, 'database-health-check');
    }
}
ApiAdapter.adapterName = 'api';
export default ApiAdapter;
