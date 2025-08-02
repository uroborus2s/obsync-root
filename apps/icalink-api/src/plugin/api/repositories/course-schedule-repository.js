/**
 * 课表数据Repository
 * 专门管理u_jw_kcb_cur表的CRUD操作
 */
import { BaseRepository } from './base-repository.js';
/**
 * 课表数据Repository实现
 */
export class CourseScheduleRepository extends BaseRepository {
    db;
    constructor(databaseProvider, log) {
        super(log);
        this.db = databaseProvider.getDatabase('origin');
    }
    /**
     * 根据学年学期查询课表数据
     */
    async findByXnxq(xnxq) {
        try {
            const results = await this.db
                .selectFrom('u_jw_kcb_cur')
                .selectAll()
                .where('xnxq', '=', xnxq)
                .orderBy('rq', 'asc')
                .orderBy('jc', 'asc')
                .execute();
            this.logOperation('查询课表数据', { xnxq, count: results.length });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('查询课表数据', error, { xnxq });
        }
    }
    /**
     * 根据开课号查询课表数据
     */
    async findByKkh(kkh) {
        try {
            const results = await this.db
                .selectFrom('u_jw_kcb_cur')
                .selectAll()
                .where('kkh', '=', kkh)
                .orderBy('rq', 'asc')
                .orderBy('jc', 'asc')
                .execute();
            this.logOperation('根据开课号查询课表', { kkh, count: results.length });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('根据开课号查询课表', error, { kkh });
        }
    }
    /**
     * 查询未同步的课表数据（gx_zt为null）
     */
    async findUnsyncedData(xnxq) {
        try {
            let query = this.db
                .selectFrom('u_jw_kcb_cur')
                .selectAll()
                .where('gx_zt', 'is', null);
            if (xnxq) {
                query = query.where('xnxq', '=', xnxq);
            }
            const results = await query
                .orderBy('rq', 'asc')
                .orderBy('jc', 'asc')
                .execute();
            this.logOperation('查询未同步数据', { xnxq, count: results.length });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('查询未同步数据', error, { xnxq });
        }
    }
    /**
     * 查询变化的数据（用于增量同步）
     */
    async findChangedData(xnxq) {
        try {
            const results = await this.db
                .selectFrom('u_jw_kcb_cur')
                .selectAll()
                .where('xnxq', '=', xnxq)
                .where('gx_zt', 'is', null)
                .where('zt', '!=', 'delete')
                .orderBy('rq', 'asc')
                .orderBy('jc', 'asc')
                .execute();
            this.logOperation('查询变化数据', { xnxq, count: results.length });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('查询变化数据', error, { xnxq });
        }
    }
    /**
     * 获取变化数据的开课号和日期
     */
    async getChangedKkhAndRq(xnxq) {
        try {
            const results = await this.db
                .selectFrom('u_jw_kcb_cur')
                .select(['kkh', 'rq'])
                .where('xnxq', '=', xnxq)
                .where('gx_zt', 'is', null)
                .groupBy(['kkh', 'rq'])
                .execute();
            this.logOperation('获取变化的开课号和日期', {
                xnxq,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('获取变化的开课号和日期', error, { xnxq });
        }
    }
    /**
     * 批量更新同步状态
     */
    async batchUpdateSyncStatus(conditions, gxZt) {
        try {
            let updatedCount = 0;
            const now = this.getCurrentTime();
            await this.db.transaction().execute(async (trx) => {
                for (const condition of conditions) {
                    const result = await trx
                        .updateTable('u_jw_kcb_cur')
                        .set({
                        gx_zt: gxZt,
                        gx_sj: now.toISOString()
                    })
                        .where('kkh', '=', condition.kkh)
                        .where('xnxq', '=', condition.xnxq)
                        .where('jxz', '=', condition.jxz)
                        .where('zc', '=', condition.zc)
                        .where('rq', '=', condition.rq)
                        .execute();
                    if (result.length > 0 && result[0].numUpdatedRows > BigInt(0)) {
                        updatedCount++;
                    }
                }
            });
            this.logOperation('批量更新同步状态', {
                count: conditions.length,
                updatedCount,
                gxZt
            });
            return updatedCount;
        }
        catch (error) {
            this.handleDatabaseError('批量更新同步状态', error, {
                count: conditions.length,
                gxZt
            });
        }
    }
    /**
     * 更新单条记录的同步状态
     */
    async updateSyncStatus(kkh, xnxq, jxz, zc, rq, gxZt) {
        try {
            const now = this.getCurrentTime();
            const result = await this.db
                .updateTable('u_jw_kcb_cur')
                .set({
                gx_zt: gxZt,
                gx_sj: now.toISOString()
            })
                .where('kkh', '=', kkh)
                .where('xnxq', '=', xnxq)
                .where('jxz', '=', jxz)
                .where('zc', '=', zc)
                .where('rq', '=', rq)
                .execute();
            const updated = result.length > 0 && result[0].numUpdatedRows > BigInt(0);
            this.logOperation('更新同步状态', {
                kkh,
                xnxq,
                jxz,
                zc,
                rq,
                gxZt,
                updated
            });
            return updated;
        }
        catch (error) {
            this.handleDatabaseError('更新同步状态', error, {
                kkh,
                xnxq,
                jxz,
                zc,
                rq,
                gxZt
            });
        }
    }
    /**
     * 清空指定学年学期的同步状态
     */
    async resetSyncStatus(xnxq) {
        try {
            const result = await this.db
                .updateTable('u_jw_kcb_cur')
                .set({
                gx_zt: null,
                gx_sj: null
            })
                .where('xnxq', '=', xnxq)
                .execute();
            const updatedCount = result.length > 0 ? Number(result[0].numUpdatedRows) : 0;
            this.logOperation('重置同步状态', { xnxq, updatedCount });
            return updatedCount;
        }
        catch (error) {
            this.handleDatabaseError('重置同步状态', error, { xnxq });
        }
    }
    /**
     * 根据条件查询课表数据
     */
    async findByConditions(conditions) {
        try {
            let query = this.db.selectFrom('u_jw_kcb_cur').selectAll();
            if (conditions.xnxq) {
                query = query.where('xnxq', '=', conditions.xnxq);
            }
            if (conditions.kkh) {
                query = query.where('kkh', '=', conditions.kkh);
            }
            if (conditions.rq) {
                query = query.where('rq', '=', conditions.rq);
            }
            if (conditions.gxZt !== undefined) {
                if (conditions.gxZt === null) {
                    query = query.where('gx_zt', 'is', null);
                }
                else {
                    query = query.where('gx_zt', '=', conditions.gxZt);
                }
            }
            if (conditions.zt) {
                query = query.where('zt', '=', conditions.zt);
            }
            const results = await query
                .orderBy('rq', 'asc')
                .orderBy('jc', 'asc')
                .execute();
            this.logOperation('条件查询课表数据', {
                conditions,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('条件查询课表数据', error, { conditions });
        }
    }
    /**
     * 获取同步状态统计
     */
    async getSyncStats(xnxq) {
        try {
            const results = await this.db
                .selectFrom('u_jw_kcb_cur')
                .select([
                this.db.fn.count('kkh').as('total'),
                this.db.fn
                    .count('kkh')
                    .filterWhere('gx_zt', 'is not', null)
                    .as('synced'),
                this.db.fn
                    .count('kkh')
                    .filterWhere('gx_zt', 'is', null)
                    .as('unsynced'),
                this.db.fn.count('kkh').filterWhere('zt', '=', 'delete').as('deleted')
            ])
                .where('xnxq', '=', xnxq)
                .executeTakeFirst();
            const stats = {
                total: Number(results?.total || 0),
                synced: Number(results?.synced || 0),
                unsynced: Number(results?.unsynced || 0),
                deleted: Number(results?.deleted || 0)
            };
            this.logOperation('获取同步统计', { xnxq, stats });
            return stats;
        }
        catch (error) {
            this.handleDatabaseError('获取同步统计', error, { xnxq });
        }
    }
    /**
     * 根据日期范围查询课表数据
     */
    async findByDateRange(xnxq, startDate, endDate) {
        try {
            const results = await this.db
                .selectFrom('u_jw_kcb_cur')
                .selectAll()
                .where('xnxq', '=', xnxq)
                .where('rq', '>=', startDate)
                .where('rq', '<=', endDate)
                .orderBy('rq', 'asc')
                .orderBy('jc', 'asc')
                .execute();
            this.logOperation('按日期范围查询课表', {
                xnxq,
                startDate,
                endDate,
                count: results.length
            });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('按日期范围查询课表', error, {
                xnxq,
                startDate,
                endDate
            });
        }
    }
    /**
     * 获取教师课表数据
     */
    async findTeacherSchedule(xnxq, ghs) {
        try {
            let query = this.db
                .selectFrom('u_jw_kcb_cur')
                .selectAll()
                .where('xnxq', '=', xnxq);
            if (ghs) {
                query = query.where('ghs', '=', ghs);
            }
            const results = await query
                .orderBy('rq', 'asc')
                .orderBy('jc', 'asc')
                .execute();
            this.logOperation('查询教师课表', { xnxq, ghs, count: results.length });
            return results;
        }
        catch (error) {
            this.handleDatabaseError('查询教师课表', error, { xnxq, ghs });
        }
    }
}
//# sourceMappingURL=course-schedule-repository.js.map