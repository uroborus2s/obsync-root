// @stratix/database 函数式仓储基类
// 采用函数式编程模式，支持管道操作和查询组合
import { failure, fromNullable, mapResult, success } from '../utils/helpers.js';
import { DatabaseErrorHandler, ValidationError } from '../utils/error-handler.js';
/**
 * 连接配置解析工具
 */
export class ConnectionConfigResolver {
    /**
     * 解析连接配置选项
     */
    static resolve(options) {
        // 如果没有提供配置，使用默认值
        if (!options) {
            return {
                readConnectionName: 'default',
                writeConnectionName: 'default',
                enableReadWriteSeparation: false
            };
        }
        // 如果是字符串，表示使用同一个连接进行读写
        if (typeof options === 'string') {
            return {
                readConnectionName: options,
                writeConnectionName: options,
                enableReadWriteSeparation: false
            };
        }
        // 如果是配置对象，解析详细配置
        const config = options;
        const defaultConnection = config.defaultConnection || 'default';
        const enableReadWriteSeparation = config.enableReadWriteSeparation || false;
        return {
            readConnectionName: config.readConnection || defaultConnection,
            writeConnectionName: config.writeConnection || defaultConnection,
            enableReadWriteSeparation
        };
    }
    /**
     * 验证连接配置
     */
    static validate(config) {
        return !!(config.readConnectionName && config.writeConnectionName);
    }
}
/**
 * 查询构建器工厂 - 纯函数式查询构建
 */
export class QueryBuilderFactory {
    /**
     * 创建基础查询
     */
    static createBaseQuery(context) {
        return (qb) => qb;
    }
    /**
     * 添加 WHERE 条件
     */
    static addWhere(whereExpr) {
        return (qb) => whereExpr(qb);
    }
    /**
     * 添加排序
     */
    static addOrderBy(orderBy) {
        return (qb) => {
            if (!orderBy)
                return qb;
            const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
            return clauses.reduce((query, clause) => query.orderBy(clause.field, clause.direction), qb);
        };
    }
    /**
     * 添加分页
     */
    static addPagination(limit, offset) {
        return (qb) => {
            let query = qb;
            if (limit !== undefined)
                query = query.limit(limit);
            if (offset !== undefined)
                query = query.offset(offset);
            return query;
        };
    }
    /**
     * 添加字段选择
     */
    static selectFields(selector) {
        return selector;
    }
    /**
     * 组合查询管道
     */
    static composeQuery(...pipes) {
        return (qb) => pipes.reduce((query, pipeFn) => pipeFn(query), qb);
    }
}
/**
 * 验证器工厂
 */
export class ValidatorFactory {
    /**
     * 创建必填字段验证器
     */
    static required(field, value) {
        if (value === null || value === undefined || value === '') {
            return failure(ValidationError.create(`Field '${String(field)}' is required`, String(field), value));
        }
        return success(value);
    }
    /**
     * 创建类型验证器
     */
    static type(field, value, expectedType) {
        if (typeof value !== expectedType) {
            return failure(ValidationError.create(`Field '${String(field)}' must be of type ${expectedType}`, String(field), value));
        }
        return success(value);
    }
    /**
     * 创建长度验证器
     */
    static validateLength(field, value, min, max) {
        if (min !== undefined && value.length < min) {
            return failure(ValidationError.create(`Field '${String(field)}' must be at least ${min} characters`, String(field), value));
        }
        if (max !== undefined && value.length > max) {
            return failure(ValidationError.create(`Field '${String(field)}' must be at most ${max} characters`, String(field), value));
        }
        return success(value);
    }
    /**
     * 组合验证器
     */
    static compose(...validators) {
        return (value) => {
            for (const validator of validators) {
                const result = validator(value);
                if (!result.success) {
                    return result;
                }
            }
            return success(value);
        };
    }
}
/**
 * 函数式基础仓储实现
 */
