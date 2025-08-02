/**
 * 聚合任务Repository
 * 专门管理juhe_renwu表的CRUD操作
 */
import { BaseRepository } from './base-repository.js';
/**
 * 聚合任务Repository实现
 */
export class CourseAggregateRepository extends BaseRepository {
    db;
    constructor(databaseProvider, log) {
        super(log);
        this.db = databaseProvider.getDatabase('origin');
    }
    /**
     * 创建聚合任务
     */
    async create(taskData) {
        try {
            const now = this.getCurrentTime();
            const entity = {
                ...taskData,
                created_at: now,
                updated_at: now
            };
            const result = await this.db
                .insertInto('juhe_renwu')
                .values(entity)
                .execute();
            const insertId = Number(result[0].insertId);
            this.logOperation('创建聚合任务', {
                insertId,
                kkh: taskData.kkh,
                xnxq: taskData.xnxq,
                rq: taskData.rq
            });
            return insertId;
        }
        catch (error) {
            this.handleDatabaseError('创建聚合任务', error, {
                kkh: taskData.kkh,
                xnxq: taskData.xnxq
            });
        }
    }
    /**
     * 批量创建聚合任务
     */
    async batchCreate(tasks) {
        try {
            const now = this.getCurrentTime();
            const entities = tasks.map((task) => ({
                ...task,
                created_at: now,
                updated_at: now
            }));
            const result = await this.db
                .insertInto('juhe_renwu')
                .values(entities)
                .execute();
            const insertedCount = result.length;
            this.logOperation('批量创建聚合任务', {
                count: tasks.length,
                insertedCount
            });
            return insertedCount;
        }
        catch (error) {
            this.handleDatabaseError('批量创建聚合任务', error, {
                count: tasks.length
            });
        }
    }
    /**
     * 根据ID查询聚合任务
     */
    async findById(id) {
        try {
            const result = await this.db
                .selectFrom('juhe_renwu')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirst();
            this.logOperation('根据ID查询聚合任务', { id, found: !!result });
            return result || null;
        }
        catch (error) {
            this.handleDatabaseError('根据ID查询聚合任务', error, { id });
        }
    }
    /**
     * 根据学年学期查询聚合任务
     */
    async findByXnxq(xnxq) {
        try {
            // 获取当前日期作为同步基准
            const cutoffDate = '2025/06/18'; // 或者使用动态日期
            const results = await this.db
                .selectFrom('juhe_renwu')
                .selectAll()
                .where('xnxq', '=', xnxq)
                .where('rq', '>', '2025/06/22')
                .where('rq', '<', '2025/07/26')
                .where('gx_zt', 'is', null)
                // .where('kkh', 'in', ['20242025sunyongrui'])
                .where('kcmc', '!=', '习近平新时代中国特色社会主义思想概论')
                .orderBy('rq', 'asc')
                .orderBy('sj_f', 'asc')
                .execute();
            this.logOperation('根据学年学期查询聚合任务', {
                xnxq,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据学年学期查询聚合任务', error, { xnxq });
        }
    }
    /**
     * 根据同步状态查询聚合任务
     */
    async findByStatus(xnxq, gxZt) {
        try {
            let query = this.db
                .selectFrom('juhe_renwu')
                .selectAll()
                .where('xnxq', '=', xnxq);
            if (gxZt !== undefined) {
                if (gxZt === null) {
                    query = query.where('gx_zt', 'is', null);
                }
                else {
                    query = query.where('gx_zt', '=', gxZt);
                }
            }
            const results = await query
                .orderBy('rq', 'asc')
                .orderBy('sj_f', 'asc')
                .execute();
            this.logOperation('根据状态查询聚合任务', {
                xnxq,
                gxZt,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据状态查询聚合任务', error, { xnxq, gxZt });
        }
    }
    /**
     * 根据日期查询聚合任务
     */
    async findByDate(xnxq, rq) {
        try {
            const results = await this.db
                .selectFrom('juhe_renwu')
                .selectAll()
                .where('xnxq', '=', xnxq)
                .where('rq', '=', rq)
                .orderBy('sj_f', 'asc')
                .execute();
            this.logOperation('根据日期查询聚合任务', {
                xnxq,
                rq,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据日期查询聚合任务', error, { xnxq, rq });
        }
    }
    /**
     * 根据日期范围查询聚合任务
     */
    async findByDateRange(xnxq, startDate, endDate) {
        try {
            const results = await this.db
                .selectFrom('juhe_renwu')
                .selectAll()
                .where('xnxq', '=', xnxq)
                .where('rq', '>=', startDate)
                .where('rq', '<=', endDate)
                .orderBy('rq', 'asc')
                .orderBy('sj_f', 'asc')
                .execute();
            this.logOperation('根据日期范围查询聚合任务', {
                xnxq,
                startDate,
                endDate,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据日期范围查询聚合任务', error, {
                xnxq,
                startDate,
                endDate
            });
        }
    }
    /**
     * 更新聚合任务状态
     */
    async updateStatus(id, gxZt) {
        try {
            const now = this.getCurrentTime();
            const result = await this.db
                .updateTable('juhe_renwu')
                .set({
                gx_zt: gxZt,
                gx_sj: now.toISOString() // 同时更新gx_sj为当前时间
            })
                .where('id', '=', id)
                .execute();
            const updated = result.length > 0 && result[0].numUpdatedRows > BigInt(0);
            this.logOperation('更新聚合任务状态', { id, gxZt, updated });
            return updated;
        }
        catch (error) {
            this.handleDatabaseError('更新聚合任务状态', error, { id, gxZt });
        }
    }
    /**
     * 批量更新聚合任务状态
     */
    async batchUpdateStatus(ids, gxZt) {
        try {
            const now = this.getCurrentTime();
            const result = await this.db
                .updateTable('juhe_renwu')
                .set({
                gx_zt: gxZt,
                gx_sj: now.toISOString(), // 同时更新gx_sj为当前时间
                updated_at: now
            })
                .where('id', 'in', ids)
                .execute();
            const updatedCount = result.length > 0 ? Number(result[0].numUpdatedRows) : 0;
            this.logOperation('批量更新聚合任务状态', {
                ids: ids.length,
                gxZt,
                updatedCount
            });
            return updatedCount;
        }
        catch (error) {
            this.handleDatabaseError('批量更新聚合任务状态', error, {
                ids: ids.length,
                gxZt
            });
        }
    }
    /**
     * 软删除聚合任务（设置状态为3）
     */
    async softDelete(kkh, rq) {
        try {
            const now = this.getCurrentTime();
            const result = await this.db
                .updateTable('juhe_renwu')
                .set({
                gx_zt: 3, // 软删除未处理
                gx_sj: now.toISOString(), // 同时更新gx_sj为当前时间
                updated_at: now
            })
                .where('kkh', '=', kkh)
                .where('rq', '=', rq)
                .execute();
            const updatedCount = result.length > 0 ? Number(result[0].numUpdatedRows) : 0;
            this.logOperation('软删除聚合任务', { kkh, rq, updatedCount });
            return updatedCount;
        }
        catch (error) {
            this.handleDatabaseError('软删除聚合任务', error, { kkh, rq });
        }
    }
    /**
     * 删除聚合任务
     */
    async delete(id) {
        try {
            const result = await this.db
                .deleteFrom('juhe_renwu')
                .where('id', '=', id)
                .execute();
            const deleted = result.length > 0 && result[0].numDeletedRows > BigInt(0);
            this.logOperation('删除聚合任务', { id, deleted });
            return deleted;
        }
        catch (error) {
            this.handleDatabaseError('删除聚合任务', error, { id });
        }
    }
    /**
     * 清空指定学年学期的聚合任务
     */
    async clearByXnxq(xnxq) {
        try {
            const result = await this.db
                .deleteFrom('juhe_renwu')
                .where('xnxq', '=', xnxq)
                .execute();
            const deletedCount = result.length > 0 ? Number(result[0].numDeletedRows) : 0;
            this.logOperation('清空学年学期聚合任务', { xnxq, deletedCount });
            return deletedCount;
        }
        catch (error) {
            this.handleDatabaseError('清空学年学期聚合任务', error, { xnxq });
        }
    }
    /**
     * 获取聚合任务统计
     */
    async getStats(xnxq) {
        try {
            const results = await this.db
                .selectFrom('juhe_renwu')
                .select([
                this.db.fn.count('id').as('total'),
                this.db.fn.count('id').filterWhere('gx_zt', 'is', null).as('pending'),
                this.db.fn
                    .count('id')
                    .filterWhere('gx_zt', '=', 1)
                    .as('teacherSynced'),
                this.db.fn
                    .count('id')
                    .filterWhere('gx_zt', '=', 2)
                    .as('studentSynced'),
                this.db.fn.count('id').filterWhere('gx_zt', '=', 3).as('softDeleted'),
                this.db.fn.count('id').filterWhere('gx_zt', '=', 4).as('processed')
            ])
                .where('xnxq', '=', xnxq)
                .executeTakeFirst();
            const stats = {
                total: Number(results?.total || 0),
                pending: Number(results?.pending || 0),
                teacherSynced: Number(results?.teacherSynced || 0),
                studentSynced: Number(results?.studentSynced || 0),
                softDeleted: Number(results?.softDeleted || 0),
                processed: Number(results?.processed || 0)
            };
            this.logOperation('获取聚合任务统计', { xnxq, stats });
            return stats;
        }
        catch (error) {
            this.handleDatabaseError('获取聚合任务统计', error, { xnxq });
        }
    }
    /**
     * 根据条件查询聚合任务
     */
    async findByConditions(conditions) {
        try {
            let query = this.db.selectFrom('juhe_renwu').selectAll();
            if (conditions.xnxq) {
                query = query.where('xnxq', '=', conditions.xnxq);
            }
            if (conditions.kkh) {
                query = query.where('kkh', '=', conditions.kkh);
            }
            if (conditions.rq) {
                query = query.where('rq', '=', conditions.rq);
            }
            if (conditions.beginDate) {
                query = query.where('rq', '>=', conditions.beginDate);
            }
            if (conditions.kcmc) {
                query = query.where('kcmc', '!=', conditions.kcmc);
            }
            if (conditions.sjd) {
                query = query.where('sjd', '=', conditions.sjd);
            }
            if (conditions.sjf) {
                query = query.where('sj_f', '=', conditions.sjf);
            }
            if (conditions.gxZt !== undefined) {
                if (conditions.gxZt === null) {
                    // 将条件 gx_zt 为 null 的记录，改为 gx_zt 为 '' 或者为 null 的记录
                    query = query.where((eb) => eb.or([eb('gx_zt', 'is', null), eb('gx_zt', '=', '')]));
                }
                else {
                    query = query.where('gx_zt', '=', conditions.gxZt);
                }
            }
            const results = await query
                .orderBy('rq', 'asc')
                .orderBy('sj_f', 'asc')
                .execute();
            this.logOperation('条件查询聚合任务', {
                conditions,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('条件查询聚合任务', error, { conditions });
        }
    }
    /**
     * 获取需要打卡的聚合任务
     */
    async findAttendanceTasks(xnxq) {
        try {
            const results = await this.db
                .selectFrom('juhe_renwu')
                .selectAll()
                .where('xnxq', '=', xnxq)
                .where('sfdk', '=', '1')
                .orderBy('rq', 'asc')
                .orderBy('sj_f', 'asc')
                .execute();
            this.logOperation('查询打卡任务', { xnxq, count: results.length });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('查询打卡任务', error, { xnxq });
        }
    }
}
//# sourceMappingURL=course-aggregate-repository.js.map