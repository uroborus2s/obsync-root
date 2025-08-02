/**
 * 用户日历仓库
 * 处理user_calendar表的数据操作
 */
/**
 * 用户日历仓库
 */
export class UserCalendarRepository {
    db;
    log;
    constructor(db, log) {
        this.db = db;
        this.log = log;
    }
    /**
     * 根据学号/工号获取用户日历信息
     */
    async findByXgh(xgh) {
        try {
            this.log.debug({ xgh }, '根据学号/工号查询用户日历');
            const result = await this.db
                .selectFrom('user_calendar')
                .selectAll()
                .where('xgh', '=', xgh)
                .where('status', '=', 'normal')
                .executeTakeFirst();
            if (result) {
                this.log.debug({ xgh, calendarId: result.calendar_id }, '找到用户日历信息');
                return result;
            }
            this.log.debug({ xgh }, '未找到用户日历信息');
            return null;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xgh
            }, '查询用户日历失败');
            throw error;
        }
    }
    /**
     * 根据WPS用户ID获取用户日历信息
     */
    async findByWpsId(wpsId) {
        try {
            this.log.debug({ wpsId }, '根据WPS用户ID查询用户日历');
            const result = await this.db
                .selectFrom('user_calendar')
                .selectAll()
                .where('wpsId', '=', wpsId)
                .where('status', '=', 'normal')
                .executeTakeFirst();
            if (result) {
                this.log.debug({ wpsId, calendarId: result.calendar_id }, '找到用户日历信息');
                return result;
            }
            this.log.debug({ wpsId }, '未找到用户日历信息');
            return null;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                wpsId
            }, '查询用户日历失败');
            throw error;
        }
    }
    /**
     * 批量获取用户日历信息
     */
    async findByXghList(xghList) {
        try {
            this.log.debug({ count: xghList.length }, '批量查询用户日历');
            if (xghList.length === 0) {
                return [];
            }
            const results = await this.db
                .selectFrom('user_calendar')
                .selectAll()
                .where('xgh', 'in', xghList)
                .where('status', '=', 'normal')
                .execute();
            this.log.debug({
                requestCount: xghList.length,
                foundCount: results.length
            }, '批量查询用户日历完成');
            return results;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                count: xghList.length
            }, '批量查询用户日历失败');
            throw error;
        }
    }
    /**
     * 创建用户日历记录
     */
    async create(params) {
        try {
            this.log.debug({ xgh: params.xgh, name: params.name }, '创建用户日历记录');
            const result = await this.db
                .insertInto('user_calendar')
                .values({
                wpsId: params.wpsId || null,
                xgh: params.xgh,
                name: params.name,
                calendar_id: params.calendar_id,
                status: params.status || 'normal',
                ctime: new Date(),
                mtime: null
            })
                .executeTakeFirstOrThrow();
            const insertId = Number(result.insertId);
            // 获取刚创建的记录
            const createdRecord = await this.db
                .selectFrom('user_calendar')
                .selectAll()
                .where('id', '=', insertId)
                .executeTakeFirstOrThrow();
            this.log.info({
                id: insertId,
                xgh: params.xgh,
                calendarId: params.calendar_id
            }, '用户日历记录创建成功');
            return createdRecord;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xgh: params.xgh
            }, '创建用户日历记录失败');
            throw error;
        }
    }
    /**
     * 更新用户日历记录
     */
    async updateByXgh(xgh, params) {
        try {
            this.log.debug({ xgh, params }, '更新用户日历记录');
            const result = await this.db
                .updateTable('user_calendar')
                .set({
                ...params,
                mtime: new Date()
            })
                .where('xgh', '=', xgh)
                .executeTakeFirst();
            const updated = Number(result.numUpdatedRows) > 0;
            this.log.info({ xgh, updated, params }, updated ? '用户日历记录更新成功' : '用户日历记录未找到或无需更新');
            return updated;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xgh,
                params
            }, '更新用户日历记录失败');
            throw error;
        }
    }
    /**
     * 删除用户日历记录（软删除，设置状态）
     */
    async deleteByXgh(xgh) {
        try {
            this.log.debug({ xgh }, '删除用户日历记录');
            const result = await this.db
                .updateTable('user_calendar')
                .set({
                status: null,
                mtime: new Date()
            })
                .where('xgh', '=', xgh)
                .executeTakeFirst();
            const deleted = Number(result.numUpdatedRows) > 0;
            this.log.info({ xgh, deleted }, deleted ? '用户日历记录删除成功' : '用户日历记录未找到');
            return deleted;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xgh
            }, '删除用户日历记录失败');
            throw error;
        }
    }
    /**
     * 检查用户是否有有效的日历
     */
    async hasValidCalendar(xgh) {
        try {
            const userCalendar = await this.findByXgh(xgh);
            return userCalendar !== null && !!userCalendar.calendar_id;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xgh
            }, '检查用户日历有效性失败');
            return false;
        }
    }
    /**
     * 获取所有有效的用户日历
     */
    async findAllValid() {
        try {
            this.log.debug('查询所有有效的用户日历');
            const results = await this.db
                .selectFrom('user_calendar')
                .selectAll()
                .where('status', '=', 'normal')
                .where('calendar_id', 'is not', null)
                .execute();
            this.log.debug({ count: results.length }, '查询所有有效用户日历完成');
            return results;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error)
            }, '查询所有有效用户日历失败');
            throw error;
        }
    }
}
//# sourceMappingURL=user-calendar-repository.js.map