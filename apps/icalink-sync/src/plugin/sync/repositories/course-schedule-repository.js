/**
 * 课表数据Repository
 * 专门管理u_jw_kcb_cur表的CRUD操作
 */
import { sql } from '@stratix/database';
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
                        .where('st', '=', condition.st)
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
                .where('zt', '=', 'delete')
                .where('gx_zt', 'is', null)
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
                query = query.where(sql `DATE(rq)`, '=', conditions.rq);
            }
            if (conditions.beginDate) {
                query = query.where(sql `DATE(rq)`, '>=', conditions.beginDate);
            }
            // 如果endDate和beginDate都存在，则查询这两个日期之间的数据
            if (conditions.beginDate && conditions.endDate) {
                query = query
                    .where(sql `DATE(rq)`, '>=', conditions.beginDate)
                    .where(sql `DATE(rq)`, '<=', conditions.endDate);
            }
            // 如果endDate存在，则查询endDate之前的所有数据
            if (conditions.endDate) {
                query = query.where(sql `DATE(rq)`, '<=', conditions.endDate);
            }
            if (conditions.kcmc) {
                query = query.where('kcmc', '!=', conditions.kcmc);
            }
            if (conditions.gxZt !== undefined) {
                if (conditions.gxZt === null) {
                    query = query.where((eb) => eb.or([eb('gx_zt', 'is', null), eb('gx_zt', '=', '')]));
                }
                else {
                    query = query.where('gx_zt', '=', conditions.gxZt);
                }
            }
            if (conditions.zt) {
                query = query.where('zt', '=', conditions.zt);
            }
            if (conditions.sjf || conditions.sjt) {
                query = query.where((eb) => {
                    const expressions = [];
                    if (conditions.sjf) {
                        expressions.push(eb('st', '=', conditions.sjf));
                    }
                    if (conditions.sjt) {
                        // 注意这里的列名是 st
                        expressions.push(eb('ed', '=', conditions.sjt));
                    }
                    return eb.or(expressions);
                });
            }
            // 根据时间段(sjd)过滤节次
            if (conditions.sjd) {
                if (conditions.sjd === 'am') {
                    // 上午时段：节次1-4
                    query = query.where('jc', '>=', 1).where('jc', '<=', 4);
                }
                else if (conditions.sjd === 'pm') {
                    // 下午时段：节次5-10
                    query = query.where('jc', '>=', 5).where('jc', '<=', 10);
                }
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
    /**
     * 生成聚合数据到juhe_renwu表
     * 通过对kkh，日期，上下午的聚合和union，生成日历的任务清单
     *
     * @param xnxq 学年学期
     * @param conditions 过滤条件
     * @param conditions.gxZtFilter 更新状态过滤器
     *   - 'null': 只处理gx_zt为null的数据（未处理）
     *   - '4': 只处理gx_zt为4的数据（软删除处理完毕）
     *   - 'both': 处理gx_zt为null或4的数据（所有待处理）
     * @param conditions.dateRange 日期范围过滤
     * @param conditions.zt 是否过滤删除状态
     *
     * @example
     * // 处理未同步数据
     * await repo.generateAggregateData('2024-2025-2', { gxZtFilter: 'null' });
     *
     * // 处理软删除数据
     * await repo.generateAggregateData('2024-2025-2', { gxZtFilter: '4' });
     *
     * // 处理所有待处理数据
     * await repo.generateAggregateData('2024-2025-2', { gxZtFilter: 'both' });
     */
    async generateAggregateData(xnxq, conditions) {
        try {
            this.log.info({ xnxq, conditions }, '开始生成聚合数据');
            // 使用 sql 模板字面量构建参数化查询
            // 构建WHERE条件的sql片段
            let whereConditions = sql `1 = 1`;
            if (xnxq) {
                whereConditions = sql `${whereConditions} AND xnxq = ${xnxq}`;
            }
            // 处理gx_zt状态过滤
            if (conditions?.gxZtFilter) {
                switch (conditions.gxZtFilter) {
                    case 'null':
                        whereConditions = sql `${whereConditions} AND (gx_zt IS NULL OR gx_zt = '')`;
                        break;
                    case '4':
                        whereConditions = sql `${whereConditions} AND gx_zt = 4`;
                        break;
                    case 'both':
                        whereConditions = sql `${whereConditions} AND (gx_zt IS NULL OR gx_zt = 4)`;
                        break;
                }
            }
            else {
                // 保持向后兼容性
                if (conditions?.gxZtIsNull) {
                    whereConditions = sql `${whereConditions} AND gx_zt IS NULL`;
                }
                if (conditions?.gxZtEquals4) {
                    whereConditions = sql `${whereConditions} AND gx_zt = 4`;
                }
            }
            if (conditions?.dateRange) {
                whereConditions = sql `${whereConditions} AND Date(rq) >= ${conditions.dateRange.startDate} AND Date(rq) <= ${conditions.dateRange.endDate}`;
            }
            // 增加删除聚合和未删除聚合
            if (conditions?.zt) {
                whereConditions = sql `${whereConditions} AND zt != 'delete'`;
            }
            // 执行聚合SQL - 使用UNION合并上午和下午的数据
            const result = await sql `
        INSERT INTO juhe_renwu (
          kkh, xnxq, jxz, zc, rq, kcmc, sfdk,
          jc_s, room_s, gh_s, xm_s, lq, sj_f, sj_t, sjd
        )
        SELECT
          kkh,
          xnxq,
          jxz,
          zc,
          LEFT(rq, 10) rq,
          kcmc,
          sfdk,
          GROUP_CONCAT(jc ORDER BY jc SEPARATOR '/') jc_s,
          GROUP_CONCAT(IFNULL(room, '无') ORDER BY jc SEPARATOR '/') room_s,
          GROUP_CONCAT(DISTINCT ghs) gh_s,
          GROUP_CONCAT(DISTINCT xms) xm_s,
          SUBSTRING_INDEX(GROUP_CONCAT(lq ORDER BY st), ',', 1) lq,
          SUBSTRING_INDEX(GROUP_CONCAT(st ORDER BY st), ',', 1) sj_f,
          SUBSTRING_INDEX(GROUP_CONCAT(ed ORDER BY ed DESC), ',', 1) sj_t,
          'am' sjd
        FROM u_jw_kcb_cur
        WHERE ${whereConditions} AND jc < 5
        GROUP BY kkh, xnxq, jxz, zc, rq, kcmc, sfdk
        UNION
        SELECT
          kkh,
          xnxq,
          jxz,
          zc,
          LEFT(rq, 10) rq,
          kcmc,
          sfdk,
          GROUP_CONCAT(jc ORDER BY jc SEPARATOR '/') jc_s,
          GROUP_CONCAT(IFNULL(room, '无') ORDER BY jc SEPARATOR '/') room_s,
          GROUP_CONCAT(DISTINCT ghs) gh_s,
          GROUP_CONCAT(DISTINCT xms) xm_s,
          SUBSTRING_INDEX(GROUP_CONCAT(lq ORDER BY st), ',', 1) lq,
          SUBSTRING_INDEX(GROUP_CONCAT(st ORDER BY st), ',', 1) sj_f,
          SUBSTRING_INDEX(GROUP_CONCAT(ed ORDER BY ed DESC), ',', 1) sj_t,
          'pm' sjd
        FROM u_jw_kcb_cur
        WHERE ${whereConditions} AND jc > 4
        GROUP BY kkh, xnxq, jxz, zc, rq, kcmc, sfdk
      `.execute(this.db);
            const totalInserted = Number(result.numAffectedRows || 0);
            // 查询生成的上午和下午记录数量（用于统计）
            const amCountResult = await this.db
                .selectFrom('juhe_renwu')
                .select(this.db.fn.count('id').as('count'))
                .where('sjd', '=', 'am')
                .where('xnxq', '=', xnxq || '')
                .executeTakeFirst();
            const pmCountResult = await this.db
                .selectFrom('juhe_renwu')
                .select(this.db.fn.count('id').as('count'))
                .where('sjd', '=', 'pm')
                .where('xnxq', '=', xnxq || '')
                .executeTakeFirst();
            const stats = {
                amRecords: Number(amCountResult?.count || 0),
                pmRecords: Number(pmCountResult?.count || 0),
                totalRecords: totalInserted
            };
            this.logOperation('生成聚合数据完成', {
                xnxq,
                conditions,
                stats
            });
            return stats;
        }
        catch (error) {
            this.handleDatabaseError('生成聚合数据', error, { xnxq, conditions });
        }
    }
    /**
     * 生成增量聚合数据（只处理gx_zt为null的数据）
     * 用于增量同步场景
     */
    async generateIncrementalAggregateData(xnxq) {
        try {
            this.log.info({ xnxq }, '开始生成增量聚合数据');
            return await this.generateAggregateData(xnxq, {
                gxZtFilter: 'null',
                dateRange: {
                    startDate: '2025-06-24',
                    endDate: '2025-07-16'
                }
            });
        }
        catch (error) {
            this.handleDatabaseError('生成增量聚合数据', error, { xnxq });
        }
    }
    /**
     * 生成软删除聚合数据（只处理gx_zt为4的数据）
     * 用于处理软删除的课程数据
     */
    async generateSoftDeletedAggregateData(xnxq) {
        try {
            this.log.info({ xnxq }, '开始生成软删除聚合数据');
            return await this.generateAggregateData(xnxq, {
                gxZtFilter: '4',
                dateRange: {
                    startDate: '2025-06-24',
                    endDate: '2025-07-16'
                }
            });
        }
        catch (error) {
            this.handleDatabaseError('生成软删除聚合数据', error, { xnxq });
        }
    }
    /**
     * 生成全量待处理聚合数据（处理gx_zt为null或4的数据）
     * 用于处理所有待处理的课程数据
     */
    async generatePendingAggregateData(xnxq) {
        try {
            this.log.info({ xnxq }, '开始生成全量待处理聚合数据');
            return await this.generateAggregateData(xnxq, {
                gxZtFilter: 'both',
                dateRange: {
                    startDate: '2025-06-24',
                    endDate: '2025-07-16'
                }
            });
        }
        catch (error) {
            this.handleDatabaseError('生成全量待处理聚合数据', error, { xnxq });
        }
    }
    /**
     * 为指定日期范围生成聚合数据
     */
    async generateAggregateDataForDateRange(xnxq, startDate, endDate, gxZtFilter = 'all') {
        try {
            this.log.info({ xnxq, startDate, endDate, gxZtFilter }, '开始为日期范围生成聚合数据');
            const conditions = {
                dateRange: {
                    startDate,
                    endDate
                }
            };
            if (gxZtFilter !== 'all') {
                conditions.gxZtFilter = gxZtFilter;
            }
            return await this.generateAggregateData(xnxq, conditions);
        }
        catch (error) {
            this.handleDatabaseError('为日期范围生成聚合数据', error, {
                xnxq,
                startDate,
                endDate,
                gxZtFilter
            });
        }
    }
}
//# sourceMappingURL=course-schedule-repository.js.map