export class BaseRepository {
    /**
     * 构造函数 - 根据连接配置自动获取数据库连接
     * @param databaseAPI - 数据库API适配器，用于获取连接和事务操作
     * @param connectionOptions - 连接配置选项
     */
    constructor(databaseManger, connectionOptions) {
        this.databaseManger = databaseManger;
        this.primaryKey = 'id';
        this.readConnection = null;
        this.writeConnection = null;
        // 解析连接配置
        this.connectionConfig = ConnectionConfigResolver.resolve(connectionOptions);
    }
    async onReady() {
        // 验证连接配置
        if (!ConnectionConfigResolver.validate(this.connectionConfig)) {
            throw new Error('Invalid connection configuration');
        }
        // 同步获取连接（因为DatabaseManager已经预创建了连接）
        try {
            this.readConnection = await this.databaseManger.getConnection(this.connectionConfig.readConnectionName);
            this.writeConnection = this.getWriteConnectionSync();
        }
        catch (error) {
            throw new Error(`Failed to initialize repository connections: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 同步获取写连接
     */
    getWriteConnectionSync() {
        try {
            // 通过DatabaseAPI的标准接口获取连接
            return this.databaseManger.getWriteConnectionSync(this.connectionConfig.writeConnectionName);
        }
        catch (error) {
            throw new Error(`Failed to get write connection '${this.connectionConfig.writeConnectionName}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 获取查询构建器上下文
     */
    getContext() {
        return {
            db: this.readConnection,
            tableName: this.tableName,
            primaryKey: this.primaryKey
        };
    }
    /**
     * 验证创建数据
     */
    validateCreateData(data) {
        // 默认实现：直接返回成功
        // 子类可以重写此方法添加具体验证逻辑
        return success(data);
    }
    /**
     * 验证更新数据
     */
    validateUpdateData(data) {
        // 默认实现：直接返回成功
        // 子类可以重写此方法添加具体验证逻辑
        return success(data);
    }
    /**
     * 根据 ID 查找单条记录
     */
    async findById(id) {
        return await DatabaseErrorHandler.execute(async () => {
            const result = await this.readConnection
                .selectFrom(this.tableName)
                .selectAll()
                .where(this.primaryKey, '=', id)
                .executeTakeFirst();
            return fromNullable(result);
        }, 'repository-find-by-id');
    }
    /**
     * 根据条件查找单条记录
     */
    async findOne(criteria) {
        return await DatabaseErrorHandler.execute(async () => {
            const baseQuery = this.readConnection
                .selectFrom(this.tableName)
                .selectAll();
            const query = criteria(baseQuery);
            const result = await query.executeTakeFirst();
            return fromNullable(result);
        }, 'repository-find-one');
    }
    /**
     * 根据条件查找多条记录
     */
    async findMany(criteria, options) {
        return await DatabaseErrorHandler.execute(async () => {
            let query = this.readConnection
                .selectFrom(this.tableName)
                .selectAll();
            // 应用条件
            if (criteria) {
                query = criteria(query);
            }
            // 应用排序
            if (options?.orderBy) {
                const orderClauses = Array.isArray(options.orderBy)
                    ? options.orderBy
                    : [options.orderBy];
                for (const clause of orderClauses) {
                    query = query.orderBy(clause.field, clause.direction);
                }
            }
            // 应用分页
            if (options?.limit !== undefined) {
                query = query.limit(options.limit);
            }
            if (options?.offset !== undefined) {
                query = query.offset(options.offset);
            }
            const results = await query.execute();
            return results;
        }, 'repository-find-many');
    }
    /**
     * 查找所有记录
     */
    async findAll(options) {
        return await this.findMany(undefined, options);
    }
    /**
     * 创建单条记录
     */
    async create(data) {
        // 验证数据
        const validationResult = this.validateCreateData(data);
        if (!validationResult.success) {
            return failure(validationResult.error);
        }
        return await DatabaseErrorHandler.execute(async () => {
            const result = await this.writeConnection
                .insertInto(this.tableName)
                .values(data)
                .returningAll()
                .executeTakeFirstOrThrow();
            return result;
        }, 'repository-create');
    }
    /**
     * 批量创建记录
     */
    async createMany(data) {
        // 验证所有数据
        for (const item of data) {
            const validationResult = this.validateCreateData(item);
            if (!validationResult.success) {
                return failure(validationResult.error);
            }
        }
        const operation = (db) => db
            .insertInto(this.tableName)
            .values(data)
            .returningAll()
            .execute()
            .then((results) => results);
        return await this.databaseManger.executeQuery(operation, {
            readonly: false
        });
    }
    /**
     * 更新记录
     */
    async update(id, data) {
        // 验证数据
        const validationResult = this.validateUpdateData(data);
        if (!validationResult.success) {
            return failure(validationResult.error);
        }
        return await DatabaseErrorHandler.execute(async () => {
            const result = await this.writeConnection
                .updateTable(this.tableName)
                .set(data)
                .where(this.primaryKey, '=', id)
                .returningAll()
                .executeTakeFirst();
            return fromNullable(result);
        }, 'repository-update');
    }
    /**
     * 批量更新记录
     */
    async updateMany(criteria, data) {
        // 验证数据
        const validationResult = this.validateUpdateData(data);
        if (!validationResult.success) {
            return failure(validationResult.error);
        }
        const operation = async (db) => {
            const updateQuery = db.updateTable(this.tableName).set(data);
            const finalQuery = criteria(updateQuery);
            const result = await finalQuery.execute();
            return Number(result.numUpdatedRows || 0);
        };
        return await this.databaseManger.executeQuery(operation, {
            readonly: false
        });
    }
    /**
     * 删除记录
     */
    async delete(id) {
        return await DatabaseErrorHandler.execute(async () => {
            const result = await this.writeConnection
                .deleteFrom(this.tableName)
                .where(this.primaryKey, '=', id)
                .execute();
            return Number(result.numDeletedRows || 0) > 0;
        }, 'repository-delete');
    }
    /**
     * 批量删除记录
     */
    async deleteMany(criteria) {
        const operation = (db) => {
            const deleteQuery = db.deleteFrom(this.tableName);
            const finalQuery = criteria(deleteQuery);
            return finalQuery
                .execute()
                .then((result) => Number(result.numDeletedRows || 0));
        };
        return await this.databaseManger.executeQuery(operation, {
            readonly: false
        });
    }
    /**
     * 统计记录数量
     */
    async count(criteria) {
        const operation = async (db) => {
            const baseQuery = db
                .selectFrom(this.tableName)
                .select((eb) => eb.fn.count('*').as('count'));
            const finalQuery = criteria ? criteria(baseQuery) : baseQuery;
            const result = await finalQuery.executeTakeFirstOrThrow();
            return Number(result.count);
        };
        return await this.databaseManger.executeQuery(operation, {
            readonly: true
        });
    }
    /**
     * 检查记录是否存在
     */
    async exists(criteria) {
        const countResult = await this.count(criteria);
        return mapResult(countResult, (count) => count > 0);
    }
    /**
     * 分页查询记录
     */
    async paginate(criteria, pagination) {
        const page = pagination?.page || 1;
        const pageSize = Math.min(pagination?.pageSize || 10, pagination?.maxPageSize || 100);
        const offset = (page - 1) * pageSize;
        // 获取总数和数据
        const [totalResult, dataResult] = await Promise.all([
            this.count(criteria),
            this.findMany(criteria, {
                limit: pageSize,
                offset,
                readonly: true
            })
        ]);
        if (!totalResult.success) {
            return failure(totalResult.error);
        }
        if (!dataResult.success) {
            return failure(dataResult.error);
        }
        const total = totalResult.data;
        const data = dataResult.data;
        const totalPages = Math.ceil(total / pageSize);
        const result = {
            data,
            total,
            page,
            pageSize,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            metadata: {
                offset,
                limit: pageSize
            }
        };
        return success(result);
    }
    /**
     * 在事务中执行操作
     */
    async withTransaction(fn) {
        return await this.databaseManger.transaction(async (_trx) => {
            // 创建事务版本的仓储
            // 注意：这里简化实现，实际应该创建带事务的API实例
            return await fn(this);
        });
    }
    /**
     * 高级查询 - 使用管道模式
     */
    async advancedQuery(queryBuilder, options) {
        return await this.databaseManger.executeQuery(queryBuilder, options);
    }
    /**
     * 批量操作
     */
    async batchOperations(operations, options) {
        return await this.databaseManger.executeBatch(operations, options);
    }
    /**
     * 并行操作
     */
    async parallelOperations(operations, options) {
        return await this.databaseManger.executeParallel(operations, options);
    }
}
/**
 * 查询助手 - 常用查询模式
 */
export class QueryHelpers {
    /**
     * 创建 IN 查询
     */
    static whereIn(field, values) {
        return (qb) => qb.where(field, 'in', values);
    }
    /**
     * 创建范围查询
     */
    static whereBetween(field, min, max) {
        return (qb) => qb.where(field, '>=', min).where(field, '<=', max);
    }
    /**
     * 创建模糊查询
     */
    static whereLike(field, pattern) {
        return (qb) => qb.where(field, 'like', `%${pattern}%`);
    }
    /**
     * 创建日期范围查询
     */
    static whereDateRange(field, startDate, endDate) {
        return (qb) => qb
            .where(field, '>=', startDate)
            .where(field, '<=', endDate);
    }
    /**
     * 组合多个条件（AND）
     */
    static and(...conditions) {
        return (qb) => conditions.reduce((query, condition) => condition(query), qb);
    }
    /**
     * 组合多个条件（OR）
     */
    static or(...conditions) {
        return (qb) => {
            if (conditions.length === 0)
                return qb;
            return qb.where((eb) => {
                const orConditions = conditions.map((condition) => (subEb) => condition(subEb));
                return eb.or(orConditions);
            });
        };
    }
}
